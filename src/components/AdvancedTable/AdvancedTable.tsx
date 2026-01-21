'use client'

// React Imports
import { useState, useMemo, type ReactNode } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'

// Local Component Imports

// Third-party Imports
import classnames from 'classnames'
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    createColumnHelper,
} from '@tanstack/react-table'
import type {
    ColumnDef,
    SortingState,
    OnChangeFn,
    VisibilityState,
    ColumnPinningState,
    RowSelectionState,
    TableOptions,
} from '@tanstack/react-table'

import { TableSkeleton } from './TableSkeleton'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { FieldConfig } from '@/components/dsl-query-builder/types'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Constants
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/pagination'

// Styled Components
const Icon = styled('i')({})

// ============================================================
// TYPES
// ============================================================

export interface AdvancedTableProps<TData> {

    /** Data to display in the table */
    data: TData[]

    /**
     * Field configurations - auto-generates columns from these
     * Use this for simple tables where you don't need custom column definitions
     */
    fields?: FieldConfig<TData>[]

    /**
     * Column definitions from TanStack Table
     * Use this when you need full control over column rendering
     * If both fields and columns are provided, columns takes precedence
     */
    columns?: ColumnDef<TData, any>[]

    /** Total number of records (for server-side pagination) */
    total: number

    /** Current page (1-indexed) */
    page: number

    /** Page size */
    pageSize: number

    /** Sorting state */
    sorting?: SortingState

    /** Callback when page changes */
    onPageChange: (page: number) => void

    /** Callback when page size changes */
    onPageSizeChange: (pageSize: number) => void

    /** Callback when sorting changes */
    onSortingChange?: OnChangeFn<SortingState>

    /** Row selection callback */
    onRowSelectionChange?: (selectedRows: TData[]) => void

    /** Loading state */
    isLoading?: boolean

    /** Enable row selection */
    enableRowSelection?: boolean

    /** Get unique row ID */
    getRowId?: (row: TData) => string

    /** Custom header content (left side) */
    headerLeftContent?: ReactNode

    /** Custom header content (right side) */
    headerRightContent?: ReactNode

    /** Card title */
    title?: string

