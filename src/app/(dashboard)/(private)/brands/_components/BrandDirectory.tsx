'use client'

import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { useGetApiV1Brands, useGetApiV1Categories } from '@generated/core-api'
import type { ApiErrorResponse, CategoryDto } from '@generated/core-api'
import { dsl } from '@/utils/dslQueryBuilder'

import BrandCard from './BrandCard'

const BrandDirectory = () => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const pageSize = 10

  // Fetch brand-type categories from API
  const { data: categoriesData, isLoading: loadingCategories, isError: isCategoriesError, error: categoriesError } = useGetApiV1Categories({
    filter: "type == 'Brand'",
    pageSize: 100,
    sort: 'name'
  })

  const categories = useMemo<CategoryDto[]>(
    () => categoriesData?.result?.items ?? [],
    [categoriesData]
  )

  // Build DSL filter (search only — category filtering is done via categoryId param)
  const filter = useMemo(() => {
    if (!search.trim()) return undefined
    const builder = dsl()

    builder.string('name').contains(search.trim())

    return builder.build() || undefined
  }, [search])

  const { data, isLoading, isError: isBrandsError, error: brandsError } = useGetApiV1Brands({
    page,
    pageSize,
    filter,
    sort: '-createdAt',
    ...(activeCategoryId ? { categoryId: activeCategoryId } : {})
  })

  const brands = data?.result?.items ?? []
  const total = data?.result?.total ?? 0
  const totalPages = data?.result?.totalPages ?? 1

  const apiErrorMessage = useMemo(() => {
    const error = categoriesError || brandsError

    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    const apiError = error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load brands'
  }, [categoriesError, brandsError])

  // ─── Error handling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCategoriesError || isBrandsError) {
      toast.error(apiErrorMessage || 'Failed to load brands')
    }
  }, [isCategoriesError, isBrandsError, apiErrorMessage])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
        <Box>
          <Typography variant='h4' fontWeight={700}>
            Brand Directory
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
            Manage, organize, and track all your partner brands in one place.
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/brands/new')}>
          Add New Brand
        </Button>
      </Box>

      {/* Search & Category Filters */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, gap: 2 }}>
        <TextField
          size='small'
          placeholder='Search brands...'
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
          sx={{ minWidth: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search' style={{ fontSize: 18 }} />
                </InputAdornment>
              )
            }
          }}
        />
        <Autocomplete
          size='small'
          options={categories}
          getOptionLabel={(opt: CategoryDto) => opt.name ?? ''}
          value={categories.find(c => c.id === activeCategoryId) ?? null}
          onChange={(_, val) => {
            setActiveCategoryId(val?.id ?? null)
            setPage(1)
          }}
          loading={loadingCategories}
          sx={{ minWidth: 220 }}
          renderInput={params => (
            <TextField
              {...params}
              label='Category'
              placeholder='All Categories'
            />
          )}
        />
      </Box>

      {/* Brand Grid */}
      <Grid container spacing={4}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card sx={{ p: 4, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color='text.secondary'>Loading...</Typography>
                </Card>
              </Grid>
            ))
          : brands.map(brand => (
              <Grid key={brand.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <BrandCard brand={brand} />
              </Grid>
            ))}

        {/* Add New Brand Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card
            sx={{
              p: 4,
              height: '100%',
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'transparent',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
            onClick={() => router.push('/brands/new')}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.selected',
                mb: 2
              }}
            >
              <i className='tabler-plus' style={{ fontSize: 24 }} />
            </Box>
            <Typography variant='subtitle1' fontWeight={600}>
              Add New Brand
            </Typography>
            <Typography variant='caption' color='text.secondary' textAlign='center'>
              Register a new partner to the directory
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 6 }}>
        <Typography variant='body2' color='text.secondary'>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
        </Typography>
        {totalPages > 1 && (
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color='primary' />
        )}
      </Box>
    </Box>
  )
}

export default BrandDirectory
