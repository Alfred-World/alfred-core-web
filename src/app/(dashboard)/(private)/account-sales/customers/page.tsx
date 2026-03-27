'use client'

import { Suspense } from 'react'

import AccountSalesCustomers from './_components/AccountSalesCustomers'

const AccountSalesCustomersPage = () => {
  return (
    <Suspense>
      <AccountSalesCustomers />
    </Suspense>
  )
}

export default AccountSalesCustomersPage
