import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Constants
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://gateway.test:8000'

/**
 * API Route để check SSO session từ Gateway
 * Client gọi endpoint này để verify session status
 */
export async function GET(request: NextRequest) {
  try {
    // Forward cookies từ client request đến Gateway
    const cookieHeader = request.headers.get('cookie') || ''

    const response = await fetch(`${GATEWAY_URL}/api/v1/identity/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        message: 'No valid session'
      }, { status: 401 })
    }

    const result = await response.json()

    if (result.success && result.result?.isAuthenticated) {
      return NextResponse.json({
        success: true,
        isAuthenticated: true,
        user: result.result.user
      })
    }

    return NextResponse.json({
      success: false,
      isAuthenticated: false,
      message: 'No valid session'
    }, { status: 401 })

  } catch (error: any) {
    console.error('Error checking SSO session:', error)

    return NextResponse.json({
      success: false,
      isAuthenticated: false,
      message: error.message || 'Failed to check session'
    }, { status: 500 })
  }
}
