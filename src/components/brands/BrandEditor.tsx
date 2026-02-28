'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import OutlinedInput from '@mui/material/OutlinedInput'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as v from 'valibot'

import {
  CategoryType,
  getGetApiV1BrandsQueryKey,
  useGetApiV1BrandsId,
  useGetApiV1CategoriesTree,
  usePostApiV1Brands,
  usePutApiV1BrandsId
} from '@generated/api'
import type { CategoryTreeNodeDto } from '@generated/api'
import { getInitials } from '@/utils/getInitials'

// Flatten category tree into a flat list for select options
const flattenTree = (nodes: CategoryTreeNodeDto[], depth = 0): Array<CategoryTreeNodeDto & { depth: number }> => {
  return nodes.map(node => ({ ...node, depth }))
}

// Validation schema
const brandSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty('Brand name is required'), v.maxLength(255)),
  website: v.optional(v.pipe(v.string(), v.maxLength(255))),
  supportPhone: v.optional(v.pipe(v.string(), v.maxLength(50))),
  description: v.optional(v.pipe(v.string(), v.maxLength(250))),
  logoUrl: v.optional(v.string()),
  categoryIds: v.optional(v.array(v.string()))
})

type BrandFormData = v.InferOutput<typeof brandSchema>

interface BrandEditorProps {
  brandId?: string
}

