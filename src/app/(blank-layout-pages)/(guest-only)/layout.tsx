import type { ChildrenType } from '@core/types'

// HOC Imports
import GuestOnlyRoute from '@/hocs/GuestOnlyRoute'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  return <GuestOnlyRoute>{children}</GuestOnlyRoute>
}

export default Layout
