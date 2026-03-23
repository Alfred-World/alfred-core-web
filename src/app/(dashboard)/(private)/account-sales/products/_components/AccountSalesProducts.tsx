'use client'

import { useEffect, useMemo, useState } from 'react'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  AccountProductType,
  getGetApiV1AccountSalesProductsQueryKey,
  useGetApiV1AccountSalesProducts,
  usePostApiV1AccountSalesProducts,
  usePutApiV1AccountSalesProductsId
} from '@/generated/core-api'
import type {
  ApiErrorResponse,
  CreateProductRequest,
  CreateProductVariantRequest,
  ProductDto,
  ProductVariantDto,
  UpdateProductRequest,
  UpdateProductVariantRequest
} from '@/generated/core-api'

const productTypeColor: Record<AccountProductType, string> = {
  Google: '#4285F4',
  Github: '#e2e8f0',
  Cursor: '#5FC3E8',
  Canva: '#7D2AE8',
  OpenAi: '#10a37f',
  Other: '#94a3b8'
}

const createDefaultVariant = (): CreateProductVariantRequest => ({
  name: 'Default',
  price: 0,
  warrantyDays: 30
})

const defaultProductForm: CreateProductRequest = {
  name: '',
  productType: AccountProductType.Other,
  variants: [createDefaultVariant()],
  description: ''
}

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/[^\d]/g, '')

  return normalized ? Number(normalized) : 0
}

const formatCurrencyInput = (value?: number | null) => {
  return Number(value || 0).toLocaleString('en-US')
}

const formatVariant = (variant: ProductVariantDto | CreateProductVariantRequest | UpdateProductVariantRequest) => {
  const price = Number(variant.price || 0).toLocaleString('vi-VN')
  const warrantyDays = variant.warrantyDays || 0

  return `${variant.name || 'Unnamed'} | ${price} VND | ${warrantyDays} days`
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  const apiError = error as ApiErrorResponse

  return apiError.errors?.[0]?.message || fallback
}

