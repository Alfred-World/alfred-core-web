/**
 * SSO Configuration - Uses Generated API for Type Safety
 * 
 * For JSON API calls: use generated functions directly
 * For redirect endpoints: use generated QueryKey to extract URL path
 * 
 * This ensures if backend changes URLs, regenerating API will catch issues
 */

import { AXIOS_INSTANCE } from './custom-instance'
import {
  getIdentityAuthValidateToken,
  getGetIdentityAuthCheckSsoQueryKey,
  getGetConnectLogoutQueryKey,
  type GetIdentityAuthValidateTokenParams,
} from '@/generated/identity-api'

/**
 * Gateway base URL - same as generated API client
 */
export const GATEWAY_URL = AXIOS_INSTANCE.defaults.baseURL || 'https://gateway.test'

/**
 * App base URL - used for post-logout redirect
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://core.test'

/**
 * OAuth client ID for this application
 */
export const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'core_web'

/**
 * SSO check endpoint URL - for browser redirect (not axios call)
 * Uses generated QueryKey to ensure URL stays in sync with backend
 * @param returnUrl - URL to redirect back to after SSO check
 */
export const getSsoCheckUrl = (returnUrl: string) => {
  // Get URL path from generated QueryKey
  const [urlPath] = getGetIdentityAuthCheckSsoQueryKey({ returnUrl })

  
return `${GATEWAY_URL}${urlPath}?returnUrl=${encodeURIComponent(returnUrl)}`
}

/**
 * SSO logout endpoint URL - for browser redirect
 * Redirects to login page with logout=true to show success message
 * Note: The login page now handles logout=true param to prevent auto-OAuth
 * @param postLogoutRedirectUri - URL to redirect to after logout (defaults to login?logout=true)
 */
export const getSsoLogoutUrl = (postLogoutRedirectUri: string = `${APP_URL}/login?logout=true`) => {
  return `${GATEWAY_URL}/connect/logout?client_id=${OAUTH_CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
}

/**
 * Validate SSO token using generated API function
 * This is the preferred way - uses generated axios function directly
 * @param token - SSO token to validate
 */
export const validateSsoToken = (token: string) => {
  return getIdentityAuthValidateToken({ token })
}
