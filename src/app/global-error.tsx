'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[core-web] global error', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: 24 }}>
          <h2>He thong dang gap su co</h2>
          <p>Vui long thu lai sau it phut.</p>
          <button onClick={() => reset()}>Tai lai</button>
        </div>
      </body>
    </html>
  )
}