const AccountSalesProducts = () => {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [form, setForm] = useState<CreateProductRequest>(defaultProductForm)
  const [editing, setEditing] = useState<ProductDto | null>(null)

  const productsQuery = useGetApiV1AccountSalesProducts({ page, pageSize: 10, sort: '-createdAt' })

  const products = useMemo(() => productsQuery.data?.result?.items ?? [], [productsQuery.data?.result?.items])

  const createMutation = usePostApiV1AccountSalesProducts({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create product')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesProductsQueryKey() })
        setOpenCreate(false)
        setForm(defaultProductForm)
      }
    }
  })

  const updateMutation = usePutApiV1AccountSalesProductsId({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to update product')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesProductsQueryKey() })
        setOpenEdit(false)
        setEditing(null)
      }
    }
  })

  const productsApiErrorMessage = useMemo(
    () => getApiErrorMessage(productsQuery.error, 'Unable to load products from API.'),
    [productsQuery.error]
  )

  useEffect(() => {
    if (productsQuery.isError) {
      toast.error(productsApiErrorMessage)
    }
  }, [productsQuery.isError, productsApiErrorMessage])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant='h4' fontWeight={800}>Products</Typography>
            <Typography variant='body2' color='text.secondary'>Manage account products, price and warranty policy for sell flow.</Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setOpenCreate(true)}>
            New Product
          </Button>
        </Box>
      </Card>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Packages</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map(product => {
                const tone = productTypeColor[product.productType || AccountProductType.Other] || productTypeColor[AccountProductType.Other]

                
return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={700}>{product.name}</Typography>
                      <Typography variant='caption' color='text.secondary'>{product.description || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={product.productType}
                        sx={{
                          bgcolor: alpha(tone, 0.16),
                          color: tone,
                          border: `1px solid ${alpha(tone, 0.28)}`,
                          fontWeight: 700
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.6}>
                        {(product.variants || []).map(variant => (
                          <Typography key={variant.id || `${variant.name}-${variant.price}`} variant='caption' color='text.secondary'>
                            {formatVariant(variant)}
                          </Typography>
                        ))}
                        {(product.variants || []).length === 0 && (
                          <Typography variant='caption' color='text.secondary'>No package</Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => {
                          setEditing(product)
                          setOpenEdit(true)
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                      No product yet. Create first product to start selling flow.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing {products.length} of {productsQuery.data?.result?.total ?? 0} products
          </Typography>
          <Pagination
            page={page}
            count={productsQuery.data?.result?.totalPages ?? 1}
            onChange={(_, value) => setPage(value)}
          />
        </Stack>
      </Card>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth='md'>
        <DialogTitle sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 1.5 }}>Create Product</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pt: 2.5, pb: 1.5 }}>
          <Stack spacing={2.5}>
            <TextField
              label='Product name'
              value={form.name || ''}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              select
              label='Product type'
              value={form.productType || AccountProductType.Other}
              onChange={event => setForm(prev => ({ ...prev, productType: event.target.value as AccountProductType }))}
            >
              {Object.values(AccountProductType).map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            <Stack spacing={2}>
              <Typography variant='subtitle2' fontWeight={700}>Product packages</Typography>
              {(form.variants || []).map((variant, index) => (
                <Stack key={`create-variant-${index}`} spacing={1} useFlexGap>
                  <TextField
                    label={`Package name #${index + 1}`}
                    value={variant.name || ''}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        variants: (prev.variants || []).map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        )
                      }))
                    }
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                    <TextField
                      label='Price (VND)'
                      type='text'
                      value={formatCurrencyInput(variant.price)}
                      inputMode='numeric'
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, price: parseCurrencyInput(event.target.value) } : item
                          )
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label='Warranty days'
                      type='number'
                      value={variant.warrantyDays ?? 30}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, warrantyDays: Number(event.target.value) } : item
                          )
                        }))
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack direction='row' justifyContent='flex-end'>
                    <Button
                      color='error'
                      size='small'
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                      disabled={(form.variants || []).length <= 1}
                    >
                      Remove package
                    </Button>
                  </Stack>
                  {index < (form.variants || []).length - 1 && <Divider />}
                </Stack>
              ))}
              <Button
                variant='outlined'
                size='small'
                onClick={() =>
                  setForm(prev => ({
                    ...prev,
                    variants: [...(prev.variants || []), createDefaultVariant()]
                  }))
                }
              >
                Add package
              </Button>
            </Stack>
            <TextField
              label='Description'
              multiline
              minRows={3}
              value={form.description || ''}
              onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={!form.name || (form.variants || []).length === 0 || createMutation.isPending}
            onClick={async () => {
              await createMutation.mutateAsync({ data: form })
            }}
          >
            Create Product
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <TextField
              label='Product name'
              value={editing?.name || ''}
              onChange={event =>
                setEditing(prev => (prev ? { ...prev, name: event.target.value } : prev))
              }
            />
            <TextField
              select
              label='Product type'
              value={editing?.productType || AccountProductType.Other}
              onChange={event =>
                setEditing(prev => (prev ? { ...prev, productType: event.target.value as AccountProductType } : prev))
              }
            >
              {Object.values(AccountProductType).map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            <Stack spacing={1.6}>
              <Typography variant='subtitle2' fontWeight={700}>Product packages</Typography>
              {(editing?.variants || []).map((variant, index) => (
                <Stack key={variant.id || `edit-variant-${index}`} spacing={1} useFlexGap>
                  <TextField
                    label={`Package name #${index + 1}`}
                    value={variant.name || ''}
                    onChange={event =>
                      setEditing(prev => {
                        if (!prev) {
                          return prev
                        }

                        return {
                          ...prev,
                          variants: (prev.variants || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item
                          )
                        }
                      })
                    }
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      label='Price (VND)'
                      type='text'
                      value={formatCurrencyInput(variant.price)}
                      inputMode='numeric'
                      onChange={event =>
                        setEditing(prev => {
                          if (!prev) {
                            return prev
                          }

                          return {
                            ...prev,
                            variants: (prev.variants || []).map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, price: parseCurrencyInput(event.target.value) }
                                : item
                            )
                          }
                        })
                      }
                      fullWidth
                    />
                    <TextField
                      label='Warranty days'
                      type='number'
                      value={variant.warrantyDays ?? 30}
                      onChange={event =>
                        setEditing(prev => {
                          if (!prev) {
                            return prev
                          }

                          return {
                            ...prev,
                            variants: (prev.variants || []).map((item, itemIndex) =>
                              itemIndex === index ? { ...item, warrantyDays: Number(event.target.value) } : item
                            )
                          }
                        })
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack direction='row' justifyContent='flex-end'>
                    <Button
                      color='error'
                      size='small'
                      onClick={() =>
                        setEditing(prev => {
                          if (!prev) {
                            return prev
                          }

                          return {
                            ...prev,
                            variants: (prev.variants || []).filter((_, itemIndex) => itemIndex !== index)
                          }
                        })
                      }
                      disabled={(editing?.variants || []).length <= 1}
                    >
                      Remove package
                    </Button>
                  </Stack>
                  {index < (editing?.variants || []).length - 1 && <Divider />}
                </Stack>
              ))}
              <Button
                variant='outlined'
                size='small'
                onClick={() =>
                  setEditing(prev => {
                    if (!prev) {
                      return prev
                    }

                    return {
                      ...prev,
                      variants: [...(prev.variants || []), createDefaultVariant() as ProductVariantDto]
                    }
                  })
                }
              >
                Add package
              </Button>
            </Stack>
            <TextField
              label='Description'
              multiline
              minRows={3}
              value={editing?.description || ''}
              onChange={event =>
                setEditing(prev => (prev ? { ...prev, description: event.target.value } : prev))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={!editing?.id || !editing.name || (editing.variants || []).length === 0 || updateMutation.isPending}
            onClick={async () => {
              if (!editing?.id || !editing.name) {
                return
              }

              const payload: UpdateProductRequest = {
                name: editing.name,
                productType: editing.productType || AccountProductType.Other,
                variants: (editing.variants || []).map(variant => ({
                  name: variant.name || 'Default',
                  price: variant.price || 0,
                  warrantyDays: variant.warrantyDays || 0
                })),
                description: editing.description || ''
              }

              await updateMutation.mutateAsync({ id: editing.id, data: payload })
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccountSalesProducts
