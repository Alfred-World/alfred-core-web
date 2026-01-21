// DSL Query Builder Types

export type DataType = 'string' | 'int' | 'long' | 'date' | 'bool'

/**
 * Enum option for fields that have predefined values
 * Example: SiteType enum with Offshore = 0, Onshore = 1
 */
export interface EnumOption {
    label: string // Display label (e.g. "Offshore")
    value: number | string // Actual value to send in query (e.g. 0)
}

export interface FieldConfig<TData = any> {
    name: string // Display name (used as column header)
    key: string // Field key for query and data access
    dataType: DataType

    /**
     * Optional enum options for fields that have predefined values
     * When provided, a dropdown will be shown instead of free text input
     */
    enumOptions?: EnumOption[]

    // ============================================================
    // Table Column Properties (for AdvancedTable auto-generation)
    // ============================================================

    /** Enable sorting on this column. Default: true */
    enableSorting?: boolean

    /** Hide from table but still filterable. Default: false */
    hidden?: boolean

    /** Column width (CSS value, e.g. 100, '150px', '20%') */
    width?: number | string

    /** Text alignment. Default: 'left' */
    align?: 'left' | 'center' | 'right'

    /**
     * Custom cell renderer function
     * @param value - The cell value
     * @param row - The entire row data
     * @returns React node to render
     */
    renderCell?: (value: any, row: TData) => React.ReactNode
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
