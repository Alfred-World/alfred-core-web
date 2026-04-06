'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as v from 'valibot'

import {
  getGetApiV1UnitsCountsByCategoryQueryKey,
  getGetApiV1UnitsCountsByStatusQueryKey,
  getGetApiV1UnitsQueryKey,
  getGetApiV1UnitsTreeQueryKey,
  useGetApiV1Units,
  useGetApiV1UnitsId,
  usePostApiV1Units,
  usePatchApiV1UnitsId
} from '@generated/core-api'
import type { UnitDto } from '@generated/core-api'
import { getChangedFields } from '@/utils/getChangedFields'
import { UNIT_CATEGORIES, UNIT_CATEGORY_META, UNIT_STATUSES, UNIT_STATUS_META } from '@/constants/unitType'

// ─── Validation Schema ─────────────────────────────────────────────────────────
const unitSchema = v.object({
  code: v.pipe(v.string(), v.nonEmpty('Code is required'), v.maxLength(50)),
  name: v.pipe(v.string(), v.nonEmpty('Name is required'), v.maxLength(255)),
  symbol: v.optional(v.pipe(v.string(), v.maxLength(20))),
  category: v.picklist(UNIT_CATEGORIES, 'Category is required'),
  baseUnitId: v.optional(v.string()),
  conversionRate: v.pipe(v.number(), v.minValue(0, 'Rate must be positive')),
  status: v.picklist(UNIT_STATUSES, 'Status is required'),
  description: v.optional(v.pipe(v.string(), v.maxLength(500)))
})

