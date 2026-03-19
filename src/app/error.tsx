'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[core-web] route error', error)
  }, [error])

  return (
    <div style={{ padding: 24 }}>
      <h2>Co loi xay ra trong qua trinh tai trang</h2>
      <p>Vui long thu lai. Neu van loi, hay lien he doi van hanh.</p>
      <button onClick={() => reset()}>Thu lai</button>
    </div>
  )
}
