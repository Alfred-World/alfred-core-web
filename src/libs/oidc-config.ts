'use client'

import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts'

// Configuration from environment variables
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://gateway.test:8000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://core.test:7200'
const CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'core_web'

/**
 * OIDC Configuration for Core Web (SPA with PKCE)
 * Using Authorization Code Flow with PKCE for public client
 */
export const oidcConfig = {
  authority: GATEWAY_URL,
  client_id: CLIENT_ID,
  redirect_uri: `${APP_URL}/callback`,
  post_logout_redirect_uri: APP_URL,
  response_type: 'code',
  scope: 'openid profile email offline_access',
  
  // PKCE is enabled by default in oidc-client-ts
  // No client_secret needed for public clients
  
  // Storage for tokens - using localStorage to share across tabs
  // Note: localStorage persists and is shared across all tabs in the same browser
  userStore: typeof window !== 'undefined' 
    ? new WebStorageStateStore({ store: window.localStorage })
    : undefined,
  
  // Manual metadata configuration (since we're not using standard discovery)
  metadata: {
    issuer: GATEWAY_URL,
    authorization_endpoint: `${GATEWAY_URL}/connect/authorize`,
    token_endpoint: `${GATEWAY_URL}/connect/token`,
    userinfo_endpoint: `${GATEWAY_URL}/connect/userinfo`,
    end_session_endpoint: `${GATEWAY_URL}/connect/logout`,
  },
  
  // Automatic token renewal
  automaticSilentRenew: false, // Disable for now, can enable later
  
  // Token validation
  filterProtocolClaims: true,
  loadUserInfo: false, // We'll load user info separately if needed
}

// Singleton UserManager instance
let userManager: UserManager | null = null

/**
 * Get the UserManager singleton instance
 */
export function getUserManager(): UserManager {
  if (typeof window === 'undefined') {
    throw new Error('UserManager can only be used on the client side')
  }
  
  if (!userManager) {
    userManager = new UserManager(oidcConfig)
    
    // Add event listeners
    userManager.events.addUserLoaded(() => {
      // User loaded
    })
    
    userManager.events.addUserUnloaded(() => {
      // User unloaded
    })
    
    userManager.events.addAccessTokenExpired(() => {
      // Access token expired
    })
    
    userManager.events.addSilentRenewError((error) => {
      console.error('[OIDC] Silent renew error:', error)
    })
  }
  
  return userManager
}

/**
 * Get the current authenticated user
 */
export async function getUser(): Promise<User | null> {
  try {
    const um = getUserManager()
    return await um.getUser()
  } catch (error) {
    console.error('[OIDC] Error getting user:', error)
    return null
  }
}

/**
 * Get the access token for API calls
 * Checks both oidc-client-ts store and sessionStorage (for simple flow)
 */
export async function getAccessToken(): Promise<string | null> {
  // First check localStorage for simple flow tokens
  if (typeof window !== 'undefined') {
    const simpleFlowToken = localStorage.getItem('oidc_access_token')
    if (simpleFlowToken) {
      return simpleFlowToken
    }
  }
  
  // Then try oidc-client-ts (PKCE flow)
  try {
    const user = await getUser()
    
    if (!user) {
      return null
    }
    
    // Check if token is expired
    if (user.expired) {
      return null
    }
    
    return user.access_token
  } catch (error) {
    console.error('[OIDC] Error getting access token:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 * Checks both oidc-client-ts store and sessionStorage (for simple flow)
 */
export async function isAuthenticated(): Promise<boolean> {
  // First check localStorage for simple flow tokens
  if (typeof window !== 'undefined') {
    const simpleFlowToken = localStorage.getItem('oidc_access_token')
    if (simpleFlowToken) {
      return true
    }
  }
  
  // Then check oidc-client-ts
  const user = await getUser()
  return user !== null && !user.expired
}

/**
 * Initiate login redirect to Identity Provider
 * Uses simple redirect without PKCE for non-HTTPS development environments
 * @param returnUrl - URL to return to after login
 */
export async function login(returnUrl?: string): Promise<void> {
  const targetReturnUrl = returnUrl || window.location.pathname
  
  // Check if crypto.subtle is available (HTTPS or localhost only)
  const hasCryptoSubtle = typeof window !== 'undefined' && 
    window.crypto && 
    typeof window.crypto.subtle !== 'undefined'
  
  if (hasCryptoSubtle) {
    // Use oidc-client-ts with PKCE (secure contexts)
    try {
      const um = getUserManager()
      const state = { returnUrl: targetReturnUrl }
      await um.signinRedirect({ state })
      return
    } catch (error) {
      console.warn('[OIDC] PKCE redirect failed, falling back to simple redirect:', error)
    }
  }
  
  // Fallback: Simple redirect without PKCE for HTTP development
  // Note: This is less secure but works for local development with custom domains
  
  // Store return URL in localStorage for callback
  localStorage.setItem('oidc_return_url', targetReturnUrl)
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15)
  localStorage.setItem('oidc_state', state)
  
  // Build authorize URL manually
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${APP_URL}/callback`,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state: state,
  })
  
  const authorizeUrl = `${GATEWAY_URL}/connect/authorize?${params.toString()}`
  
  window.location.href = authorizeUrl
}

/**
 * Handle the callback after login redirect
 */
export async function handleCallback(): Promise<User> {
  try {
    const um = getUserManager()
    const user = await um.signinRedirectCallback()
    
    return user
  } catch (error) {
    console.error('[OIDC] Callback error:', error)
    throw error
  }
}

/**
 * Logout and redirect to Identity Provider
 */
export async function logout(): Promise<void> {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.test'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://core.test'

  // Clear local tokens from localStorage
  localStorage.removeItem('oidc_access_token')
  localStorage.removeItem('oidc_refresh_token')
  localStorage.removeItem('oidc_id_token')
  localStorage.removeItem('oidc_state')
  localStorage.removeItem('oidc_return_url')
  localStorage.removeItem('oidc_code_verifier')

  // Clear oidc-client-ts user
  try {
    const um = getUserManager()
    await um.removeUser()
  } catch (error) {
    console.warn('[OIDC] Failed to remove user:', error)
  }
  
  // Logout from Gateway (clear SSO cookie)
  try {
    await fetch(`${gatewayUrl}/identity/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.warn('[OIDC] Gateway logout failed:', error)
  }
  
  // Redirect to Gateway logout endpoint
  window.location.href = `${gatewayUrl}/connect/logout?post_logout_redirect_uri=${encodeURIComponent(appUrl)}`
}

/**
 * Get user profile information
 */
export async function getUserProfile(): Promise<{
  id: string
  email: string
  name?: string
} | null> {
  const user = await getUser()
  
  if (!user) {
    return null
  }
  
  return {
    id: user.profile.sub,
    email: user.profile.email || '',
    name: user.profile.name,
  }
}
