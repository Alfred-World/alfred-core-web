'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import { Box, Button, Card, CardHeader, CardContent, Divider, Typography } from '@mui/material'

import type { DslQueryBuilderProps, FilterCondition } from './types'
import { FilterRow } from './FilterRow'
import { buildDslQuery } from './buildDslQuery'
import { getOperatorsForDataType } from './operators'

// Generate unique ID
const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Serialize conditions to JSON string (URLSearchParams will handle encoding)
function serializeConditions(conditions: FilterCondition[]): string {
    try {
        // Only serialize conditions that have actual values
        const validConditions = conditions
            .filter(c => {
                // Must have a field
                if (!c.field) return false

                // Must have a non-empty value (unless operator doesn't require value)
                if (c.operator === '@isnull' || c.operator === '@notnull') return true

                // Check for empty values
                if (c.value === null || c.value === undefined || c.value === '') return false

                return true
            })
            .map(({ id: _id, ...rest }) => rest) // Remove id from URL to keep it shorter

        if (validConditions.length === 0) return ''

        // Return plain JSON - URLSearchParams.set() will encode it
        return JSON.stringify(validConditions)
    } catch {
        return ''
    }
}

// Deserialize conditions from URL string
function deserializeConditions(encoded: string): FilterCondition[] | null {
    try {
        if (!encoded) return null

        // URLSearchParams.get() already decodes, so just parse JSON directly
        const decoded = JSON.parse(encoded)

        if (Array.isArray(decoded) && decoded.length > 0) {
            // Regenerate IDs to ensure uniqueness
            return decoded.map((c: Omit<FilterCondition, 'id'>) => ({
                ...c,
                id: generateId()
            }))
        }

        return null
    } catch {
        return null
    }
}

