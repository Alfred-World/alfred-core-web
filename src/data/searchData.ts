type SearchData = {
  id: string
  name: string
  url: string

  icon: string
  section: string
  shortcut?: string
}

// TODO: Add more search data
const data: SearchData[] = [
  {
    id: '1',
    name: 'Dashboard',
    url: '/dashboards',
    icon: 'tabler-chart-pie-2',
    section: 'Dashboards'
  },
]

export default data