    /** Page size options */
    pageSizeOptions?: number[]
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

interface TablePaginationProps<TData> {
    table: ReturnType<typeof useReactTable<TData>>
    total: number
    onPageChange: (page: number) => void
}

function TablePagination<TData>({
    table,
    total,
    onPageChange,
}: TablePaginationProps<TData>) {
    const pageCount = table.getPageCount()
    const currentPage = table.getState().pagination.pageIndex + 1

    return (
        <div className='flex justify-between items-center flex-wrap pli-6 border-bs bs-auto plb-[12.5px] gap-2'>
            <Typography color='text.disabled'>
                {`Showing ${total === 0
                    ? 0
                    : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                    }
        to ${Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        total
                    )} of ${total} entries`}
            </Typography>
            <Pagination
                shape='rounded'
                color='primary'
                variant='tonal'
                count={pageCount}
                page={currentPage}
                onChange={(_, page) => {
                    onPageChange(page)
                }}
                showFirstButton
                showLastButton
            />
        </div>
    )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Generates TanStack Table columns from FieldConfig array
 */
function generateColumnsFromFields<TData>(
    fields: FieldConfig<TData>[],
    columnHelper: ReturnType<typeof createColumnHelper<TData>>
): ColumnDef<TData, any>[] {
    return fields
        .filter(field => !field.hidden)
        .map(field => {
            return columnHelper.accessor(field.key as any, {
                id: field.key,
                header: field.name,
                enableSorting: field.enableSorting !== false, // Default true
                cell: ({ row }) => {
                    const value = (row.original as any)[field.key]

                    // Use custom renderer if provided
                    if (field.renderCell) {
                        return field.renderCell(value, row.original)
                    }

                    // Default rendering based on data type
                    if (field.dataType === 'date') {
                        return (
                            <Typography color='text.primary'>
                                {value ? new Date(value).toLocaleDateString() : '-'}
                            </Typography>
                        )
                    }

                    if (field.dataType === 'bool') {
                        return (
                            <Typography color='text.primary'>
                                {value === true ? 'Yes' : value === false ? 'No' : '-'}
                            </Typography>
                        )
                    }

                    // Default text rendering
                    return (
                        <Typography color='text.primary'>
                            {value ?? '-'}
                        </Typography>
                    )
                },
                meta: {
                    align: field.align,
                    width: field.width,
                },
            })
        })
}

export function AdvancedTable<TData>({
    data,
    fields,
    columns: userColumns,
    total,
    page,
    pageSize,
    sorting = [],
    onPageChange,
    onPageSizeChange,
    onSortingChange,
    onRowSelectionChange,
    isLoading,
    enableRowSelection = false,
    getRowId,
    headerLeftContent,
    headerRightContent,
    title,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: AdvancedTableProps<TData>) {
    // ============================================================
    // Generate columns from fields if provided
    // ============================================================
    const columnHelper = createColumnHelper<TData>()

    const generatedColumns = useMemo<ColumnDef<TData, any>[]>(() => {
        // If userColumns provided, use them directly
        if (userColumns && userColumns.length > 0) {
            return userColumns
        }

        // If fields provided, generate columns from them
        if (fields && fields.length > 0) {
            return generateColumnsFromFields(fields, columnHelper)
        }

        // No columns or fields provided
        return []
    }, [userColumns, fields, columnHelper])

    // ============================================================
    // Build columns with optional selection column
    // ============================================================
    const columns = useMemo<ColumnDef<TData, any>[]>(() => {
        if (!enableRowSelection) return generatedColumns

        const selectionColumn: ColumnDef<TData, any> = {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    indeterminate={table.getIsSomePageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    color='primary'
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                    color='primary'
                />
            ),
            enableSorting: false,
            enableHiding: false,
        }

        return [selectionColumn, ...generatedColumns]
    }, [enableRowSelection, generatedColumns])

    // ============================================================
    // State
    // ============================================================
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
        left: [],
        right: []
    })

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    // Menu anchor for column visibility dropdown
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    // ============================================================
    // Table configuration
    // ============================================================
    const tableOptions: TableOptions<TData> = {
        data,
        columns,
        pageCount: Math.ceil(total / pageSize),
        state: {
            pagination: {
                pageIndex: page - 1,
                pageSize
            },
            sorting,
            columnVisibility,
            columnPinning,
            rowSelection
        },
        enableRowSelection,
        getRowId: getRowId,
        manualPagination: true,
        manualSorting: true,
        onPaginationChange: (updater) => {
            if (typeof updater === 'function') {
                const newState = updater({
                    pageIndex: page - 1,
                    pageSize
                })

                onPageChange(newState.pageIndex + 1)
                onPageSizeChange(newState.pageSize)
            } else {
                onPageChange(updater.pageIndex + 1)
                onPageSizeChange(updater.pageSize)
            }
        },
        onSortingChange: onSortingChange,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnPinningChange: setColumnPinning,
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function'
                ? updater(rowSelection)
                : updater

            setRowSelection(newSelection)

            // Call external callback with selected rows
            if (onRowSelectionChange) {
                const selectedRows = data.filter((_, index) => {
                    const rowId = getRowId ? getRowId(data[index] as TData) : String(index)


                    return newSelection[rowId]
                })

                onRowSelectionChange(selectedRows)
            }
        },
        getCoreRowModel: getCoreRowModel(),
    }

    const table = useReactTable(tableOptions)

