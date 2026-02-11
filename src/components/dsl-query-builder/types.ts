// DSL Query Builder Types

export type { DataType } from '@/types/field'
import type { DataType } from '@/types/field'

/**
 * Enum option for fields that have predefined values
 * Example: SiteType enum with Offshore = 0, Onshore = 1
 */
export interface EnumOption {
    label: string // Display label (e.g. "Offshore")
    value: number | string // Actual value to send in query (e.g. 0)
}

/**
 * Filter field configuration for DslQueryBuilder.
 * Describes a filterable field (name, key, data type, enum options).
 * Table column configuration is separate — see ColumnConfig in AdvancedTable.
 */
export interface FieldConfig {
    name: string // Display name (used in filter dropdown)
    key: string // Field key for query
    dataType: DataType

    /**
     * Optional enum options for fields that have predefined values
     * When provided, a dropdown will be shown instead of free text input
     */
    enumOptions?: EnumOption[]
}

export interface FilterCondition {
    id: string
    field: string
    operator: string
    value: string | number | boolean | null
    secondValue?: string | number | null // For @between operator
    logicalOperator?: 'AND' | 'OR' // Connection to next condition
}

export interface DslQueryBuilderProps {
    fields: FieldConfig[]
    value?: FilterCondition[]
    onChange?: (conditions: FilterCondition[], dslQuery: string) => void
    onSearch?: (dslQuery: string) => void
    onReset?: () => void

    /**
     * Callback fired when conditions are restored from URL on initial load
     * Use this to trigger API call with the restored query
     */
    onInitialLoad?: (dslQuery: string) => void
    title?: string

    /**
     * If true, sync filter conditions to URL query params
     * This allows sharing/bookmarking filtered views
     * @default false
     */
    syncWithUrl?: boolean

    /**
     * URL parameter name for storing filter state
     * @default 'filter'
     */
    urlParamName?: string
}
