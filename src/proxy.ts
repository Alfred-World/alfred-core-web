import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

function isPrivatePath(pathname: string): boolean {
  return (
    pathname.startsWith('/assets') ||
    pathname.startsWith('/brands') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/units') ||
    pathname.startsWith('/commodities') ||
    pathname.startsWith('/ai-chat')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = !!token

  if (isPrivatePath(pathname) && !isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`, request.url)
    )
  }

  if (isPublicPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
