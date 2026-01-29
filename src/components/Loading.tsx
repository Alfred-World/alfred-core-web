import React from 'react'

import classnames from 'classnames'

interface LoadingProps {
  className?: string
  spinnerClassName?: string
  message?: string
}

const Loading: React.FC<LoadingProps> = ({ className, spinnerClassName, message }) => {
  return (
    <div className={classnames('flex items-center justify-center min-h-screen', className)}>
      <div className='flex flex-col items-center gap-4'>
        <div
          className={classnames(
            'animate-spin rounded-full h-12 w-12 border-b-2 border-primary',
            spinnerClassName
          )}
        />
        {message && <p className='text-gray-500'>{message}</p>}
      </div>
    </div>
  )
}

export default Loading
