// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  // This is how you will normally render submenu
  {
    label: 'Dashboards',

    // suffix: {
    //   label: '5',
    //   color: 'error'
    // },
    icon: 'tabler-smart-home',
    href: '/dashboards'
  },
  {
    label: 'Brands',
    icon: 'tabler-building-store',
    href: '/brands'
  },
  {
    label: 'Categories',
    icon: 'tabler-category',
    href: '/categories'
  },
  {
    label: 'Units',
    icon: 'tabler-ruler-measure',
    href: '/units'
  },
  {
    label: 'Assets',
    icon: 'tabler-package',
    href: '/assets'
  },
  {
    label: 'Commodities',
    icon: 'tabler-chart-line',
    href: '/commodities'
  },
  {
    label: 'Account Sales',
    icon: 'tabler-device-desktop-analytics',
    children: [
      {
        label: 'Overview',
        icon: 'tabler-layout-dashboard',
        href: '/account-sales/dashboard'
      },
      {
        label: 'Customers',
        icon: 'tabler-users',
        href: '/account-sales/customers'
      },
      {
        label: 'Products',
        icon: 'tabler-package',
        href: '/account-sales/products'
      },
      {
        label: 'Account Clones',
        icon: 'tabler-key',
        href: '/account-sales/clones'
      },
      {
        label: 'Source Accounts',
        icon: 'tabler-user-shield',
        href: '/account-sales/source-accounts'
      },
      {
        label: 'Orders & Warranty',
        icon: 'tabler-receipt-2',
        href: '/account-sales/orders'
      },
      {
        label: 'Sales Bonus',
        icon: 'tabler-trophy',
        href: '/account-sales/bonus'
      }
    ]
  },
  {
    label: 'Access Control',
    icon: 'tabler-shield-lock',
    children: [
      {
        label: 'Users',
        icon: 'tabler-users',
        href: '/apps/users'
      },
      {
        label: 'Roles',
        icon: 'tabler-users-group',
        href: '/apps/roles'
      }
    ]
  },
  {
    label: 'AI Chat',
    icon: 'tabler-robot',
    href: '/ai-chat'
  }
]

export default verticalMenuData