const BrandEditor = ({ brandId }: BrandEditorProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(brandId)

  // Fetch brand categories from API
  const { data: categoryTreeData } = useGetApiV1CategoriesTree({ type: CategoryType.Brand })

  const brandCategories = categoryTreeData?.result?.items ? flattenTree(categoryTreeData.result.items) : []

  // Fetch existing brand for edit mode
  const { data: brandData } = useGetApiV1BrandsId(brandId!, {
    query: { enabled: isEditMode }
  })

  const brand = brandData?.result

  // Mutations
  const createMutation = usePostApiV1Brands()
  const updateMutation = usePutApiV1BrandsId()

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<BrandFormData>({
    resolver: valibotResolver(brandSchema),
    defaultValues: {
      name: '',
      website: '',
      supportPhone: '',
      description: '',
      logoUrl: '',
      categoryIds: []
    }
  })

  // Populate form when brand data loads
  useEffect(() => {
    if (brand) {
      reset({
        name: brand.name ?? '',
        website: brand.website ?? '',
        supportPhone: brand.supportPhone ?? '',
        description: brand.description ?? '',
        logoUrl: brand.logoUrl ?? '',
        categoryIds: brand.categories?.map(c => c.id ?? '') ?? []
      })
    }
  }, [brand, reset])

  // Watch form values for live preview
  const watchedValues = watch()

  const selectedCategories = brandCategories.filter(c => watchedValues.categoryIds?.includes(c.id ?? ''))

  const onSubmit = async (data: BrandFormData) => {
    try {
      if (isEditMode && brandId) {
        await updateMutation.mutateAsync({
          id: brandId,
          data: {
            name: data.name,
            website: data.website || null,
            supportPhone: data.supportPhone || null,
            description: data.description || null,
            logoUrl: data.logoUrl || null,
            categoryIds: data.categoryIds ?? null
          }
        })
      } else {
        await createMutation.mutateAsync({
          data: {
            name: data.name,
            website: data.website || null,
            supportPhone: data.supportPhone || null,
            description: data.description || null,
            logoUrl: data.logoUrl || null,
            categoryIds: data.categoryIds ?? null
          }
        })
      }

      // Invalidate brand list queries
      await queryClient.invalidateQueries({ queryKey: getGetApiV1BrandsQueryKey() })
      router.push('/brands')
    } catch {
      // Error is handled by React Query / mutation state
    }
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => router.push('/brands')}
        >
          Brands
        </Typography>
        <i className='tabler-chevron-right' style={{ fontSize: 14, opacity: 0.5 }} />
        <Typography variant='body2'>{isEditMode ? 'Edit Brand' : 'Add New Brand'}</Typography>
      </Box>

      {/* Page Title */}
      <Typography variant='h5' fontWeight={700} sx={{ mb: 1 }}>
        {isEditMode ? 'Edit Brand Details' : 'Add Brand Details'}
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 6 }}>
        {isEditMode
          ? 'Update the brand information and category associations.'
          : 'Create a new brand entry and link it to relevant categories.'}
      </Typography>

      <Grid container spacing={6}>
        {/* Live Preview */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant='overline' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
            LIVE PREVIEW
          </Typography>

          <Card sx={{ p: 4 }}>
            {/* Brand Avatar/Logo */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              {watchedValues.logoUrl ? (
                <Avatar src={watchedValues.logoUrl} variant='rounded' sx={{ width: 64, height: 64, mb: 2 }} />
              ) : (
                <Avatar
                  variant='rounded'
                  sx={{
                    width: 64,
                    height: 64,
                    mb: 2,
                    bgcolor: 'action.selected',
                    color: 'text.secondary',
                    fontSize: '1.5rem'
                  }}
                >
                  {watchedValues.name ? getInitials(watchedValues.name) : <i className='tabler-photo' />}
                </Avatar>
              )}
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant='h6' fontWeight={700}>
                  {watchedValues.name || 'Brand Name'}
                </Typography>
                {isEditMode && (
                  <Chip label='Active' color='success' size='small' variant='outlined' sx={{ height: 20 }} />
                )}
              </Box>
              {selectedCategories.length > 0 && (
                <Typography variant='caption' color='primary.main'>
                  {selectedCategories.map(c => c.name).join(' & ')}
                </Typography>
              )}
            </Box>

            {watchedValues.description && (
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3, textAlign: 'center' }}>
                {watchedValues.description}
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            {watchedValues.website && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <i className='tabler-world' style={{ fontSize: 16, opacity: 0.6 }} />
                <Typography variant='body2' color='text.secondary'>
                  {watchedValues.website}
                </Typography>
              </Box>
            )}

            {watchedValues.supportPhone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-phone' style={{ fontSize: 16, opacity: 0.6 }} />
                <Typography variant='body2' color='text.secondary'>
                  {watchedValues.supportPhone}
                </Typography>
              </Box>
            )}

            {isEditMode && (
              <Button variant='contained' fullWidth sx={{ mt: 3 }} onClick={() => router.push(`/brands/${brandId}/edit`)}>
                View Details
              </Button>
            )}
          </Card>

          <Card sx={{ p: 3, mt: 3, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <i className='tabler-info-circle' style={{ fontSize: 18 }} />
              <Typography variant='subtitle2' fontWeight={600}>
                Preview Mode
              </Typography>
            </Box>
            <Typography variant='caption' color='text.secondary'>
              This is how the brand card will appear in the public directory listing.
            </Typography>
          </Card>
        </Grid>

        {/* Form */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 6 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={4}>
                {/* Brand Name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name='name'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label='Brand Name'
                        placeholder='e.g. Acme Corp'
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Website URL */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name='website'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label='Website URL'
                        placeholder='https://www.example.com'
                        fullWidth
                        error={!!errors.website}
                        helperText={errors.website?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Support Phone */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name='supportPhone'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label='Support Phone'
                        placeholder='+1 (555) 000-0000'
                        fullWidth
                        error={!!errors.supportPhone}
                        helperText={errors.supportPhone?.message}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position='start'>
                                <i className='tabler-phone' style={{ fontSize: 18 }} />
                              </InputAdornment>
                            )
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Categories */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name='categoryIds'
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Categories</InputLabel>
                        <Select
                          {...field}
                          multiple
                          value={field.value ?? []}
                          input={<OutlinedInput label='Categories' />}
                          renderValue={selected => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map(id => {
                                const cat = brandCategories.find(c => c.id === id)

                                return cat ? (
                                  <Chip
                                    key={id}
                                    label={cat.name}
                                    size='small'
                                    color='primary'
                                    onDelete={() => {
                                      field.onChange((field.value ?? []).filter((v: string) => v !== id))
                                    }}
                                    onMouseDown={e => e.stopPropagation()}
                                  />
                                ) : null
                              })}
                            </Box>
                          )}
                        >
                          {brandCategories.map(cat => (
                            <MenuItem key={cat.id} value={cat.id} sx={{ pl: 2 + (cat.depth ?? 0) * 2 }}>
                              {cat.icon && <i className={cat.icon} style={{ fontSize: 16, marginRight: 8, opacity: 0.7 }} />}
                              {cat.name}
                            </MenuItem>
                          ))}
                        </Select>
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
                      <Box>
                        <TextField
                          {...field}
                          label='Description'
                          placeholder='Brief description of the brand...'
                          fullWidth
                          multiline
                          rows={3}
                          error={!!errors.description}
                          helperText={errors.description?.message}
                          slotProps={{
                            htmlInput: { maxLength: 250 }
                          }}
                        />
                        <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
                          {field.value?.length ?? 0}/250 characters
                        </Typography>
                      </Box>
                    )}
                  />
                </Grid>

                {/* Brand Logo */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant='subtitle2' sx={{ mb: 1 }}>
                    Brand Logo
                  </Typography>
                  <Controller
                    name='logoUrl'
                    control={control}
                    render={({ field }) => (
                      <Box>
                        <Box
                          sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                          }}
                          onClick={() => {
                            // TODO: Integrate with file upload service
                            const url = prompt('Enter logo URL:')

                            if (url) field.onChange(url)
                          }}
                        >
                          {field.value ? (
                            <Box>
                              <Avatar src={field.value} variant='rounded' sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }} />
                              <Typography variant='caption' color='text.secondary'>
                                Click to change
                              </Typography>
                            </Box>
                          ) : (
                            <Box>
                              <i className='tabler-cloud-upload' style={{ fontSize: 32, opacity: 0.5 }} />
                              <Typography variant='body2' sx={{ mt: 1 }}>
                                <Typography component='span' color='primary.main' sx={{ cursor: 'pointer' }}>
                                  Click to upload
                                </Typography>{' '}
                                or drag and drop
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                SVG, PNG, JPG or GIF (max. 800x400px)
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        {errors.logoUrl && <FormHelperText error>{errors.logoUrl.message}</FormHelperText>}
                      </Box>
                    )}
                  />
                </Grid>
              </Grid>

              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 6 }}>
                <Button variant='outlined' color='secondary' onClick={() => router.push('/brands')}>
                  Cancel
                </Button>
                <Button type='submit' variant='contained' disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </form>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default BrandEditor
