// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import { SITE_CODES, SITE_INFO, STATISTIC_ROUTES, REPORT_ROUTES } from '@/configs/siteConfig'

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
  },
  {
    label: 'Statistic',
    icon: 'tabler-chart-bar',
    children: [
      {
        label: SITE_INFO[SITE_CODES.CNV].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.CNV)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.CNV)
          }
        ]
      },
      {
        label: SITE_INFO[SITE_CODES.CNVSB].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.CNVSB)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.CNVSB)
          },

        ]
      },
      {
        label: SITE_INFO[SITE_CODES.DRL].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.DRL)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.DRL)
          },

        ]
      },
      {
        label: SITE_INFO[SITE_CODES.OFFI].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.OFFI)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.OFFI)
          },

        ]
      },
      {
        label: SITE_INFO[SITE_CODES.PRJ].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.PRJ)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.PRJ)
          },

        ]
      },
      {
        label: SITE_INFO[SITE_CODES.TLJ].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.TLJ)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.TLJ)
          },

        ]
      },
      {
        label: SITE_INFO[SITE_CODES.TGT].name,
        icon: 'tabler-building',
        children: [
          {
            label: 'Tracking View',
            icon: 'tabler-eye',
            href: STATISTIC_ROUTES.tracking(SITE_CODES.TGT)
          },
          {
            label: 'Create New',
            icon: 'tabler-plus',
            href: STATISTIC_ROUTES.create(SITE_CODES.TGT)
          },

        ]
      },
      {
        label: 'Reports',
        icon: 'tabler-file-text',
        children: [
          {
            label: 'Chemical Used',
            icon: 'tabler-flask',
            href: REPORT_ROUTES.chemicalUsed
          },
          {
            label: 'DO Used',
            icon: 'tabler-droplet',
            href: REPORT_ROUTES.doUsed
          },
          {
            label: 'Fuel Gas',
            icon: 'tabler-gas-station',
            href: REPORT_ROUTES.fuelGas
          },
          {
            label: 'Emergency Drill',
            icon: 'tabler-alarm',
            href: REPORT_ROUTES.emergencyDrill
          },
          {
            label: 'Flared Gas',
            icon: 'tabler-flame',
            href: REPORT_ROUTES.flaredGas
          },
          {
            label: 'HSE Training',
            icon: 'tabler-school',
            href: REPORT_ROUTES.hseTraining
          },
          {
            label: 'Incident/Nearmiss',
            icon: 'tabler-alert-triangle',
            href: REPORT_ROUTES.incidentNearmiss
          },
          {
            label: 'Produced Water',
            icon: 'tabler-droplet-filled',
            href: REPORT_ROUTES.producedWater
          },
          {
            label: 'Violated Fishing Boat - Vessels',
            icon: 'tabler-ship',
            href: REPORT_ROUTES.violatedFishingBoat
          },
          {
            label: 'Working Manhours of Office',
            icon: 'tabler-clock',
            href: REPORT_ROUTES.workingManhoursOffice
          },
          {
            label: 'Observation Card',
            icon: 'tabler-clipboard',
            href: REPORT_ROUTES.observationCard
          },
          {
            label: 'Manhours',
            icon: 'tabler-users',
            href: REPORT_ROUTES.manhours
          },
          {
            label: 'Electricity Consumption',
            icon: 'tabler-bolt',
            href: REPORT_ROUTES.electricityConsumption
          },
          {
            label: 'Air Pollution Report',
            icon: 'tabler-wind',
            href: REPORT_ROUTES.airPollution
          },
          {
            label: 'Emission Report',
            icon: 'tabler-cloud',
            href: REPORT_ROUTES.emission
          }
        ]
      }
    ]
  }
]

export default verticalMenuData
