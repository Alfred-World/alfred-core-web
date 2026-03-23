'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[core-web] global error', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', background: '#f8f8fc' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '480px' }}>
            <span style={{ fontSize: '96px', fontWeight: 700, lineHeight: 1, color: '#2c2c3e' }}>500</span>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#2c2c3e' }}>System Error ⚠️</h2>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '15px' }}>A critical error occurred. Please try again in a moment.</p>
            <button
              onClick={reset}
              style={{ marginTop: '8px', padding: '10px 28px', background: '#7367f0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
