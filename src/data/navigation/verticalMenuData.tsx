// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  // This is how you will normally render submenu
  {
    label: 'Dashboards',
    suffix: {
      label: '5',
      color: 'error'
    },
    icon: 'tabler-smart-home',
    children: [
      {
        label: 'crm',
        icon: 'tabler-circle',
        href: '/dashboards'
      }
    ]
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
  }
]

export default verticalMenuData
