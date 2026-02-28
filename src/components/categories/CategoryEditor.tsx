'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import * as v from 'valibot'

import {
  getGetApiV1CategoriesCountsByTypeQueryKey,
  getGetApiV1CategoriesQueryKey,
  getGetApiV1CategoriesTreeQueryKey,
  useGetApiV1Categories,
  useGetApiV1CategoriesId,
  usePostApiV1Categories,
  usePutApiV1CategoriesId
} from '@generated/api'
import type { CategoryDto } from '@generated/api'
import IconPicker from '@/components/icon-picker/IconPicker'
import { CATEGORY_TYPE_META, CATEGORY_TYPES, TYPE_CHIP_COLORS } from '@/constants/categoryType'
import { dsl } from '@/utils/dslQueryBuilder'
import FormPreviewDialog from './FormPreviewDialog'

// ─── Schema Field Types ────────────────────────────────────────────────────────
export type SchemaFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'image'

export interface SchemaField {
  type: SchemaFieldType
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
}

const FIELD_TYPE_META: Record<
  SchemaFieldType,
  { icon: string; title: string; subtitle: string; color: string }
> = {
  text: { icon: 'tabler-typography', title: 'Text Input', subtitle: 'Single line string', color: '#7C4DFF' },
  number: { icon: 'tabler-number', title: 'Number', subtitle: 'Integer or decimal', color: '#448AFF' },
  date: { icon: 'tabler-calendar', title: 'Date Picker', subtitle: 'Date or DateTime', color: '#00BFA5' },
  dropdown: { icon: 'tabler-list', title: 'Dropdown', subtitle: 'Single select list', color: '#FF6D00' },
  checkbox: { icon: 'tabler-checkbox', title: 'Checkbox', subtitle: 'Boolean toggle', color: '#00B0FF' },
  image: { icon: 'tabler-camera', title: 'Image Upload', subtitle: 'Asset photos', color: '#F50057' }
}

// ─── Validation ────────────────────────────────────────────────────────────────
const formSchemaFieldSchema = v.object({
  type: v.picklist(['text', 'number', 'date', 'dropdown', 'checkbox', 'image']),
  label: v.pipe(v.string(), v.nonEmpty('Label is required')),
  required: v.boolean(),
  placeholder: v.optional(v.string()),
  options: v.optional(v.array(v.string()))
})

const categorySchema = v.object({
  code: v.pipe(v.string(), v.nonEmpty('Code is required'), v.maxLength(50)),
  name: v.pipe(v.string(), v.nonEmpty('Name is required'), v.maxLength(255)),
  icon: v.optional(v.pipe(v.string(), v.maxLength(100))),
  type: v.picklist(CATEGORY_TYPES, 'Type is required'),
  parentId: v.optional(v.string()),
  formFields: v.array(formSchemaFieldSchema)
})

type CategoryFormData = v.InferOutput<typeof categorySchema>

// ─── Component ─────────────────────────────────────────────────────────────────
interface CategoryEditorProps {
  categoryId?: string
  onSaved?: (id?: string) => void
}

