'use client'

import { useState, useCallback } from 'react'

import { Box, Grid, Typography } from '@mui/material'

import { DslQueryBuilder, type FieldConfig, type FilterCondition } from '@/components/dsl-query-builder'
import { useUrlPagination, useUrlSorting } from '@/components/UrlPagination'
import { AdvancedTable } from '@/components/AdvancedTable'
import { useGetApplications } from '@/generated'
import type { ApplicationDto } from '@/generated'

// Unified field config - used by both DslQueryBuilder (filter) and AdvancedTable (columns)
const subSiteFields: FieldConfig<ApplicationDto>[] = [
    { name: 'ID', key: 'id', dataType: 'int' },
    { name: 'Display Name', key: 'displayName', dataType: 'string' },
    { name: 'Client ID', key: 'clientId', dataType: 'string', enableSorting: false },
    { name: 'Redirect URIs', key: 'redirectUris', dataType: 'string', enableSorting: false },
    { name: 'Post Logout Redirect URIs', key: 'postLogoutRedirectUris', dataType: 'string', enableSorting: false },
    { name: 'Permissions', key: 'permissions', dataType: 'string', enableSorting: false },
    { name: 'Application Type', key: 'applicationType', dataType: 'string', enableSorting: false },
    { name: 'Client Type', key: 'clientType', dataType: 'string', enableSorting: false },
    { name: 'Is Active', key: 'isActive', dataType: 'bool', enableSorting: false },
    { name: 'Created At', key: 'createdAt', dataType: 'date' },
    { name: 'Updated At', key: 'updatedAt', dataType: 'date', hidden: true }
]

export default function SubSitesFilterDemo() {
    const [appliedQuery, setAppliedQuery] = useState('')

    // Get pagination from URL
    const { page, pageSize, setPage, setPageSize, resetPage } = useUrlPagination()
    const { sort, sorting, setSorting } = useUrlSorting('-createdAt') // Default sort by newest

    // Fetch sub sites with the DSL filter and pagination
    const { data, isLoading, error } = useGetApplications({
        filter: appliedQuery || undefined,
        page,
        pageSize,
        sort
    })

    const result = data?.success ? data.result : null

    const handleSearch = useCallback(
        (query: string) => {
            setAppliedQuery(query)
            resetPage() // Reset to first page on new search
        },
        [resetPage]
    )

    const handleReset = useCallback(() => {
        setAppliedQuery('')
        resetPage()
    }, [resetPage])

    const handleChange = useCallback((_conditions: FilterCondition[], _query: string) => {
        // Optional: track changes without triggering search
    }, [])

    if (error) {
        return <Typography color="error">Error loading data: {String(error)}</Typography>
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Sub Sites Filter Demo
            </Typography>

            <Grid container spacing={3}>
                {/* Filter Builder */}
                <Grid size={{ xs: 12 }}>
                    <DslQueryBuilder
                        fields={subSiteFields}
                        onChange={handleChange}
                        onSearch={handleSearch}
                        onReset={handleReset}
                        onInitialLoad={handleSearch}
                        title="Filter Sub Sites..."
                        syncWithUrl={true}
                    />
                </Grid>

                {/* SubSites Table - uses same fields config */}
                <Grid size={{ xs: 12 }}>
                    <AdvancedTable<ApplicationDto>
                        fields={subSiteFields}
                        data={result?.items || []}
                        total={result?.total || 0}
                        page={page}
                        pageSize={pageSize}
                        sorting={sorting}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        onSortingChange={setSorting}
                        isLoading={isLoading}
                        enableRowSelection={true}
                        getRowId={(row) => String(row.id)}
                    />
                </Grid>
            </Grid>
        </Box>
    )
}
