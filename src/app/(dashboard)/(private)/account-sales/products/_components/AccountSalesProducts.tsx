'use client'

import { useEffect, useMemo, useState } from 'react'

import { alpha, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'

import { dsl } from '@/utils/dslQueryBuilder'
import { AccountProductType, useGetApiV1AccountSalesProducts } from '@/generated/core-api'
import type { ApiErrorResponse, ProductDto } from '@/generated/core-api'

import ProductCreateEditModal from './ProductCreateEditModal'
import ProductDetailDrawer from './ProductDetailDrawer'

const productTypeColor: Record<AccountProductType, string> = {
  Google: '#4285F4',
  Github: '#e2e8f0',
  Cursor: '#5FC3E8',
  Canva: '#7D2AE8',
  OpenAi: '#10a37f',
  Microsoft: '#00a4ef',
  Apple: '#A2AAAD',
  Facebook: '#1877F2',
  Amazon: '#FF9900',
  Other: '#94a3b8'
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback
  if (error instanceof Error) return error.message
  const apiError = error as ApiErrorResponse

  return apiError.errors?.[0]?.message || fallback
}

const AccountSalesProducts = () => {
  const theme = useTheme()
  const [page, setPage] = useState(1)

  // Search state
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 400)

    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword])

  // Sub-component states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null)

  const filter = useMemo(() => {
    let builder = dsl()
    const value = debouncedKeyword.trim().toLowerCase()

    if (value) {
      builder = builder.group(g => {
        g.string('name').contains(value)
      })
    }

    return builder.build()
  }, [debouncedKeyword])

  const productsQuery = useGetApiV1AccountSalesProducts({ page, pageSize: 10, sort: '-createdAt', filter })
  const products = useMemo(() => productsQuery.data?.result?.items ?? [], [productsQuery.data?.result?.items])

  const productsApiErrorMessage = useMemo(
    () => getApiErrorMessage(productsQuery.error, 'Unable to load products from API.'),
    [productsQuery.error]
  )

  useEffect(() => {
    if (productsQuery.isError) {
      toast.error(productsApiErrorMessage)
    }
  }, [productsQuery.isError, productsApiErrorMessage])

  // Handlers
  const handleCreateNew = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEdit = (product: ProductDto) => {
    setSelectedProduct(product)
    setIsDrawerOpen(false) // Close drawer if editing from drawer
    setTimeout(() => setIsModalOpen(true), 250)
  }

  const handleView = (product: ProductDto) => {
    setSelectedProduct(product)
    setIsDrawerOpen(true)
  }

  // Placeholder calculations for Stat Cards
  const totalProducts = productsQuery.data?.result?.total ?? 0
  const activePackages = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)

  const averagePrice =
    products.length > 0
      ? Math.round(products.reduce((acc, p) => acc + (p.variants?.[0]?.price || 0), 0) / products.length)
      : 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* HEADER SECTION */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <Typography variant='h4' fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
            Inventory Control
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Manage your enterprise product ecosystem with real-time analytics and lifecycle oversight.
          </Typography>
        </Box>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' color='inherit' sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}>
            Export CSV
          </Button>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-plus' />}
            onClick={handleCreateNew}
            sx={{ px: 3, boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}` }}
          >
            New Product
          </Button>
        </Stack>
      </Box>

      {/* STAT CARDS */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}
        >
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{ color: 'text.secondary', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            TOTAL PRODUCTS
          </Typography>
          <Typography variant='h3' fontWeight={800} sx={{ mt: 1 }}>
            {totalProducts.toLocaleString()}
          </Typography>
          <i
            className='tabler-clipboard-check'
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              fontSize: 48,
              color: alpha(theme.palette.text.secondary, 0.1)
            }}
          />
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}
        >
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{ color: 'text.secondary', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            ACTIVE PACKAGES
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <Typography variant='h3' fontWeight={800}>
              {activePackages}
            </Typography>
            <Chip
              size='small'
              icon={<i className='tabler-check' style={{ fontSize: 12 }} />}
              label='Stable'
              color='success'
              variant='outlined'
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
            />
          </Box>
          <i
            className='tabler-package'
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              fontSize: 48,
              color: alpha(theme.palette.text.secondary, 0.1)
            }}
          />
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}
        >
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{ color: 'text.secondary', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            AVG. PRICING
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 1 }}>
            <Typography variant='h3' fontWeight={800}>
              <Typography
                component='span'
                variant='h5'
                sx={{ color: 'text.secondary', mr: 0.5, fontWeight: 700, verticalAlign: 'top' }}
              >
                ₫
              </Typography>
              {averagePrice.toLocaleString('vi-VN')}
            </Typography>
            <Typography variant='caption' fontWeight={600} sx={{ color: 'text.secondary', mb: 0.5 }}>
              /UNIT
            </Typography>
          </Box>
          <i
            className='tabler-coin'
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              fontSize: 48,
              color: alpha(theme.palette.text.secondary, 0.1)
            }}
          />
        </Card>
      </Box>

      {/* TABLE SECTION */}
      <Card variant='outlined' sx={{ borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <TextField
            size='small'
            placeholder='Search products, SKUs or categories...'
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search' style={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: 'background.default', minWidth: 320 }
              }
            }}
          />
          <Stack direction='row' spacing={1}>
            <Button
              size='small'
              variant='outlined'
              color='inherit'
              startIcon={<i className='tabler-filter' />}
              sx={{ borderRadius: 2 }}
            >
              Filter
            </Button>
            <Button
              size='small'
              variant='outlined'
              color='inherit'
              startIcon={<i className='tabler-sort-descending' />}
              sx={{ borderRadius: 2 }}
            >
              Sort
            </Button>
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '1px' }}>
                  PRODUCT NAME
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '1px' }}>
                  TYPE
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '1px' }}>
                  PACKAGES
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '1px' }}>
                  STATUS
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '1px' }}
                >
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product, idx) => {
                const tone =
                  productTypeColor[product.productType || AccountProductType.Other] ||
                  productTypeColor[AccountProductType.Other]

                const sku = `SKU-${product.id?.substring(0, 5).toUpperCase()}-${String.fromCharCode(65 + (idx % 26))}`
                const isHardware = product.productType === AccountProductType.Other
                const isActive = true // Placeholder logic for now

                return (
                  <TableRow key={product.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: alpha(tone, 0.1),
                            color: tone,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className={isHardware ? 'tabler-cpu' : 'tabler-box'} style={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant='body2' fontWeight={700} sx={{ color: 'text.primary' }}>
                            {product.name}
                          </Typography>
                          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {sku}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={product.productType}
                        sx={{
                          bgcolor: alpha(tone, 0.12),
                          color: tone,
                          border: `1px solid ${alpha(tone, 0.2)}`,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          height: 24
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600} sx={{ color: 'text.secondary' }}>
                        {(product.variants || []).length < 10 && (product.variants || []).length > 0 ? '0' : ''}
                        {(product.variants || []).length}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch size='small' checked={isActive} color='primary' sx={{ pointerEvents: 'none' }} />
                        <Typography
                          variant='caption'
                          fontWeight={600}
                          sx={{ color: isActive ? 'text.primary' : 'text.secondary' }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack direction='row' spacing={0.5} justifyContent='flex-end'>
                        <IconButton
                          size='small'
                          onClick={() => handleView(product)}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) }
                          }}
                        >
                          <i className='tabler-eye' style={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size='small'
                          onClick={() => handleEdit(product)}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) }
                          }}
                        >
                          <i className='tabler-pencil' style={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size='small'
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) }
                          }}
                        >
                          <i className='tabler-trash' style={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 6, textAlign: 'center' }}>
                      No product yet. Create your first product to generate inventory logic.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION FOOTER */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.default, 0.4)
          }}
        >
          <Typography variant='body2' color='text.secondary'>
            Showing{' '}
            <Typography component='span' fontWeight={700} color='text.primary'>
              {(page - 1) * 10 + 1}-{Math.min(page * 10, totalProducts)}
            </Typography>{' '}
            of{' '}
            <Typography component='span' fontWeight={700} color='text.primary'>
              {totalProducts}
            </Typography>{' '}
            products
          </Typography>
          <Pagination
            page={page}
            count={productsQuery.data?.result?.totalPages ?? 1}
            onChange={(_, value) => setPage(value)}
            shape='rounded'
            sx={{
              '& .MuiPaginationItem-root': {
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              },
              '& .Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }
            }}
          />
        </Box>
      </Card>

      {/* MODALS */}
      <ProductCreateEditModal open={isModalOpen} onClose={() => setIsModalOpen(false)} editTarget={selectedProduct} />

      <ProductDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={selectedProduct}
        onEdit={handleEdit}
      />
    </Box>
  )
}

export default AccountSalesProducts
