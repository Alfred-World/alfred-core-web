'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as v from 'valibot'

import {
  getGetApiV1AssetsQueryKey,
  getGetApiV1AssetsAssetIdLogsQueryKey,
  getGetApiV1AttachmentsQueryKey,
  useGetApiV1AssetsId,
  useGetApiV1AssetsAssetIdLogs,
  usePostApiV1AssetsAssetIdLogs,
  useDeleteApiV1AssetsAssetIdLogsLogId,
  useGetApiV1Brands,
  useGetApiV1CategoriesId,
  useGetApiV1CategoriesTree,
  usePostApiV1Assets,
  usePatchApiV1AssetsId,
  useGetApiV1Attachments,
  usePostApiV1Attachments,
  useDeleteApiV1AttachmentsId,
  CategoryType,
  AssetLogEventType,
  AssetStatus
} from '@generated/core-api'
import type { AttachmentDto, CategoryTreeNodeDto, UpdateAssetRequest } from '@generated/core-api'
import { getChangedFields } from '@/utils/getChangedFields'

// ─── Types for category form schema ───────────────────────────────────────────
interface SchemaField {
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'image'
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
}

// ─── Asset statuses ────────────────────────────────────────────────────────────
const ASSET_STATUSES = ['Active', 'Sold', 'Broken', 'Discarded'] as const

const EVENT_TYPES = [
  { value: AssetLogEventType.Maintain, label: 'Maintenance', icon: 'tabler-settings-2', color: '#4caf50' },
  { value: AssetLogEventType.Repair, label: 'Repair', icon: 'tabler-tool', color: '#ff9800' },
  { value: AssetLogEventType.Refill, label: 'Refill', icon: 'tabler-gas-station', color: '#2196f3' }
] as const

const getEventMeta = (eventType?: string) => EVENT_TYPES.find(e => e.value === eventType) ?? EVENT_TYPES[0]

// ─── Validation ────────────────────────────────────────────────────────────────
const assetSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty('Name is required'), v.maxLength(255)),
  categoryId: v.optional(v.string()),
  brandId: v.optional(v.string()),
  purchaseDate: v.optional(v.string()),
  initialCost: v.pipe(v.number(), v.minValue(0, 'Cost must be >= 0')),
  warrantyExpiryDate: v.optional(v.string()),
  status: v.picklist(ASSET_STATUSES, 'Invalid status'),
  location: v.optional(v.pipe(v.string(), v.maxLength(100)))
})

type AssetFormData = v.InferOutput<typeof assetSchema>