const CategoryEditor = ({ categoryId, onSaved }: CategoryEditorProps) => {
  const queryClient = useQueryClient()
  const isEditMode = Boolean(categoryId)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [selectedParent, setSelectedParent] = useState<CategoryDto | null>(null)

  const { data: catData } = useGetApiV1CategoriesId(categoryId!, { query: { enabled: isEditMode } })

  const createMutation = usePostApiV1Categories()
  const updateMutation = usePutApiV1CategoriesId()
  const category = catData?.result

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormData>({
    resolver: valibotResolver(categorySchema),
    defaultValues: { code: '', name: '', icon: '', type: 'Asset', parentId: '', formFields: [] }
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'formFields' })

  const watchedFields = watch('formFields')
  const watchedIcon = watch('icon')
  const watchedName = watch('name')
  const watchedType = watch('type')

  // Search parent categories via the paginated API with DSL filter
  const parentFilter = useMemo(() => {
    const builder = dsl()

    if (parentSearch) {
      builder.string('name').contains(parentSearch)
    }

    if (watchedType) {
      if (parentSearch) builder.and()
      builder.string('type').eq(watchedType)
    }

    return builder.build() || undefined
  }, [parentSearch, watchedType])

  const { data: parentData, isLoading: parentLoading } = useGetApiV1Categories(
    { page: 1, pageSize: 20, filter: parentFilter },
    { query: { staleTime: 10_000 } }
  )

  const parentOptions: CategoryDto[] = useMemo(() => {
    const items = parentData?.result?.items ?? []

    // Exclude self from options
    return items.filter(p => p.id !== categoryId)
  }, [parentData, categoryId])

  useEffect(() => {
    if (!category) return

    let parsedFields: SchemaField[] = []

    try {
      parsedFields = JSON.parse(category.formSchema ?? '[]')
    } catch {
      /* noop */
    }

    reset({
      code: category.code ?? '',
      name: category.name ?? '',
      icon: category.icon ?? '',
      type: category.type ?? 'Asset',
      parentId: category.parentId ?? '',
      formFields: parsedFields
    })

    // Set selected parent for the Autocomplete
    if (category.parentId) {
      setSelectedParent({
        id: category.parentId,
        name: category.parentName ?? '',
        type: category.type
      })
    } else {
      setSelectedParent(null)
    }
  }, [category, reset])

  // Clear selected parent when type changes (parent must match type)
  useEffect(() => {
    if (selectedParent && selectedParent.type !== watchedType) {
      setSelectedParent(null)
      setValue('parentId', '')
    }
  }, [watchedType, selectedParent, setValue])

  const addField = useCallback(
    (type: SchemaFieldType) => {
      append({
        type,
        label: FIELD_TYPE_META[type].title,
        required: false,
        placeholder: '',
        options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined
      })
    },
    [append]
  )

  const onSubmit = async (data: CategoryFormData) => {
    const formSchema = JSON.stringify(data.formFields)

    try {
      let savedId = categoryId

      if (isEditMode && categoryId) {
        await updateMutation.mutateAsync({
          id: categoryId,
          data: { name: data.name, icon: data.icon || null, type: data.type, parentId: data.parentId || null, formSchema }
        })
      } else {
        const result = await createMutation.mutateAsync({
          data: {
            code: data.code,
            name: data.name,
            icon: data.icon || null,
            type: data.type,
            parentId: data.parentId || null,
            formSchema
          }
        })

        savedId = result?.result?.id ?? undefined
      }

      await queryClient.invalidateQueries({ queryKey: getGetApiV1CategoriesQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getGetApiV1CategoriesTreeQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getGetApiV1CategoriesCountsByTypeQueryKey() })
      onSaved?.(savedId)
    } catch {
      /* handled by mutation state */
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant='h5' fontWeight={700}>
            {isEditMode ? 'Edit Category' : 'Create Category'}
          </Typography>
          {watchedType && (
            <Chip
              label={watchedType}
              size='small'
              color={TYPE_CHIP_COLORS[watchedType] ?? 'default'}
              variant='outlined'
            />
          )}
        </Box>
        <Button
          variant='outlined'
          size='small'
          startIcon={<i className='tabler-eye' style={{ fontSize: 16 }} />}
          onClick={() => setPreviewOpen(true)}
        >
          Preview Form
        </Button>
      </Box>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 5 }}>
        {isEditMode
          ? 'Update category details and customise the form schema.'
          : 'Define a new category with a custom form schema for dynamic data capture.'}
      </Typography>

      <FormPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        categoryName={watchedName}
        fields={watchedFields as SchemaField[]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={5}>
          {/* ─────────────── LEFT: Details + Preview ─────────────────── */}
          <Grid size={{ xs: 12, md: 3.5 }}>
            {/* Icon preview mini-card */}
            <Card
              sx={{
                p: 3,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Avatar
                variant='rounded'
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'action.selected',
                  color: 'text.primary',
                  fontSize: 22
                }}
              >
                {watchedIcon ? <i className={watchedIcon} /> : <i className='tabler-category' />}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle2' fontWeight={600} noWrap>
                  {watchedName || 'Category Name'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {watchedType} category
                </Typography>
              </Box>
            </Card>

            {/* Detail form */}
            <Card sx={{ p: 3 }}>
              <Typography variant='overline' color='text.secondary' sx={{ mb: 2.5, display: 'block', letterSpacing: 1 }}>
                CATEGORY DETAILS
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Controller
                  name='code'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label='Code'
                      placeholder='e.g. LAPTOP'
                      size='small'
                      fullWidth
                      disabled={isEditMode}
                      error={!!errors.code}
                      helperText={errors.code?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position='start'>
                              <i className='tabler-hash' style={{ fontSize: 16, opacity: 0.5 }} />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  )}
                />

                <Controller
                  name='name'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label='Name'
                      placeholder='e.g. Laptops & Notebooks'
                      size='small'
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />

                <Controller
                  name='icon'
                  control={control}
                  render={({ field }) => (
                    <IconPicker
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      label='Icon'
                      placeholder='Select an icon'
                      size='small'
                    />
                  )}
                />

                <Controller
                  name='type'
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size='small' error={!!errors.type}>
                      <InputLabel>Type</InputLabel>
                      <Select {...field} label='Type'>
                        {CATEGORY_TYPES.map(type => (
                          <MenuItem key={type} value={type}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className={CATEGORY_TYPE_META[type].icon} style={{ fontSize: 16 }} /> {CATEGORY_TYPE_META[type].label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                    </FormControl>
                  )}
                />

                <Controller
                  name='parentId'
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      size='small'
                      fullWidth
                      options={parentOptions}
                      getOptionLabel={opt => opt.name ?? ''}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      value={selectedParent}
                      loading={parentLoading}
                      filterOptions={x => x}
                      onInputChange={(_e, value, reason) => {
                        if (reason === 'input') setParentSearch(value)
                      }}
                      onChange={(_e, newValue) => {
                        setSelectedParent(newValue)
                        field.onChange(newValue?.id ?? '')

                        // Auto-set type from parent
                        if (newValue?.type) {
                          setValue('type', newValue.type)
                        }
                      }}
                      renderInput={params => (
                        <TextField
                          {...params}
                          label='Parent Category'
                          placeholder='Search parent...'
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {parentLoading ? <CircularProgress color='inherit' size={16} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              )
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            {option.icon && (
                              <i className={option.icon} style={{ fontSize: 14, opacity: 0.6 }} />
                            )}
                            <Typography variant='body2' noWrap sx={{ flex: 1 }}>
                              {option.name}
                            </Typography>
                            {option.type && (
                              <Chip
                                label={option.type}
                                size='small'
                                color={TYPE_CHIP_COLORS[option.type] ?? 'default'}
                                variant='outlined'
                                sx={{ height: 20, fontSize: 10 }}
                              />
                            )}
                          </Box>
                        </li>
                      )}
                      noOptionsText={parentSearch ? 'No categories found' : 'Type to search...'}
                    />
                  )}
                />
              </Box>
            </Card>

            {/* Schema Preview */}
            <Card sx={{ mt: 3, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-code' style={{ fontSize: 16 }} />
                  <Typography variant='caption' fontWeight={600}>
                    Schema Preview
                  </Typography>
                </Box>
                <Chip
                  label='JSON'
                  size='small'
                  sx={{ height: 20, fontSize: 10, fontFamily: 'monospace' }}
                  variant='outlined'
                />
              </Box>
              <Box
                component='pre'
                sx={{
                  fontSize: 11,
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  p: 2,
                  m: 0,
                  maxHeight: 240,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                  color: 'text.secondary'
                }}
              >
                {JSON.stringify(watchedFields ?? [], null, 2)}
              </Box>
            </Card>
          </Grid>

          {/* ─────────────── CENTER: Form Builder ────────────────────── */}
          <Grid size={{ xs: 12, md: 5.5 }}>
            <Card sx={{ p: 0, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-layout-list' style={{ fontSize: 20 }} />
                  <Typography variant='subtitle1' fontWeight={600}>
                    Form Builder
                  </Typography>
                </Box>
                <Chip
                  label={`${fields.length} field${fields.length !== 1 ? 's' : ''}`}
                  size='small'
                  color='primary'
                  variant='tonal'
                />
              </Box>

              {/* Body */}
              <Box sx={{ p: 3, flex: 1 }}>
                {fields.length === 0 ? (
                  <Box
                    sx={{
                      py: 8,
                      px: 4,
                      textAlign: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      mt: 2
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: 'action.selected',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                      }}
                    >
                      <i className='tabler-forms' style={{ fontSize: 28, opacity: 0.5 }} />
                    </Box>
                    <Typography variant='body2' fontWeight={500} sx={{ mb: 0.5 }}>
                      No fields added yet
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Click an input type from the library on the right to start building your form schema.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {fields.map((field, index) => {
                      const fieldType = (watchedFields?.[index]?.type ?? 'text') as SchemaFieldType
                      const meta = FIELD_TYPE_META[fieldType]

                      return (
                        <Card
                          key={field.id}
                          variant='outlined'
                          sx={{
                            p: 0,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s',
                            '&:hover': { borderColor: meta.color }
                          }}
                        >
                          {/* Field header bar */}
                          <Box
                            sx={{
                              px: 2,
                              py: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              bgcolor: 'action.hover',
                              borderBottom: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 0.75,
                                  bgcolor: `${meta.color}20`,
                                  color: meta.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 14
                                }}
                              >
                                <i className={meta.icon} />
                              </Box>
                              <Chip
                                label={meta.title}
                                size='small'
                                sx={{
                                  height: 22,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  bgcolor: `${meta.color}15`,
                                  color: meta.color,
                                  border: 'none'
                                }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                              {index > 0 && (
                                <Tooltip title='Move up' arrow>
                                  <IconButton size='small' onClick={() => move(index, index - 1)}>
                                    <i className='tabler-arrow-up' style={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {index < fields.length - 1 && (
                                <Tooltip title='Move down' arrow>
                                  <IconButton size='small' onClick={() => move(index, index + 1)}>
                                    <i className='tabler-arrow-down' style={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title='Remove field' arrow>
                                <IconButton
                                  size='small'
                                  onClick={() => remove(index)}
                                  sx={{ color: 'error.main', ml: 0.5 }}
                                >
                                  <i className='tabler-trash' style={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          {/* Field body */}
                          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Controller
                              name={`formFields.${index}.label`}
                              control={control}
                              render={({ field: f }) => (
                                <TextField
                                  {...f}
                                  label='Label'
                                  size='small'
                                  fullWidth
                                  error={!!errors.formFields?.[index]?.label}
                                  helperText={errors.formFields?.[index]?.label?.message}
                                />
                              )}
                            />

                            <Controller
                              name={`formFields.${index}.placeholder`}
                              control={control}
                              render={({ field: f }) => (
                                <TextField {...f} label='Placeholder' size='small' fullWidth />
                              )}
                            />

                            {fieldType === 'dropdown' && (
                              <Controller
                                name={`formFields.${index}.options`}
                                control={control}
                                render={({ field: f }) => (
                                  <TextField
                                    label='Options (comma separated)'
                                    size='small'
                                    fullWidth
                                    value={(f.value ?? []).join(', ')}
                                    onChange={e => f.onChange(e.target.value.split(',').map(s => s.trim()))}
                                  />
                                )}
                              />
                            )}

                            <Controller
                              name={`formFields.${index}.required`}
                              control={control}
                              render={({ field: f }) => (
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size='small'
                                      checked={f.value}
                                      onChange={e => f.onChange(e.target.checked)}
                                    />
                                  }
                                  label={
                                    <Typography variant='caption' color='text.secondary'>
                                      Required
                                    </Typography>
                                  }
                                />
                              )}
                            />
                          </Box>
                        </Card>
                      )
                    })}
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>

          {/* ─────────────── RIGHT: Input Library ────────────────────── */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ p: 0, position: 'sticky', top: 80 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: 1.2 }}>
                  INPUT LIBRARY
                </Typography>
              </Box>

              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(
                  Object.entries(FIELD_TYPE_META) as [SchemaFieldType, (typeof FIELD_TYPE_META)[SchemaFieldType]][]
                ).map(([type, meta]) => (
                  <Box
                    key={type}
                    onClick={() => addField(type)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': {
                        bgcolor: `${meta.color}10`,
                        transform: 'translateX(4px)',
                        '& .field-icon-box': { bgcolor: `${meta.color}25`, color: meta.color }
                      }
                    }}
                  >
                    <Box
                      className='field-icon-box'
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: 'action.selected',
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                        flexShrink: 0
                      }}
                    >
                      <i className={meta.icon} style={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={600} noWrap>
                        {meta.title}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' noWrap>
                        {meta.subtitle}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Divider />

              <Box sx={{ p: 2.5 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                  <Typography
                    variant='caption'
                    color='primary.main'
                    fontWeight={700}
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    Did you know?
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>
                    You can set default validation rules in the &quot;Settings&quot; tab of each field.
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* ─────────────── Actions ─────────────────────────────────── */}
          <Grid size={12}>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant='outlined' color='secondary' size='large' onClick={() => onSaved?.()}>
                Cancel
              </Button>
              <Button
                type='submit'
                variant='contained'
                size='large'
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? undefined : (
                    <i className={isEditMode ? 'tabler-device-floppy' : 'tabler-plus'} style={{ fontSize: 18 }} />
                  )
                }
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  )
}

export default CategoryEditor
