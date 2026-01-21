import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * Get the current session server-side
 */
export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

/**
 * Get the current access token server-side
 */
export async function getAccessToken() {
  const session = await getServerAuthSession()
  return session?.accessToken
}

/**
 * Get the current user server-side
 */
export async function getCurrentUser() {
  const session = await getServerAuthSession()
  return session?.user
}
