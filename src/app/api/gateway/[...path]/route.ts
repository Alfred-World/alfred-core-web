import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getToken, encode } from 'next-auth/jwt';

import { postConnectToken } from '@/generated';

// ── Dev: allow self-signed certs (same as auth.ts) ──────────────────────────
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ── Gateway URL (server-side only) ──────────────────────────────────────────
const GATEWAY_URL = process.env.INTERNAL_GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL!;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// ── Headers to strip from the incoming browser request ──────────────────────
const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'cookie',        // Never leak browser cookies to gateway
  'authorization', // Replaced with JWT from session cookie
]);

// ── Cookie name detection ───────────────────────────────────────────────────
function getSessionCookieName(request: NextRequest): string {
  return request.cookies.has('__Secure-next-auth.session-token')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

// ── Token refresh dedup + result cache ─────────────────────────────────────
// Two timing scenarios cause double-consume of a refresh token:
//
//  1. TRUE CONCURRENT: Requests A and B both get 401 and call doRefreshAccessToken
//     before either has finished. → pendingRefreshes Map dedup handles this.
//
//  2. NEAR-CONCURRENT: Request A gets 401, refreshes, succeeds (refreshPromise=null),
//     then Request B's 401 arrives. B calls doRefreshAccessToken with the now-consumed
//     RT_old → invalid_grant → triggers logout.
//     → refreshResultCache (keyed on old RT, 30s TTL) handles this.

type RefreshResult = { accessToken: string; refreshToken: string; expiresAt: number };

const pendingRefreshes = new Map<string, Promise<RefreshResult | null>>();
const refreshResultCache = new Map<string, RefreshResult>();

async function doRefreshAccessToken(refreshToken: string): Promise<RefreshResult | null> {
  // Case 2: another request already refreshed this exact RT recently — reuse result
  const cached = refreshResultCache.get(refreshToken);

  if (cached) return cached;

  // Case 1: another request is currently refreshing this RT — wait for it
  const existing = pendingRefreshes.get(refreshToken);

  if (existing) return existing;

  const task = (async (): Promise<RefreshResult | null> => {
    try {
      const data = await postConnectToken({
        grant_type: 'refresh_token',
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
        refresh_token: refreshToken,
      });

      if (!data.access_token) {
        console.error('[proxy] doRefreshAccessToken: no access_token in response', data);
        
return null;
      }

      let expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 900);

      try {
        const payload = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64').toString());

        if (payload.exp) expiresAt = payload.exp;
      } catch { /* use calculated expiresAt */ }

      const result: RefreshResult = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
      };

      // Cache under the OLD RT so near-concurrent requests reuse this result
      refreshResultCache.set(refreshToken, result);
      setTimeout(() => refreshResultCache.delete(refreshToken), 30_000);

      return result;
    } catch (err) {
      console.error('[proxy] doRefreshAccessToken: exception during token refresh', err);
      
return null;
    }
  })();

  pendingRefreshes.set(refreshToken, task);
  void task.finally(() => pendingRefreshes.delete(refreshToken));

  return task;
}

// ── Build forwarding headers ────────────────────────────────────────────────
function buildProxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  headers.set('X-Forwarded-For', clientIp);
  headers.set('X-Real-IP', clientIp);
  headers.set('X-Forwarded-Host', request.headers.get('host') || '');
  headers.set('X-Forwarded-Proto', request.headers.get('x-forwarded-proto') || 'https');

  return headers;
}

// ── Strip hop-by-hop response headers ───────────────────────────────────────
function buildResponseHeaders(response: Response): Headers {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (lower !== 'transfer-encoding' && lower !== 'connection') {
      headers.set(key, value);
    }
  });

  return headers;
}

// ── Proxy handler ───────────────────────────────────────────────────────────
async function handler(request: NextRequest) {
  const cookieName = getSessionCookieName(request);
  const token = await getToken({ req: request, cookieName, secret: NEXTAUTH_SECRET });

  const path = request.nextUrl.pathname.replace(/^\/api\/gateway/, '');
  const targetUrl = `${GATEWAY_URL}${path}${request.nextUrl.search}`;

  const headers = buildProxyHeaders(request);

  if (token?.accessToken) {
    headers.set('Authorization', `Bearer ${token.accessToken}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const bodyToSend = body && body.byteLength > 0 ? body : undefined;

  try {
    let response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: bodyToSend,
    });

    // ── 401 + refresh token → server-side token refresh & retry ───────────
    if (response.status === 401 && token?.refreshToken) {
      console.log('[proxy] 401 from gateway, attempting token refresh...');
      const refreshed = await doRefreshAccessToken(token.refreshToken as string);

      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed.accessToken}`);

        response = await fetch(targetUrl, {
          method: request.method,
          headers,
          body: bodyToSend,
        });

        // Update JWT cookie so subsequent requests use the new token
        const updatedToken = {
          ...token,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: refreshed.expiresAt,
          error: undefined,
        };

        const encodedJwt = await encode({ token: updatedToken, secret: NEXTAUTH_SECRET });
        const isSecure = cookieName.startsWith('__Secure-');

        const proxyResponse = new NextResponse(response.body, {
          status: response.status,
          headers: buildResponseHeaders(response),
        });

        proxyResponse.cookies.set(cookieName, encodedJwt, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days — matches session.maxAge in authOptions
        });

        return proxyResponse;
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: buildResponseHeaders(response),
    });
  } catch {
    return NextResponse.json(
      { success: false, errors: [{ message: 'Gateway unreachable', code: 'BAD_GATEWAY' }] },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
