import { NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_GATEWAY_URL, NEXT_PUBLIC_OAUTH_CLIENT_ID } from './env'

/**
 * App base URL - used for post-logout redirect.
 */
export const APP_URL = NEXT_PUBLIC_APP_URL

/**
 * OAuth client ID for this application.
 */
export const OAUTH_CLIENT_ID = NEXT_PUBLIC_OAUTH_CLIENT_ID

/**
 * Gateway base URL for browser redirects.
 */
export const GATEWAY_URL = NEXT_PUBLIC_GATEWAY_URL

/**
 * OIDC logout endpoint URL.
 */
export const getSsoLogoutUrl = (postLogoutRedirectUri: string = `${APP_URL}/login?logout=true`) => {
  return `${GATEWAY_URL}/connect/logout?client_id=${OAUTH_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
}