export function DslQueryBuilder({
    fields,
    value,
    onChange,
    onSearch,
    onReset,
    onInitialLoad,
    title = 'When records match...',
    syncWithUrl = false,
    urlParamName = 'filter'
}: DslQueryBuilderProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Use refs to avoid infinite loops - these don't trigger re-renders
    const searchParamsRef = useRef(searchParams)
    const routerRef = useRef(router)
    const pathnameRef = useRef(pathname)

    // Update refs on each render
    searchParamsRef.current = searchParams
    routerRef.current = router
    pathnameRef.current = pathname

    // Get initial conditions from URL or props
    const initialConditions = useMemo(() => {
        // If syncWithUrl is enabled, try to restore from URL first
        if (syncWithUrl) {
            const urlConditions = searchParams.get(urlParamName)

            if (urlConditions) {
                const restored = deserializeConditions(urlConditions)

                if (restored && restored.length > 0) {
                    return restored
                }
            }
        }

        // Fall back to value prop
        if (value && value.length > 0) {
            return value
        }

        // Create initial empty condition
        const firstField = fields[0]

        if (!firstField) return []

        const operators = getOperatorsForDataType(firstField.dataType)

        return [
            {
                id: generateId(),
                field: firstField.key,
                operator: operators[0]?.value || '==',
                value: ''
            }
        ]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run on mount

    // Track if restored from URL
    const restoredFromUrl = useMemo(() => {
        if (syncWithUrl) {
            const urlConditions = searchParams.get(urlParamName)

            if (urlConditions) {
                const restored = deserializeConditions(urlConditions)

                return restored && restored.length > 0
            }
        }

        return false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only check on mount

    const [conditions, setConditions] = useState<FilterCondition[]>(initialConditions)
    const [hasCalledInitialLoad, setHasCalledInitialLoad] = useState(false)

    // Track last serialized conditions to avoid unnecessary URL updates
    const lastSerializedRef = useRef<string>('')

    // Trigger onInitialLoad when restored from URL
    useEffect(() => {
        if (restoredFromUrl && onInitialLoad && !hasCalledInitialLoad) {
            const dslQuery = buildDslQuery(initialConditions, fields)

            if (dslQuery) {
                onInitialLoad(dslQuery)
                setHasCalledInitialLoad(true)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restoredFromUrl, hasCalledInitialLoad])


    // Sync with URL when conditions change (only if syncWithUrl is true)
    // REMOVED auto-sync useEffect to prevent URL updates while typing

    // Build current DSL query
    const currentDslQuery = useMemo(() => buildDslQuery(conditions, fields), [conditions, fields])

    const handleConditionChange = useCallback((id: string, updates: Partial<FilterCondition>) => {
        setConditions(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
    }, [])

    const handleRemoveCondition = useCallback((id: string) => {
        setConditions(prev => {
            const newConditions = prev.filter(c => c.id !== id)

            // If removing the first condition, clear the logical operator from the new first
            if (newConditions.length > 0 && newConditions[0].logicalOperator) {
                newConditions[0] = { ...newConditions[0], logicalOperator: undefined }
            }

            return newConditions
        })
    }, [])

    const handleAddCondition = useCallback(
        (_afterId: string, logicalOperator: 'AND' | 'OR') => {
            const firstField = fields[0]

            if (!firstField) return

            const operators = getOperatorsForDataType(firstField.dataType)

            const newCondition: FilterCondition = {
                id: generateId(),
                field: firstField.key,
                operator: operators[0]?.value || '==',
                value: '',
                logicalOperator
            }

            setConditions(prev => [...prev, newCondition])
        },
        [fields]
    )

    const handleSearch = useCallback(() => {
        const dslQuery = buildDslQuery(conditions, fields)

        if (onSearch) {
            onSearch(dslQuery)
        }

        if (onChange) {
            onChange(conditions, dslQuery)
        }

        // Sync with URL on explicit search
        if (syncWithUrl) {
            const serialized = serializeConditions(conditions)

            // We force update the URL even if serialized is same, to ensure router pushes new state if needed
            // But checking lastSerializedRef detects if we really need to update URL params

            const params = new URLSearchParams(searchParamsRef.current.toString())

            if (serialized) {
                params.set(urlParamName, serialized)
            } else {
                params.delete(urlParamName)
            }

            const newUrl = `${pathnameRef.current}?${params.toString()}`

            routerRef.current.replace(newUrl, { scroll: false })

            lastSerializedRef.current = serialized
        }
    }, [conditions, fields, onSearch, onChange, syncWithUrl, urlParamName])

    const handleReset = useCallback(() => {
        if (onReset) onReset()

        // Clear URL params if sync is enabled
        if (syncWithUrl) {
            // Use window.location.search to get the most up-to-date params
            // incase onReset() triggered a URL update (e.g. resetting page)
            const params = new URLSearchParams(window.location.search)

            params.delete(urlParamName)

            const newUrl = `${pathnameRef.current}?${params.toString()}`

            routerRef.current.replace(newUrl, { scroll: false })

            // Allow URL updates again
            lastSerializedRef.current = ''
        }

        const firstField = fields[0]

        if (!firstField) {
            setConditions([])
        } else {
            const operators = getOperatorsForDataType(firstField.dataType)

            const initialCondition: FilterCondition = {
                id: generateId(),
                field: firstField.key,
                operator: operators[0]?.value || '==',
                value: '',
                logicalOperator: undefined
            }

            setConditions([initialCondition])
        }
    }, [fields, onReset, syncWithUrl, urlParamName])

    // Group conditions for rendering
    const groupedConditions = useMemo(() => {
        const groups: FilterCondition[][] = []
        let currentGroup: FilterCondition[] = []

        conditions.forEach((condition, index) => {
            if (index === 0) {
                currentGroup.push(condition)
            } else if (condition.logicalOperator === 'OR') {
                // Save current group and start new one
                if (currentGroup.length > 0) {
                    groups.push(currentGroup)
                }

                currentGroup = [condition]
            } else {
                // AND - add to current group
                currentGroup.push(condition)
            }
        })

        // Push last group
        if (currentGroup.length > 0) {
            groups.push(currentGroup)
        }

        return groups
    }, [conditions])

    if (fields.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Typography color="text.secondary">No fields available for filtering</Typography>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            {/* Header */}
            <CardHeader
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            component="i"
                            className="tabler-filter"
                            sx={{ color: 'primary.main', fontSize: '1.25rem' }}
                        />
                        <Typography variant="subtitle1" fontWeight={500}>
                            {title}
                        </Typography>
                    </Box>
                }
            />
            <Divider />

            {/* Filter Content */}
            <CardContent>

                {/* Column Headers */}
                <Box
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
                        gap: 1,
                        mb: 1
                    }}
                >
                    <Typography variant="caption" sx={{ minWidth: 140, color: 'text.secondary' }}>
                        Field
                    </Typography>
                    <Typography variant="caption" sx={{ minWidth: 150, color: 'text.secondary' }}>
                        Operator
                    </Typography>
                    <Typography variant="caption" sx={{ flex: 1, minWidth: 200, color: 'text.secondary' }}>
                        Value
                    </Typography>
                </Box>

                {/* Filter Rows - Grouped by AND/OR */}
                <Box sx={{ pt: 1 }}>
                    {groupedConditions.map((group, groupIndex) => (
                        <Box key={`group-${groupIndex}`}>
                            {/* OR separator between groups */}
                            {groupIndex > 0 && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        py: 1.5,
                                        gap: 2
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 0.5,
                                            bgcolor: 'warning.main',
                                            color: 'warning.contrastText',
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        OR
                                    </Box>
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                                </Box>
                            )}

                            {/* AND Group Container - with left border for visual grouping */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    pl: group.length > 1 ? { xs: 1.5, sm: 3 } : 0,
                                    ml: group.length > 1 ? { xs: 0.5, sm: 1 } : 0,
                                    '&::before': group.length > 1 ? {
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        top: 8,
                                        bottom: 8,
                                        width: '3px',
                                        bgcolor: 'primary.main',
                                        borderRadius: '4px'
                                    } : {}
                                }}
                            >
                                {group.map((condition, indexInGroup) => {
                                    // Find global index
                                    const globalIndex = conditions.findIndex(c => c.id === condition.id)
                                    const isLastGlobal = globalIndex === conditions.length - 1

                                    // Show Or button only on the last row globally
                                    const showOrButton = isLastGlobal

                                    return (
                                        <Box key={condition.id}>
                                            {/* AND label between conditions in same group */}
                                            {indexInGroup > 0 && (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        py: 0.5,
                                                        pl: 0
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            px: 1.5,
                                                            py: 0.25,
                                                            bgcolor: 'action.selected',
                                                            borderRadius: 0.5,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        AND
                                                    </Box>
                                                </Box>
                                            )}
                                            <FilterRow
                                                condition={condition}
                                                fields={fields}
                                                showOrButton={showOrButton}
                                                onChange={handleConditionChange}
                                                onRemove={handleRemoveCondition}
                                                onAddAfter={handleAddCondition}
                                                canRemove={conditions.length > 1}
                                            />
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    ))}
                </Box>

                {/* Expression Preview */}
                {currentDslQuery && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                            Expression Preview
                        </Typography>
                        <Box
                            sx={{
                                p: 1.5,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.875rem'
                            }}
                        >
                            {currentDslQuery}
                        </Box>
                    </Box>
                )}

                {/* Search and Reset Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" size="small" onClick={handleReset} startIcon={<i className="tabler-refresh" />}>
                        Reset
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSearch}
                        startIcon={<i className="tabler-search" />}
                        color="primary"
                    >
                        Search
                    </Button>
                </Box>
            </CardContent>
        </Card>
    )
}
