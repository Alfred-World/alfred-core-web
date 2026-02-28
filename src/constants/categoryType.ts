// ─── Category Type Constants ───────────────────────────────────────────────────
// Re-export the generated enum from the API client (source of truth from backend)

import { CategoryType } from '@generated/api'

export type CategoryTypeValue = (typeof CategoryType)[keyof typeof CategoryType]

export const CATEGORY_TYPES = Object.values(CategoryType) as CategoryTypeValue[]

// ─── UI Metadata per Type ──────────────────────────────────────────────────────

export interface CategoryTypeMeta {
  label: string
  value: CategoryTypeValue | ''
  icon: string
  color: string
  chipColor: 'primary' | 'warning' | 'info'
}

export const CATEGORY_TYPE_META: Record<CategoryTypeValue, Omit<CategoryTypeMeta, 'value'>> = {
  [CategoryType.Asset]: {
    label: 'Asset',
    icon: 'tabler-box',
    color: '#7C4DFF',
    chipColor: 'primary'
  },
  [CategoryType.Consumable]: {
    label: 'Consumable',
    icon: 'tabler-package',
    color: '#FF9800',
    chipColor: 'warning'
  },
  [CategoryType.Brand]: {
    label: 'Brand',
    icon: 'tabler-building-store',
    color: '#29B6F6',
    chipColor: 'info'
  }
}

// ─── Derived Lookup Maps ───────────────────────────────────────────────────────

/** Dot color for tree view nodes */
export const TYPE_DOT_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TYPE_META).map(([k, v]) => [k, v.color])
)

/** Chip color by type */
export const TYPE_CHIP_COLORS: Record<string, 'primary' | 'warning' | 'info'> = Object.fromEntries(
  Object.entries(CATEGORY_TYPE_META).map(([k, v]) => [k, v.chipColor])
)

/** Tabs for the category tree (All + each type) */
export const CATEGORY_TYPE_TABS = [
  { label: 'All', value: '' as const, icon: 'tabler-category-2' },
  ...CATEGORY_TYPES.map(type => ({
    label: CATEGORY_TYPE_META[type].label,
    value: type,
    icon: CATEGORY_TYPE_META[type].icon
  }))
] as const