    // ============================================================
    // Render
    // ============================================================
    return (
        <Card>
            <CardContent className='flex justify-between flex-col gap-4 items-start sm:flex-row sm:items-center'>
                {/* Left side content */}
                <div className='flex items-center gap-4'>
                    {title && (
                        <Typography variant='h6' fontWeight={600}>
                            {title}
                        </Typography>
                    )}
                    {headerLeftContent}
                    <div className='flex items-center gap-2'>
                        <Typography>Show</Typography>
                        <CustomTextField
                            select
                            value={pageSize}
                            onChange={e => onPageSizeChange(Number(e.target.value))}
                            className='max-sm:is-full sm:is-[80px]'
                        >
                            {pageSizeOptions.map(option => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </CustomTextField>
                    </div>
                </div>

                {/* Right side content */}
                <div className='flex items-center gap-2'>
                    {headerRightContent}

                    {/* Column Visibility Toggle Button */}
                    <Button
                        variant='outlined'
                        size='small'
                        onClick={handleMenuClick}
                        startIcon={<Icon className='tabler-columns' />}
                        sx={{ minWidth: 'auto' }}
                    >
                        View
                    </Button>

                    {/* Column Visibility Menu */}
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleMenuClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        slotProps={{
                            paper: {
                                sx: { minWidth: 200, maxHeight: 400 }
                            }
                        }}
                    >
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                                Table View
                            </Typography>
                        </Box>
                        <Divider />

                        {/* Column Visibility Header */}
                        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', fontWeight: 500 }}>
                                Column Visibility
                            </Typography>
                        </Box>

                        {/* Column Toggles */}
                        {table.getAllLeafColumns().map(column => {
                            // Skip selection column
                            if (column.id === 'select') return null

                            const isPinnedLeft = column.getIsPinned() === 'left'
                            const isPinnedRight = column.getIsPinned() === 'right'
                            const isPinned = isPinnedLeft || isPinnedRight

                            return (
                                <MenuItem
                                    key={column.id}
                                    sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={column.getIsVisible()}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    column.toggleVisibility(e.target.checked)
                                                }}
                                                size='small'
                                                sx={{ p: 0.5 }}
                                            />
                                        }
                                        label={
                                            <Typography variant='body2'>
                                                {typeof column.columnDef.header === 'string'
                                                    ? column.columnDef.header
                                                    : column.id}
                                            </Typography>
                                        }
                                        sx={{ m: 0, flex: 1 }}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* Pin/Unpin Buttons */}
                                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                        {isPinned ? (
                                            <Tooltip title="Unpin">
                                                <IconButton
                                                    size='small'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        column.pin(false)
                                                    }}
                                                    sx={{ p: 0.25 }}
                                                >
                                                    <Icon className='tabler-x text-lg' />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <>
                                                <Tooltip title="Pin Left">
                                                    <IconButton
                                                        size='small'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            column.pin('left')
                                                        }}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <Icon className='tabler-arrow-bar-to-left text-lg' />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Pin Right">
                                                    <IconButton
                                                        size='small'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            column.pin('right')
                                                        }}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <Icon className='tabler-arrow-bar-to-right text-lg' />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Box>
                                </MenuItem>
                            )
                        })}

                        <Divider sx={{ my: 1 }} />

                        {/* Show All Columns */}
                        <MenuItem
                            onClick={() => {
                                table.toggleAllColumnsVisible(true)
                            }}
                            sx={{ justifyContent: 'center' }}
                        >
                            <Typography variant='body2' color='primary'>
                                Show All Columns
                            </Typography>
                        </MenuItem>
                    </Menu>
                </div>
            </CardContent>

            {/* Table */}
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id}>
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={classnames(
                                                    'flex items-center justify-between w-full',
                                                    {
                                                        'cursor-pointer select-none': header.column.getCanSort()
                                                    }
                                                )}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <span>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                                {header.column.getCanSort() && (
                                                    <span className='ml-2'>
                                                        {{
                                                            asc: <Icon className='tabler-chevron-up text-lg' />,
                                                            desc: <Icon className='tabler-chevron-down text-lg' />
                                                        }[header.column.getIsSorted() as 'asc' | 'desc'] ?? (
                                                                <Icon className='tabler-selector text-lg opacity-50' />
                                                            )}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    {isLoading ? (
                        <TableSkeleton
                            rowCount={Math.min(pageSize, 10)}
                            columnCount={enableRowSelection ? columns.length - 1 : columns.length}
                            showCheckbox={enableRowSelection}
                        />
                    ) : data.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan={columns.length} className='text-center'>
                                    No data available
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>

            {/* Pagination */}
            <TablePagination table={table} total={total} onPageChange={onPageChange} />
        </Card>
    )
}

export default AdvancedTable