// ─── Flatten tree helper ───────────────────────────────────────────────────────
const flattenTree = (nodes: CategoryTreeNodeDto[], depth = 0): Array<CategoryTreeNodeDto & { depth: number }> => {
  return nodes.map(node => ({ ...node, depth }))
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface AssetEditorProps {
  assetId?: string
}

const AssetEditor = ({ assetId }: AssetEditorProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(assetId)

  // Dynamic specs state (separate from react-hook-form)
  const [specsValues, setSpecsValues] = useState<Record<string, unknown>>({})
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()

  // Asset Log state
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  const [logForm, setLogForm] = useState({
    eventType: AssetLogEventType.Maintain,
    performedAt: new Date().toISOString().split('T')[0],
    cost: 0,
    quantity: 1,
    note: '',
    nextDueDate: ''
  })

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false)

  const [previewItem, setPreviewItem] = useState<{
    fileName?: string
    downloadUrl?: string
    contentType?: string
  } | null>(null)

  const handleOpenPreview = (item: { fileName?: string; downloadUrl?: string; contentType?: string }) => {
    setPreviewItem(item)
    setPreviewOpen(true)
  }

  // Fetch categories (Asset type)
  const { data: categoryTreeData } = useGetApiV1CategoriesTree({ type: CategoryType.Asset, pageSize: 200 })

  const categories = useMemo(
    () => (categoryTreeData?.result?.items ? flattenTree(categoryTreeData.result.items) : []),
    [categoryTreeData]
  )

  // Fetch selected category details (for formSchema)
  const { data: categoryDetailData } = useGetApiV1CategoriesId(selectedCategoryId!, {
    query: { enabled: Boolean(selectedCategoryId) }
  })

  const schemaFields: SchemaField[] = useMemo(() => {
    if (!categoryDetailData?.result?.formSchema) return []

    try {
      return JSON.parse(categoryDetailData.result.formSchema)
    } catch {
      return []
    }
  }, [categoryDetailData])

  // Fetch brands
  const { data: brandsData } = useGetApiV1Brands({ pageSize: 200, sort: 'name' })
  const brands = useMemo(() => brandsData?.result?.items ?? [], [brandsData])

  // Lazy-load logs tab state
  const [showLogs, setShowLogs] = useState(false)

  // Fetch existing asset for edit mode (with caching)
  const { data: assetData } = useGetApiV1AssetsId(assetId!, {
    query: { enabled: isEditMode, staleTime: 5 * 60 * 1000 } // 5 min cache
  })

  const asset = assetData?.result

  // Mutations
  const createMutation = usePostApiV1Assets()
  const updateMutation = usePatchApiV1AssetsId()

  // Attachment hooks (with caching)
  const attachmentParams = { targetId: assetId ?? '', targetType: 'Asset' }

  const { data: attachmentsData } = useGetApiV1Attachments(attachmentParams, {
    query: { enabled: isEditMode && !!assetId, staleTime: 5 * 60 * 1000 }
  })

  const allAttachments = useMemo(() => attachmentsData?.result ?? [], [attachmentsData])

  const primaryImage = useMemo(() => allAttachments.find(a => a.purpose === 'PrimaryImage') ?? null, [allAttachments])

  const attachments = useMemo(() => allAttachments.filter(a => a.purpose !== 'PrimaryImage'), [allAttachments])

  const uploadAttachment = usePostApiV1Attachments()
  const deleteAttachment = useDeleteApiV1AttachmentsId()

  // Asset Log hooks (lazy-loaded only when timeline is visible)
  const { data: logsData, isLoading: logsLoading } = useGetApiV1AssetsAssetIdLogs(
    assetId ?? '',
    { pageSize: 50, sort: '-performedAt' },
    { query: { enabled: isEditMode && !!assetId && showLogs, staleTime: 3 * 60 * 1000 } }
  )

  const logs = useMemo(() => logsData?.result?.items ?? [], [logsData])
  const createLogMutation = usePostApiV1AssetsAssetIdLogs()
  const deleteLogMutation = useDeleteApiV1AssetsAssetIdLogsLogId()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<AssetFormData>({
    resolver: valibotResolver(assetSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      brandId: '',
      purchaseDate: '',
      initialCost: 0,
      warrantyExpiryDate: '',
      status: 'Active',
      location: ''
    }
  })

  // Populate form when asset data loads
  useEffect(() => {
    if (asset) {
      reset({
        name: asset.name ?? '',
        categoryId: asset.categoryId ?? '',
        brandId: asset.brandId ?? '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        initialCost: asset.initialCost ?? 0,
        warrantyExpiryDate: asset.warrantyExpiryDate ? asset.warrantyExpiryDate.split('T')[0] : '',
        status: (asset.status as (typeof ASSET_STATUSES)[number]) ?? 'Active',
        location: asset.location ?? ''
      })
      setSelectedCategoryId(asset.categoryId ?? undefined)

      // Parse specs into values
      try {
        const parsed = JSON.parse(asset.specs ?? '{}')

        setSpecsValues(parsed)
      } catch {
        setSpecsValues({})
      }
    }
  }, [asset, reset])

  // Handle category change — sync spec values
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId || undefined)
      setValue('categoryId', categoryId)

      // Reset specs when category changes (unless editing)
      if (!isEditMode) {
        setSpecsValues({})
      }
    },
    [isEditMode, setValue]
  )

  const updateSpecValue = useCallback((label: string, value: unknown) => {
    setSpecsValues(prev => ({ ...prev, [label]: value }))
  }, [])

  const onSubmit = async (data: AssetFormData) => {
    const specs = JSON.stringify(specsValues)

    try {
      if (isEditMode && assetId) {
        const current: UpdateAssetRequest = {
          name: data.name,
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          purchaseDate: data.purchaseDate || null,
          initialCost: data.initialCost,
          warrantyExpiryDate: data.warrantyExpiryDate || null,
          specs,
          status: data.status as AssetStatus,
          location: data.location || undefined
        }

        const original: UpdateAssetRequest = {
          name: asset?.name ?? '',
          categoryId: asset?.categoryId ?? null,
          brandId: asset?.brandId ?? null,
          purchaseDate: asset?.purchaseDate ? asset.purchaseDate.split('T')[0] : null,
          initialCost: asset?.initialCost ?? 0,
          warrantyExpiryDate: asset?.warrantyExpiryDate ? asset.warrantyExpiryDate.split('T')[0] : null,
          specs: asset?.specs ?? '{}',
          status: (asset?.status as AssetStatus) ?? AssetStatus.Active,
          location: asset?.location ?? undefined
        }

        const changes = getChangedFields(original, current)

        if (!changes) return

        await updateMutation.mutateAsync({ id: assetId, data: changes })
      } else {
        await createMutation.mutateAsync({
          data: {
            name: data.name,
            categoryId: data.categoryId || null,
            brandId: data.brandId || null,
            purchaseDate: data.purchaseDate || null,
            initialCost: data.initialCost,
            warrantyExpiryDate: data.warrantyExpiryDate || null,
            specs,
            status: data.status,
            location: data.location || null
          }
        })
      }

      await queryClient.invalidateQueries({ queryKey: getGetApiV1AssetsQueryKey() })
      router.push('/assets')
    } catch {
      // Error handled by React Query
    }
  }

  // ─── Asset Log handlers ───────────────────────────────────────────────────────
  const handleCreateLog = async () => {
    if (!assetId) return

    try {
      await createLogMutation.mutateAsync({
        assetId,
        data: {
          eventType: logForm.eventType,
          performedAt: logForm.performedAt,
          cost: logForm.cost,
          quantity: logForm.quantity,
          note: logForm.note || null,
          nextDueDate: logForm.nextDueDate || null
        }
      })

      await queryClient.invalidateQueries({
        queryKey: getGetApiV1AssetsAssetIdLogsQueryKey(assetId)
      })
      setLogDialogOpen(false)
      setLogForm({
        eventType: AssetLogEventType.Maintain,
        performedAt: new Date().toISOString().split('T')[0],
        cost: 0,
        quantity: 1,
        note: '',
        nextDueDate: ''
      })
    } catch {
      /* handled by React Query */
    }
  }

  const handleDeleteLog = async (logId: string) => {
    if (!assetId) return

    try {
      await deleteLogMutation.mutateAsync({ assetId, logId })

      await queryClient.invalidateQueries({
        queryKey: getGetApiV1AssetsAssetIdLogsQueryKey(assetId)
      })
    } catch {
      /* handled by React Query */
    }
  }

  // ─── File upload handler ──────────────────────────────────────────────────────
  const invalidateAttachments = useCallback(() => {
    if (assetId) {
      queryClient.invalidateQueries({
        queryKey: getGetApiV1AttachmentsQueryKey({ targetId: assetId, targetType: 'Asset' })
      })
    }
  }, [assetId, queryClient])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file || !assetId) return
    setImageUploading(true)

    try {
      // Delete old primary image if exists
      if (primaryImage?.id) {
        try {
          await deleteAttachment.mutateAsync({ id: primaryImage.id })
        } catch {
          console.warn('Failed to delete old primary image')
        }
      }

      // Upload new primary image
      await uploadAttachment.mutateAsync({
        data: {
          file: file as Blob,
          targetId: assetId,
          targetType: 'Asset',
          purpose: 'PrimaryImage'
        }
      })

      invalidateAttachments()
    } catch (err) {
      console.error('Image upload failed:', err)
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (primaryImage?.id) {
      try {
        await deleteAttachment.mutateAsync({ id: primaryImage.id })
        invalidateAttachments()
      } catch {
        /* ignore */
      }
    }
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])

    if (!files.length || !assetId) return
    setAttachmentUploading(true)

    try {
      await Promise.all(
        files.map(file =>
          uploadAttachment.mutateAsync({
            data: {
              file: file as Blob,
              targetId: assetId,
              targetType: 'Asset',
              purpose: 'Attachment'
            }
          })
        )
      )

      invalidateAttachments()
    } catch (err) {
      console.error('Attachment upload failed:', err)
    } finally {
      setAttachmentUploading(false)
      if (attachmentInputRef.current) attachmentInputRef.current.value = ''
    }
  }

  const handleAttachmentDelete = async (item: AttachmentDto) => {
    if (!item.id) return

    try {
      await deleteAttachment.mutateAsync({ id: item.id })
      invalidateAttachments()
    } catch {
      /* ignore */
    }
  }

  // ─── Render a dynamic spec field ──────────────────────────────────────────────
  const renderSpecField = (field: SchemaField, index: number) => {
    const key = field.label

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={index}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            size='small'
            fullWidth
            value={(specsValues[key] as string) ?? ''}
            onChange={e => updateSpecValue(key, e.target.value)}
          />
        )

      case 'number':
        return (
          <TextField
            key={index}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            type='number'
            size='small'
            fullWidth
            value={(specsValues[key] as string) ?? ''}
            onChange={e => updateSpecValue(key, e.target.value)}
          />
        )

      case 'date':
        return (
          <TextField
            key={index}
            label={field.label}
            required={field.required}
            type='date'
            size='small'
            fullWidth
            value={(specsValues[key] as string) ?? ''}
            onChange={e => updateSpecValue(key, e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )

      case 'dropdown':
        return (
          <FormControl key={index} fullWidth size='small' required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              label={field.label}
              value={(specsValues[key] as string) ?? ''}
              onChange={e => updateSpecValue(key, e.target.value)}
            >
              {(field.options ?? []).map(opt => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )

      case 'checkbox':
        return (
          <FormControlLabel
            key={index}
            control={<Checkbox checked={!!specsValues[key]} onChange={e => updateSpecValue(key, e.target.checked)} />}
            label={
              <Typography variant='body2'>
                {field.label}
                {field.required && <span style={{ color: '#F50057' }}> *</span>}
              </Typography>
            }
          />
        )

      case 'image':
        return (
          <Box key={index}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              {field.label}
              {field.required && <span style={{ color: '#F50057' }}> *</span>}
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              <i className='tabler-cloud-upload' style={{ fontSize: 28, opacity: 0.4 }} />
              <Typography variant='caption' display='block' color='text.secondary' sx={{ mt: 0.5 }}>
                Click or drag to upload
              </Typography>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  // ─── Computed helpers ──────────────────────────────────────────────────────────
  const purchaseDate = watch('purchaseDate')

  const daysInUse = useMemo(() => {
    if (!purchaseDate) return null
    const diff = Date.now() - new Date(purchaseDate).getTime()

    return Math.floor(diff / 86_400_000)
  }, [purchaseDate])

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' }, transition: 'color 0.15s' }}
            onClick={() => router.push('/')}
          >
            Dashboard
          </Typography>
          <i className='tabler-chevron-right' style={{ fontSize: 13, opacity: 0.4 }} />
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' }, transition: 'color 0.15s' }}
            onClick={() => router.push('/assets')}
          >
            Assets
          </Typography>
          <i className='tabler-chevron-right' style={{ fontSize: 13, opacity: 0.4 }} />
          <Typography variant='body2'>{isEditMode ? `Edit: ${asset?.name ?? ''}` : 'New Asset'}</Typography>
        </Box>

        {/* ── Header: inline name + meta + actions ─────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 4,
            mb: 4
          }}
        >
          {/* Left: name + meta */}
          <Box sx={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Asset Name
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Controller
                  name='name'
                  control={control}
                  render={({ field }) => (
                    <Box
                      component='input'
                      {...field}
                      placeholder='Enter asset name…'
                      sx={{
                        fontSize: { xs: '1.5rem', md: '1.875rem' },
                        fontWeight: 900,
                        color: 'text.primary',
                        bgcolor: 'transparent',
                        border: 0,
                        borderBottom: '1px dashed',
                        borderColor: errors.name ? 'error.main' : 'divider',
                        outline: 'none',
                        px: 0,
                        width: '100%',
                        maxWidth: 500,
                        fontFamily: 'inherit',
                        '&:focus': { borderColor: 'primary.main' }
                      }}
                    />
                  )}
                />
                <i className='tabler-pencil' style={{ fontSize: 22, opacity: 0.4, flexShrink: 0 }} />
              </Box>
              {errors.name && (
                <Typography variant='caption' color='error'>
                  {errors.name.message}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right: action buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, alignSelf: 'flex-start', mt: { xs: 0, md: 1 } }}>
            <Button
              variant='outlined'
              onClick={() => router.push('/assets')}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <i className='tabler-loader-2 animate-spin' style={{ fontSize: 18 }} />
                ) : (
                  <i className='tabler-device-floppy' style={{ fontSize: 18 }} />
                )
              }
              sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </Box>
        </Box>

        {/* ── Basic Attributes Card ──────────────────────────────────────────── */}
        <Card sx={{ borderRadius: 3, mb: 4, p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <i className='tabler-settings' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='h6' fontWeight={700}>
              Basic Attributes
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {/* Location */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 1 }}>
                  Location
                </Typography>
                <Controller
                  name='location'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder='e.g. Office'
                      size='small'
                      fullWidth
                      sx={{ '.MuiInputBase-root': { fontSize: '0.875rem' } }}
                    />
                  )}
                />
              </Box>
            </Grid>

            {/* Status */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 1 }}>
                  Status
                </Typography>
                <Controller
                  name='status'
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size='small' fullWidth sx={{ fontSize: '0.875rem' }}>
                      {ASSET_STATUSES.map(s => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </Box>
            </Grid>

            {/* Brand */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 1 }}>
                  Brand
                </Typography>
                <Controller
                  name='brandId'
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      size='small'
                      options={brands}
                      getOptionLabel={opt => opt.name ?? ''}
                      value={brands.find(b => b.id === field.value) ?? null}
                      onChange={(_, val) => field.onChange(val?.id ?? '')}
                      fullWidth
                      noOptionsText='No brands found'
                      renderInput={params => (
                        <TextField
                          {...params}
                          placeholder='Select brand'
                          sx={{ '.MuiInputBase-root': { fontSize: '0.875rem' } }}
                        />
                      )}
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>
        </Card>

        {/* ── Category Card with Searchable Autocomplete ──────────────────────── */}
        <Card sx={{ borderRadius: 3, mb: 4, p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <i className='tabler-folder-open' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='h6' fontWeight={700}>
              Category
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
              Select and manage asset category
            </Typography>
          </Box>

          <Controller
            name='categoryId'
            control={control}
            render={({ field }) => (
              <Autocomplete
                value={categories.find(c => c.id === field.value) ?? null}
                onChange={(_, value) => handleCategoryChange(value?.id ?? '')}
                options={categories}
                getOptionLabel={opt => opt.name ?? ''}
                noOptionsText='No categories found'
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                slotProps={{
                  paper: {
                    sx: { maxHeight: 350 }
                  }
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props

                  return (
                    <Box
                      component='li'
                      key={key}
                      {...rest}
                      sx={{
                        pl: `${option.depth! * 20 + 16}px !important`,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            opacity: 0.6
                          }}
                        />
                        <Typography variant='body2'>{option.name}</Typography>
                      </Box>
                    </Box>
                  )
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder='Search category…'
                    size='small'
                    fullWidth
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position='start'>
                            <i className='tabler-search' style={{ fontSize: 16, opacity: 0.5 }} />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                )}
              />
            )}
          />

          {/* Category Info */}
          {selectedCategoryId && categoryDetailData?.result && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                bgcolor: 'action.hover',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <i className='tabler-info-circle' style={{ fontSize: 16, opacity: 0.6 }} />
                <Typography variant='caption' fontWeight={600} color='text.secondary'>
                  Selected Category Details
                </Typography>
              </Box>
              <Typography variant='body2' color='text.primary' sx={{ fontWeight: 600, mb: 1 }}>
                {categoryDetailData.result.name}
              </Typography>
              {schemaFields.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Custom Fields ({schemaFields.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {schemaFields.slice(0, 5).map((field, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          fontSize: '0.7rem',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 600
                        }}
                      >
                        {field.label}
                      </Box>
                    ))}
                    {schemaFields.length > 5 && (
                      <Box
                        sx={{
                          fontSize: '0.7rem',
                          bgcolor: 'action.selected',
                          color: 'text.secondary',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 600
                        }}
                      >
                        +{schemaFields.length - 5} more
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Card>

        {/* ── 3 KPI Cards ──────────────────────────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Initial Cost */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', right: 8, top: 8, opacity: 0.07, pointerEvents: 'none' }}>
                <i className='tabler-coin' style={{ fontSize: 80, color: 'var(--mui-palette-primary-main)' }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={500}>
                  Initial Cost
                </Typography>
                <Controller
                  name='initialCost'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      type='number'
                      size='small'
                      fullWidth
                      error={!!errors.initialCost}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position='start'>$</InputAdornment>
                        }
                      }}
                      sx={{ '.MuiInputBase-input': { fontWeight: 700, fontSize: '1.1rem' } }}
                    />
                  )}
                />
              </Box>
            </Card>
          </Grid>

          {/* Purchase Date (In Use Since) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', right: 8, top: 8, opacity: 0.07, pointerEvents: 'none' }}>
                <i className='tabler-clock' style={{ fontSize: 80, color: 'var(--mui-palette-primary-main)' }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={500}>
                  In Use Since
                </Typography>
                <Controller
                  name='purchaseDate'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type='date'
                      size='small'
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
                <Typography variant='caption' color='text.secondary'>
                  Calculated:{' '}
                  <Box component='span' fontWeight={700} color='text.primary'>
                    {daysInUse !== null ? `${daysInUse} Days` : '—'}
                  </Box>
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Warranty */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ p: 3, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', right: 8, top: 8, opacity: 0.07, pointerEvents: 'none' }}>
                <i className='tabler-shield-check' style={{ fontSize: 80, color: 'var(--mui-palette-primary-main)' }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={500}>
                  Warranty Status
                </Typography>
                <Controller
                  name='status'
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size='small' fullWidth>
                      {ASSET_STATUSES.map(s => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
                    Expires:
                  </Typography>
                  <Controller
                    name='warrantyExpiryDate'
                    control={control}
                    render={({ field }) => (
                      <Box
                        component='input'
                        {...field}
                        type='date'
                        sx={{
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          bgcolor: 'transparent',
                          border: 0,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          outline: 'none',
                          pb: 0.25,
                          flexGrow: 1,
                          fontFamily: 'inherit',
                          '&:focus': { borderColor: 'primary.main' }
                        }}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* ── Main 5 + 7 grid ──────────────────────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 4 }} alignItems='flex-start'>
          {/* Left: Technical Specifications */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: '12px 12px 0 0'
                }}
              >
                <Typography variant='h6' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-settings' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
                  Technical Specifications
                </Typography>
              </Box>

              {/* Spec fields */}
              <Box sx={{ p: 3, flexGrow: 1 }}>
                {schemaFields.length > 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '35% 1fr',
                      gap: '14px 12px',
                      alignItems: 'center'
                    }}
                  >
                    {schemaFields.map((field, index) => (
                      <Box key={index} sx={{ display: 'contents' }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}
                        >
                          {field.label}
                        </Typography>
                        <Box>{renderSpecField(field, index)}</Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <i className='tabler-adjustments' style={{ fontSize: 40, opacity: 0.2 }} />
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
                      {selectedCategoryId
                        ? 'This category has no custom spec fields.'
                        : 'Select a category to load spec fields.'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Image upload */}
              <Box sx={{ p: 3, pt: 0 }}>
                <input ref={fileInputRef} type='file' accept='image/*' hidden onChange={handleImageUpload} />
                <Box
                  onClick={() => !imageUploading && isEditMode && fileInputRef.current?.click()}
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'border-color 0.15s',
                    opacity: isEditMode ? 1 : 0.5,
                    '&:hover': isEditMode
                      ? { borderColor: 'primary.main', cursor: imageUploading ? 'wait' : 'pointer' }
                      : {}
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {imageUploading ? (
                      <CircularProgress size={24} />
                    ) : primaryImage?.downloadUrl ? (
                      <Box
                        component='img'
                        src={primaryImage.downloadUrl}
                        alt='Primary'
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <i className='tabler-photo' style={{ fontSize: 28, opacity: 0.3 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant='body2' fontWeight={500}>
                      {!isEditMode ? 'Save first to upload' : primaryImage?.downloadUrl ? 'Primary Image' : 'No Image'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography
                        variant='caption'
                        color='primary'
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {primaryImage?.downloadUrl ? 'Change' : 'Upload'}
                      </Typography>
                      {primaryImage?.downloadUrl && (
                        <>
                          <Typography variant='caption' color='text.disabled'>
                            |
                          </Typography>
                          <Typography
                            variant='caption'
                            color='error'
                            onClick={e => {
                              e.stopPropagation()
                              handleRemoveImage()
                            }}
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          >
                            Remove
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Right: Timeline Editor */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: '12px 12px 0 0',
                  cursor: 'pointer'
                }}
                onClick={() => setShowLogs(!showLogs)}
              >
                <Typography variant='h6' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i
                    className={`tabler-chevron-${showLogs ? 'down' : 'right'}`}
                    style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)', transition: 'transform 0.2s' }}
                  />
                  <i className='tabler-history' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
                  Timeline Editor
                  {logs.length > 0 && (
                    <Box
                      component='span'
                      sx={{
                        ml: 1,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: 1,
                        px: 1,
                        py: 0.25,
                        lineHeight: 1.6
                      }}
                    >
                      {logs.length}
                    </Box>
                  )}
                </Typography>
                {isEditMode && (
                  <Button
                    variant='contained'
                    size='small'
                    onClick={e => {
                      e.stopPropagation()
                      setLogDialogOpen(true)
                    }}
                    startIcon={<i className='tabler-plus' style={{ fontSize: 14 }} />}
                    sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }}
                  >
                    Add Log Entry
                  </Button>
                )}
              </Box>

              {/* Timeline events - show only if expanded */}
              {showLogs && (
                <Box sx={{ p: 3, position: 'relative', flexGrow: 1, overflow: 'auto', maxHeight: 500 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Loading state */}
                    {logsLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                      </Box>
                    )}

                    {/* Log entries */}
                    {!logsLoading &&
                      logs.map(log => {
                        const meta = getEventMeta(log.eventType ?? undefined)

                        return (
                          <Box key={log.id} sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1 }}>
                            <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  bgcolor: `${meta.color}18`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <i className={meta.icon} style={{ fontSize: 15, color: meta.color }} />
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                flex: 1,
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'box-shadow 0.15s',
                                '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  mb: 0.5
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant='body2' fontWeight={700}>
                                    {meta.label}
                                  </Typography>
                                  <Box
                                    sx={{
                                      fontSize: '0.6rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      px: 0.75,
                                      py: 0.15,
                                      borderRadius: 0.75,
                                      letterSpacing: '0.05em',
                                      bgcolor: `${meta.color}18`,
                                      color: meta.color
                                    }}
                                  >
                                    {log.eventType}
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant='caption' color='text.secondary'>
                                    {log.performedAt
                                      ? new Date(log.performedAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })
                                      : ''}
                                  </Typography>
                                  <Tooltip title='Delete entry'>
                                    <IconButton
                                      size='small'
                                      onClick={() => log.id && handleDeleteLog(log.id)}
                                      sx={{ ml: 0.5, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                                    >
                                      <i className='tabler-trash' style={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              {log.note && (
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                                  {log.note}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {(log.cost ?? 0) > 0 && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Cost:{' '}
                                    <Box component='span' fontWeight={700} color='text.primary'>
                                      ${log.cost?.toLocaleString()}
                                    </Box>
                                  </Typography>
                                )}
                                {(log.quantity ?? 1) !== 1 && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Qty:{' '}
                                    <Box component='span' fontWeight={700} color='text.primary'>
                                      {log.quantity}
                                    </Box>
                                  </Typography>
                                )}
                                {(log.cost ?? 0) > 0 && (log.quantity ?? 1) > 1 && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Unit price:{' '}
                                    <Box component='span' fontWeight={700} color='text.primary'>
                                      $
                                      {((log.cost ?? 0) / (log.quantity ?? 1)).toLocaleString(undefined, {
                                        maximumFractionDigits: 2
                                      })}
                                    </Box>
                                  </Typography>
                                )}
                                {log.brandName && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Brand:{' '}
                                    <Box component='span' fontWeight={600}>
                                      {log.brandName}
                                    </Box>
                                  </Typography>
                                )}
                                {log.nextDueDate && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Next due:{' '}
                                    <Box component='span' fontWeight={600}>
                                      {new Date(log.nextDueDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </Box>
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        )
                      })}

                    {/* System event (locked) — only in edit mode */}
                    {isEditMode && asset && (
                      <Box sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1, opacity: 0.55 }}>
                        <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: 'action.selected',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className='tabler-lock' style={{ fontSize: 15, opacity: 0.6 }} />
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: 'action.hover',
                            borderRadius: 2,
                            p: 2,
                            border: '1px dashed',
                            borderColor: 'divider'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant='body2' fontWeight={700}>
                              Asset Registered in System
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {asset.createdAt
                                ? new Date(asset.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : ''}
                            </Typography>
                          </Box>
                          <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                            System Event — Cannot be modified.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Empty state */}
                    {!logsLoading && logs.length === 0 && !isEditMode && (
                      <Box sx={{ textAlign: 'center', py: 5, opacity: 0.5 }}>
                        <i className='tabler-history' style={{ fontSize: 36, opacity: 0.3 }} />
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                          No log entries yet.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* ── Manage Attachments ───────────────────────────────────────────── */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant='h6' fontWeight={700}>
              Manage Attachments
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {attachments.length > 0 ? `${attachments.length} file(s)` : 'No attachments yet'}
            </Typography>
          </Box>

          {/* Hidden file input */}
          <input
            ref={attachmentInputRef}
            type='file'
            multiple
            hidden
            accept='image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt'
            onChange={handleAttachmentUpload}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 2
            }}
          >
            {/* Real attachment cards */}
            {attachments.map(item => (
              <Box
                key={item.id}
                sx={{
                  aspectRatio: '4/3',
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  '&:hover .attachment-actions': { opacity: 1 },
                  cursor: 'pointer'
                }}
              >
                {item.contentType?.startsWith('image/') ? (
                  <Box
                    component='img'
                    src={item.downloadUrl ?? ''}
                    alt={item.fileName ?? ''}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.3
                    }}
                  >
                    <i className='tabler-file-description' style={{ fontSize: 48 }} />
                  </Box>
                )}

                <Box
                  className='attachment-actions'
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    bgcolor: 'rgba(0,0,0,0.45)'
                  }}
                >
                  <Box
                    onClick={() => handleOpenPreview(item)}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'rgba(30,30,50,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    <i className='tabler-eye' style={{ fontSize: 16, color: 'white' }} />
                  </Box>
                  <Box
                    onClick={() => handleAttachmentDelete(item)}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    <i className='tabler-trash' style={{ fontSize: 16, color: 'white' }} />
                  </Box>
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 1.5,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Typography variant='caption' sx={{ color: 'white', fontWeight: 600 }} noWrap>
                    {item.fileName}
                  </Typography>
                </Box>
              </Box>
            ))}

            {/* Upload CTA */}
            <Box
              onClick={() => !attachmentUploading && isEditMode && attachmentInputRef.current?.click()}
              sx={{
                aspectRatio: '4/3',
                borderRadius: 3,
                border: '2px dashed',
                borderColor: !isEditMode || attachmentUploading ? 'text.disabled' : 'primary.main',
                bgcolor: 'primary.50',
                opacity: !isEditMode || attachmentUploading ? 0.5 : 0.7,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                cursor: !isEditMode || attachmentUploading ? 'not-allowed' : 'pointer',
                p: 2,
                textAlign: 'center',
                transition: 'all 0.2s',
                '&:hover': isEditMode && !attachmentUploading ? { opacity: 1, bgcolor: 'primary.100' } : {}
              }}
            >
              {attachmentUploading ? (
                <CircularProgress size={28} color='primary' />
              ) : (
                <>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      opacity: 0.15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto'
                    }}
                  >
                    <i
                      className='tabler-cloud-upload'
                      style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant='caption'
                      color={isEditMode ? 'primary' : 'text.secondary'}
                      fontWeight={700}
                      display='block'
                    >
                      {isEditMode ? 'Click to Upload' : 'Save first to upload'}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      PDF, DOC, images…
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </form>

      {/* ── Preview Modal ──────────────────────────────────────────────── */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth={previewItem?.contentType?.startsWith('image/') ? 'md' : 'sm'}
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle
          sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className='tabler-file' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
            {previewItem?.fileName}
          </span>
          <IconButton size='small' onClick={() => setPreviewOpen(false)}>
            <i className='tabler-x' style={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {previewItem?.contentType?.startsWith('image/') ? (
            <Box
              component='img'
              src={previewItem.downloadUrl ?? ''}
              alt={previewItem.fileName ?? 'Preview'}
              sx={{ width: '100%', height: 'auto', maxHeight: 600, objectFit: 'contain', borderRadius: 1 }}
            />
          ) : previewItem?.contentType === 'application/pdf' ? (
            <Box
              component='iframe'
              src={previewItem.downloadUrl ?? ''}
              sx={{ width: '100%', height: 600, border: 'none', borderRadius: 1 }}
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 4 }}>
              <Box sx={{ opacity: 0.3 }}>
                <i className='tabler-file-description' style={{ fontSize: 56 }} />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  Preview not available for this file type
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                  {previewItem?.contentType || 'Unknown format'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            component='a'
            href={previewItem?.downloadUrl}
            target='_blank'
            rel='noopener noreferrer'
            variant='outlined'
            startIcon={<i className='tabler-download' style={{ fontSize: 16 }} />}
          >
            Download
          </Button>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Log Entry Dialog ────────────────────────────────────────── */}
      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-plus' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          Add Log Entry
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          {/* Event Type */}
          <FormControl fullWidth size='small'>
            <InputLabel>Event Type</InputLabel>
            <Select
              label='Event Type'
              value={logForm.eventType}
              onChange={e => setLogForm(f => ({ ...f, eventType: e.target.value }))}
            >
              {EVENT_TYPES.map(et => (
                <MenuItem key={et.value} value={et.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={et.icon} style={{ fontSize: 16, color: et.color }} />
                    {et.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Performed At */}
          <TextField
            label='Performed At'
            type='date'
            size='small'
            fullWidth
            value={logForm.performedAt}
            onChange={e => setLogForm(f => ({ ...f, performedAt: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {/* Cost */}
          <TextField
            label='Cost'
            type='number'
            size='small'
            fullWidth
            value={logForm.cost}
            onChange={e => setLogForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position='start'>$</InputAdornment>
              }
            }}
          />

          {/* Quantity */}
          <TextField
            label='Quantity'
            type='number'
            size='small'
            fullWidth
            value={logForm.quantity}
            onChange={e => setLogForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 1 }))}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText='Number of units (e.g. 2 water bottles, 1 gas cylinder)'
          />

          {/* Note */}
          <TextField
            label='Note'
            size='small'
            fullWidth
            multiline
            rows={2}
            value={logForm.note}
            onChange={e => setLogForm(f => ({ ...f, note: e.target.value }))}
            placeholder='Optional description of the work performed…'
          />

          {/* Next Due Date */}
          <TextField
            label='Next Due Date'
            type='date'
            size='small'
            fullWidth
            value={logForm.nextDueDate}
            onChange={e => setLogForm(f => ({ ...f, nextDueDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText='When should this maintenance be performed next?'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLogDialogOpen(false)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateLog}
            disabled={createLogMutation.isPending}
            startIcon={
              createLogMutation.isPending ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-check' style={{ fontSize: 16 }} />
              )
            }
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          >
            {createLogMutation.isPending ? 'Saving…' : 'Save Entry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AssetEditor
