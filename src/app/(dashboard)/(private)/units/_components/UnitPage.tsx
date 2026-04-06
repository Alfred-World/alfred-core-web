'use client'

import { useMemo, useState, useEffect } from 'react'

import { toast } from 'react-toastify'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useGetApiV1UnitsCountsByCategory, useGetApiV1UnitsCountsByStatus } from '@generated/core-api'
import type { ApiErrorResponse } from '@generated/core-api'
import type { UnitCategoryValue } from '@/constants/unitType'

import StatsCards from './StatsCards'
import UnitTable from './UnitTable'
import QuickConvert from './QuickConvert'
import BaseUnitTree from './BaseUnitTree'
import UnitEditorDialog from './UnitEditorDialog'

// ─── Component ─────────────────────────────────────────────────────────────────
const UnitPage = () => {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<UnitCategoryValue | ''>('')

  // Counts data for stats cards
  const { data: statusCounts, isError: isStatusError, error: statusError } = useGetApiV1UnitsCountsByStatus()
  const { data: categoryCounts, isError: isCategoryError, error: categoryError } = useGetApiV1UnitsCountsByCategory()

  const stats = useMemo(() => {
    const statusItems = statusCounts?.result ?? []
    const categoryItems = categoryCounts?.result ?? []

    const total = statusItems.reduce((sum, item) => sum + (item.count ?? 0), 0)
    const active = statusItems.find(i => i.status === 'Active')?.count ?? 0
    const review = statusItems.find(i => i.status === 'Review')?.count ?? 0
    const categoryCount = categoryItems.filter(i => (i.count ?? 0) > 0).length

    return { total, active, review, categoryCount }
  }, [statusCounts, categoryCounts])

  const apiErrorMessage = useMemo(() => {
    const error = statusError || categoryError

    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    const apiError = error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load measurement units'
  }, [statusError, categoryError])

  // ─── Error handling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isStatusError || isCategoryError) {
      toast.error(apiErrorMessage || 'Failed to load measurement units')
    }
  }, [isStatusError, isCategoryError, apiErrorMessage])

  const handleCreateNew = () => {
    setEditingUnitId(undefined)
    setEditorOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingUnitId(id)
    setEditorOpen(true)
  }

  const handleEditorClose = () => {
    setEditorOpen(false)
    setEditingUnitId(undefined)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant='h4' fontWeight={700}>
          Measurement Units
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Manage global conversion standards
        </Typography>
      </Box>

      {/* Stats Cards */}
      <StatsCards total={stats.total} active={stats.active} review={stats.review} categoryCount={stats.categoryCount} />

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Unit Table (Left) */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <UnitTable
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
          />
        </Box>

        {/* Sidebar Widgets (Right) */}
        <Box sx={{ width: 340, minWidth: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <QuickConvert />
          <BaseUnitTree categoryFilter={categoryFilter || undefined} />
        </Box>
      </Box>

      {/* Editor Dialog */}
      <UnitEditorDialog open={editorOpen} unitId={editingUnitId} onClose={handleEditorClose} />
    </Box>
  )
}

export default UnitPage
