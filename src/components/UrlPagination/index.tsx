'use client'

import { useCallback, useRef, useMemo } from 'react'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import {
    Box,
    FormControl,
    MenuItem,
    Pagination,
    Select,
    Typography,
    type SelectChangeEvent
} from '@mui/material'

// Constants
import { DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export interface UrlPaginationProps {

    /** Current page (1-indexed) */
    page: number

    /** Current page size */
    pageSize: number

    /** Total number of items */
    total: number

    /** Total number of pages */
    totalPages: number

    /** Default page size (for URL cleanup) */
    defaultPageSize?: number

    /** Available page size options */
    pageSizeOptions?: number[]

    /** Callback when page changes */
    onPageChange: (page: number) => void

    /** Callback when pageSize changes */
    onPageSizeChange: (pageSize: number) => void

    /** If true, sync with URL query params */
    syncWithUrl?: boolean

    /** URL param name for page */
    pageParamName?: string

    /** URL param name for pageSize */
    pageSizeParamName?: string
}

export function UrlPagination({
    page,
    pageSize,
    total,
    totalPages,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    onPageChange,
    onPageSizeChange,
    syncWithUrl = true,
    pageParamName = 'page',
    pageSizeParamName = 'pageSize'
}: UrlPaginationProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Update URL when values change
    const updateUrl = useCallback(
        (newPage: number, newPageSize: number) => {
            if (!syncWithUrl) return

            const params = new URLSearchParams(searchParams.toString())

            if (newPage > 1) {
                params.set(pageParamName, String(newPage))
            } else {
                params.delete(pageParamName)
            }

            if (newPageSize !== defaultPageSize) {
                params.set(pageSizeParamName, String(newPageSize))
            } else {
                params.delete(pageSizeParamName)
            }

            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        },
        [syncWithUrl, searchParams, router, pathname, pageParamName, pageSizeParamName, defaultPageSize]
    )

    const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
        onPageChange(newPage)
        updateUrl(newPage, pageSize)
    }

    const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
        const newPageSize = Number(event.target.value)

        onPageSizeChange(newPageSize)
        onPageChange(1) // Reset to first page
        updateUrl(1, newPageSize)
    }

    if (totalPages <= 0) return null

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Rows per page:
                </Typography>
                <FormControl size="small">
                    <Select value={pageSize} onChange={handlePageSizeChange} sx={{ minWidth: 70 }}>
                        {pageSizeOptions.map(size => (
                            <MenuItem key={size} value={size}>
                                {size}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                    Total: {total} items
                </Typography>
            </Box>

            <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
            />
        </Box>
    )
}

// Hook to get pagination values from URL (read-only, no side effects)
export function useUrlPagination(
    defaultPageSize = DEFAULT_PAGE_SIZE,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    pageParamName = 'page',
    pageSizeParamName = 'pageSize'
) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Store refs to avoid recreating callbacks
    const searchParamsRef = useRef(searchParams)
    const routerRef = useRef(router)
    const pathnameRef = useRef(pathname)

    // Update refs on each render
    searchParamsRef.current = searchParams
    routerRef.current = router
    pathnameRef.current = pathname

    // Get values from URL
    const urlPage = searchParams.get(pageParamName)
    const urlPageSize = searchParams.get(pageSizeParamName)

    const page = urlPage ? parseInt(urlPage, 10) || 1 : 1

    const pageSize = urlPageSize
        ? pageSizeOptions.includes(parseInt(urlPageSize, 10))
            ? parseInt(urlPageSize, 10)
            : defaultPageSize
        : defaultPageSize

    // Stable callbacks using refs
    const setPage = useCallback(
        (newPage: number) => {
            const params = new URLSearchParams(searchParamsRef.current.toString())

            if (newPage > 1) {
                params.set(pageParamName, String(newPage))
            } else {
                params.delete(pageParamName)
            }

            routerRef.current.replace(`${pathnameRef.current}?${params.toString()}`, { scroll: false })
        },
        [pageParamName]
    )

    const setPageSize = useCallback(
        (newPageSize: number) => {
            const params = new URLSearchParams(searchParamsRef.current.toString())

            // Reset page to 1 when changing pageSize
            params.delete(pageParamName)

            if (newPageSize !== defaultPageSize) {
                params.set(pageSizeParamName, String(newPageSize))
            } else {
                params.delete(pageSizeParamName)
            }

            routerRef.current.replace(`${pathnameRef.current}?${params.toString()}`, { scroll: false })
        },
        [pageParamName, pageSizeParamName, defaultPageSize]
    )

    const resetPage = useCallback(() => {
        const params = new URLSearchParams(searchParamsRef.current.toString())

        params.delete(pageParamName)
        routerRef.current.replace(`${pathnameRef.current}?${params.toString()}`, { scroll: false })
    }, [pageParamName])

    return {
        page,
        pageSize,
        setPage,
        setPageSize,
        resetPage
    }
}

// Hook to get and manage sorting with URL sync
export function useUrlSorting(defaultSort = '', sortParamName = 'sort') {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const searchParamsRef = useRef(searchParams)
    const routerRef = useRef(router)
    const pathnameRef = useRef(pathname)

    searchParamsRef.current = searchParams
    routerRef.current = router
    pathnameRef.current = pathname

    // Get sort from URL - distinguish between no param (use default) vs empty param (no sort)
    const urlSort = searchParams.get(sortParamName)
    const sort = urlSort !== null ? urlSort : defaultSort

    // Convert URL sort string to TanStack SortingState
    // API format: "name" (asc), "-name" (desc), "name,-createdAt"
    const sorting = useMemo(() => {
        if (!sort || sort.length === 0) return []

        return sort.split(',').map(part => {
            const desc = part.startsWith('-')
            const id = desc ? part.substring(1) : part

            return { id, desc }
        })
    }, [sort])

    // Update URL when sorting changes
    const setSorting = useCallback(
        (updaterOrValue: any) => {
            // Handle both functional updates and direct values
            // TanStack table passes an updater function
            let newSorting = []

            if (typeof updaterOrValue === 'function') {
                // Read current sorting from URL directly to avoid stale closure
                const urlSort = searchParamsRef.current.get(sortParamName)

                // Only use URL sort if it exists, otherwise use default
                const currentSort = urlSort !== null ? urlSort : defaultSort

                // Parse the sort string, but handle empty strings properly
                const currentSorting = currentSort && currentSort.length > 0
                    ? currentSort.split(',').map(part => {
                        const desc = part.startsWith('-')
                        const id = desc ? part.substring(1) : part

                        return { id, desc }
                    })
                    : []

                newSorting = updaterOrValue(currentSorting)
            } else {
                newSorting = updaterOrValue
            }

            const params = new URLSearchParams(searchParamsRef.current.toString())

            if (newSorting && newSorting.length > 0) {
                // Convert SortingState back to API string
                const sortString = newSorting.map((s: any) => (s.desc ? `-${s.id}` : s.id)).join(',')

                params.set(sortParamName, sortString)
            } else {
                // When clearing sort, remove param from URL (will fallback to default)
                params.delete(sortParamName)
            }

            routerRef.current.replace(`${pathnameRef.current}?${params.toString()}`, { scroll: false })
        },
        [sortParamName, defaultSort]
    )

    return {
        sort, // Raw API string
        sorting, // TanStack SortingState
        setSorting
    }
}