type UnitFormData = v.InferOutput<typeof unitSchema>

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UnitEditorDialogProps {
  open: boolean
  unitId?: string
  onClose: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────
const UnitEditorDialog = ({ open, unitId, onClose }: UnitEditorDialogProps) => {
  const queryClient = useQueryClient()
  const isEditMode = Boolean(unitId)

  // Fetch unit data for editing
  const { data: unitData, isLoading: loadingUnit } = useGetApiV1UnitsId(unitId!, {
    query: { enabled: isEditMode && open }
  })

  // Fetch all units for base unit selector
  const { data: allUnitsData } = useGetApiV1Units({ pageSize: 200 }, { query: { enabled: open } })
  const allUnits = useMemo(() => allUnitsData?.result?.items ?? [], [allUnitsData])

  const unit = unitData?.result

  // Form
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<UnitFormData>({
    resolver: valibotResolver(unitSchema),
    defaultValues: {
      code: '',
      name: '',
      symbol: '',
      category: 'Weight',
      baseUnitId: '',
      conversionRate: 1,
      status: 'Active',
      description: ''
    }
  })

  const selectedCategory = watch('category')
  const selectedBaseUnitId = watch('baseUnitId')

  // Filter base units to same category, excluding self
  const baseUnitOptions = useMemo(
    () => allUnits.filter((u: UnitDto) => u.category === selectedCategory && u.id !== unitId),
    [allUnits, selectedCategory, unitId]
  )

  // Reset form when unit data loads
  useEffect(() => {
    if (isEditMode && unit) {
      reset({
        code: unit.code ?? '',
        name: unit.name ?? '',
        symbol: unit.symbol ?? '',
        category: unit.category ?? 'Weight',
        baseUnitId: unit.baseUnitId ?? '',
        conversionRate: unit.conversionRate ?? 1,
        status: unit.status ?? 'Active',
        description: unit.description ?? ''
      })
    } else if (!isEditMode && open) {
      reset({
        code: '',
        name: '',
        symbol: '',
        category: 'Weight',
        baseUnitId: '',
        conversionRate: 1,
        status: 'Active',
        description: ''
      })
    }
  }, [isEditMode, unit, open, reset])

  // Mutations
  const { mutateAsync: createUnit } = usePostApiV1Units()
  const { mutateAsync: updateUnit } = usePatchApiV1UnitsId()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsTreeQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsCountsByStatusQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsCountsByCategoryQueryKey() })
  }

  const onSubmit = async (data: UnitFormData) => {
    const payload = {
      code: data.code,
      name: data.name,
      symbol: data.symbol || null,
      category: data.category,
      baseUnitId: data.baseUnitId || null,
      conversionRate: data.conversionRate,
      status: data.status,
      description: data.description || null
    }

    if (isEditMode) {
      const original = {
        code: unit?.code ?? '',
        name: unit?.name ?? '',
        symbol: unit?.symbol ?? null,
        category: unit?.category ?? 'Weight',
        baseUnitId: unit?.baseUnitId ?? null,
        conversionRate: unit?.conversionRate ?? 1,
        status: unit?.status ?? 'Active',
        description: unit?.description ?? null
      }

      const changes = getChangedFields(original as Record<string, unknown>, payload as Record<string, unknown>)

      if (changes) {
        await updateUnit({ id: unitId!, data: changes })
      }
    } else {
      await createUnit({ data: payload })
    }

    invalidateAll()
    onClose()
  }

  const isBaseUnit = !selectedBaseUnitId

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className={isEditMode ? 'tabler-edit' : 'tabler-plus'} style={{ fontSize: 22 }} />
          {isEditMode ? 'Edit Unit' : 'Create Unit'}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loadingUnit && isEditMode ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2.5} sx={{ pt: 1 }}>
            {/* Code */}
            <Grid size={{ xs: 4 }}>
              <Controller
                name='code'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label='Code'
                    required
                    fullWidth
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                  />
                )}
              />
            </Grid>

            {/* Name */}
            <Grid size={{ xs: 8 }}>
              <Controller
                name='name'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label='Name'
                    required
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            {/* Symbol */}
            <Grid size={{ xs: 4 }}>
              <Controller
                name='symbol'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label='Symbol'
                    fullWidth
                    placeholder='e.g. g, kg, m'
                    error={!!errors.symbol}
                    helperText={errors.symbol?.message}
                  />
                )}
              />
            </Grid>

            {/* Category */}
            <Grid size={{ xs: 8 }}>
              <Controller
                name='category'
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.category}>
                    <InputLabel>Category</InputLabel>
                    <Select {...field} label='Category'>
                      {UNIT_CATEGORIES.map(cat => {
                        const meta = UNIT_CATEGORY_META[cat]

                        return (
                          <MenuItem key={cat} value={cat}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className={meta.icon} style={{ fontSize: 16, color: meta.color }} />
                              {meta.label}
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                    {errors.category && <FormHelperText>{errors.category.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Base Unit */}
            <Grid size={{ xs: 8 }}>
              <Controller
                name='baseUnitId'
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Base Unit</InputLabel>
                    <Select {...field} label='Base Unit'>
                      <MenuItem value=''>
                        <em>None (This is a base unit)</em>
                      </MenuItem>
                      {baseUnitOptions.map((u: UnitDto) => (
                        <MenuItem key={u.id} value={u.id!}>
                          {u.name} ({u.code})
                          {!u.baseUnitId && (
                            <Chip label='BASE' size='small' color='primary' sx={{ ml: 1, height: 18, fontSize: 10 }} />
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {isBaseUnit ? 'This unit will be a base unit' : 'Conversion rate is relative to this base unit'}
                    </FormHelperText>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Conversion Rate */}
            <Grid size={{ xs: 4 }}>
              <Controller
                name='conversionRate'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    label='Conversion Rate'
                    type='number'
                    fullWidth
                    disabled={isBaseUnit}
                    error={!!errors.conversionRate}
                    helperText={errors.conversionRate?.message}
                    slotProps={{ htmlInput: { step: 'any', min: 0 } }}
                  />
                )}
              />
            </Grid>

            {/* Status */}
            <Grid size={{ xs: 6 }}>
              <Controller
                name='status'
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.status}>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label='Status'>
                      {UNIT_STATUSES.map(status => {
                        const meta = UNIT_STATUS_META[status]

                        return (
                          <MenuItem key={status} value={status}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className={meta.icon} style={{ fontSize: 16 }} />
                              {meta.label}
                            </Box>
                          </MenuItem>
                        )
                      })}
                    </Select>
                    {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name='description'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label='Description'
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            {/* Info banner for base unit */}
            {isBaseUnit && (
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'primary.lighter',
                    border: 1,
                    borderColor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <i
                    className='tabler-info-circle'
                    style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }}
                  />
                  <Typography variant='caption' color='primary.main'>
                    Base units serve as the reference point for conversions. Other units in the same category can
                    reference this as their base.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || (isEditMode && loadingUnit)}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UnitEditorDialog
