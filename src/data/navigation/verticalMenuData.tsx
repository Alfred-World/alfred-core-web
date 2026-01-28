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
        href: '/dashboards/crm'
      }
    ]
  }
]

export default verticalMenuData
