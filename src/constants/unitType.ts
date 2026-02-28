// ─── Unit Type Constants ───────────────────────────────────────────────────────
// Re-export the generated enums from the API client (source of truth from backend)

import { UnitCategory, UnitStatus } from '@generated/api'

export type UnitCategoryValue = (typeof UnitCategory)[keyof typeof UnitCategory]
export type UnitStatusValue = (typeof UnitStatus)[keyof typeof UnitStatus]

export const UNIT_CATEGORIES = Object.values(UnitCategory) as UnitCategoryValue[]
export const UNIT_STATUSES = Object.values(UnitStatus) as UnitStatusValue[]

// ─── Category UI Metadata ──────────────────────────────────────────────────────

export interface UnitCategoryMeta {
  label: string
  icon: string
  color: string
}

export const UNIT_CATEGORY_META: Record<UnitCategoryValue, UnitCategoryMeta> = {
  [UnitCategory.PreciousMetals]: {
    label: 'Precious Metals',
    icon: 'tabler-diamond',
    color: '#FFB300'
  },
  [UnitCategory.Weight]: {
    label: 'Weight',
    icon: 'tabler-scale',
    color: '#7C4DFF'
  },
  [UnitCategory.Volume]: {
    label: 'Volume',
    icon: 'tabler-droplet',
    color: '#29B6F6'
  },
  [UnitCategory.Length]: {
    label: 'Length',
    icon: 'tabler-ruler-2',
    color: '#66BB6A'
  },
  [UnitCategory.Area]: {
    label: 'Area',
    icon: 'tabler-dimensions',
    color: '#AB47BC'
  },
  [UnitCategory.Temperature]: {
    label: 'Temperature',
    icon: 'tabler-temperature',
    color: '#EF5350'
  },
  [UnitCategory.Currency]: {
    label: 'Currency',
    icon: 'tabler-currency-dollar',
    color: '#26A69A'
  },
  [UnitCategory.Digital]: {
    label: 'Digital',
    icon: 'tabler-binary-tree',
    color: '#42A5F5'
  },
  [UnitCategory.Custom]: {
    label: 'Custom',
    icon: 'tabler-settings',
    color: '#78909C'
  }
}

// ─── Status UI Metadata ────────────────────────────────────────────────────────

export interface UnitStatusMeta {
  label: string
  color: 'success' | 'warning' | 'error'
  icon: string
}

export const UNIT_STATUS_META: Record<UnitStatusValue, UnitStatusMeta> = {
  [UnitStatus.Active]: {
    label: 'Active',
    color: 'success',
    icon: 'tabler-circle-check'
  },
  [UnitStatus.Review]: {
    label: 'Review',
    color: 'warning',
    icon: 'tabler-clock'
  },
  [UnitStatus.Inactive]: {
    label: 'Inactive',
    color: 'error',
    icon: 'tabler-circle-x'
  }
}

// ─── Category Tabs (All + each category) ───────────────────────────────────────

export const UNIT_CATEGORY_TABS = [
  { label: 'All', value: '' as const, icon: 'tabler-ruler-measure' },
  ...UNIT_CATEGORIES.map(cat => ({
    label: UNIT_CATEGORY_META[cat].label,
    value: cat,
    icon: UNIT_CATEGORY_META[cat].icon
  }))
] as const
