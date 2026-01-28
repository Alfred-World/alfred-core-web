import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: 'dashboards',
    icon: 'tabler-smart-home',
    children: [
      {
        label: 'crm',
        icon: 'tabler-chart-pie-2',
        href: '/dashboards/crm'
      }
    ]
  },
]

export default horizontalMenuData
