'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('[core-web] route error', error)
  }, [error])

  return (
    <div className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <div className='flex items-center flex-col text-center'>
        <div className='flex flex-col gap-2 is-[90vw] sm:is-[unset] mbe-6'>
          <Typography className='font-medium text-8xl' color='text.primary'>500</Typography>
          <Typography variant='h4'>Something went wrong ⚠️</Typography>
          <Typography>An error occurred while loading this page. Please try again.</Typography>
        </div>
        <Button variant='contained' onClick={reset}>Try Again</Button>
        <img
          alt='error-illustration'
          src='/images/illustrations/characters/1.png'
          className='object-cover bs-[400px] md:bs-[450px] lg:bs-[500px] mbs-10 md:mbs-14 lg:mbs-20'
        />
      </div>
    </div>
  )
}
