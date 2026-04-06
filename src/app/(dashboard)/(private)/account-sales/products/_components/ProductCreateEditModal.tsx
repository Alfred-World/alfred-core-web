'use client'

import { useEffect, useState } from 'react'

import { alpha, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  AccountProductType,
  getGetApiV1AccountSalesProductsQueryKey,
  usePostApiV1AccountSalesProducts,
  usePatchApiV1AccountSalesProductsId
} from '@/generated/core-api'
import type {
  CreateProductRequest,
  CreateProductVariantRequest,
  ProductDto,
  UpdateProductRequest
} from '@/generated/core-api'
import { getChangedFields } from '@/utils/getChangedFields'

interface ProductCreateEditModalProps {
  open: boolean
  onClose: () => void
  editTarget?: ProductDto | null
}

const createDefaultVariant = (): CreateProductVariantRequest => ({
  name: '',
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

const ProductCreateEditModal = ({ open, onClose, editTarget }: ProductCreateEditModalProps) => {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateProductRequest>(defaultProductForm)

  const isEdit = !!editTarget

  // Sync form when editTarget changes or modal opens
  useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          name: editTarget.name || '',
          productType: editTarget.productType || AccountProductType.Other,
          description: editTarget.description || '',
          variants: (editTarget.variants || []).map(v => ({
            name: v.name || '',
            price: v.price || 0,
            warrantyDays: v.warrantyDays || 0
          }))
        })
      } else {
        setForm(defaultProductForm)
      }
    }
  }, [open, editTarget])

  const createMutation = usePostApiV1AccountSalesProducts({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create product')

          return
        }

        toast.success('Product created successfully')
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesProductsQueryKey() })
        handleClose()
      }
    }
  })

  const updateMutation = usePatchApiV1AccountSalesProductsId({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to update product')

          return
        }

        toast.success('Product updated successfully')
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesProductsQueryKey() })
        handleClose()
      }
    }
  })

  const handleClose = () => {
    setForm(defaultProductForm)
    onClose()
  }

  const handleSave = async () => {
    if (!form.name || (form.variants || []).length === 0) return

    // Ensure unnamed variants have a fallback name 'Default' for API
    const sanitizedVariants = (form.variants || []).map(v => ({
      name: v.name || 'Default',
      price: v.price || 0,
      warrantyDays: v.warrantyDays || 0
    }))

    if (isEdit && editTarget?.id) {
      const current: UpdateProductRequest = {
        name: form.name,
        productType: form.productType,
        description: form.description ?? undefined,
        variants: sanitizedVariants
      }

      const original: UpdateProductRequest = {
        name: editTarget.name || '',
        productType: editTarget.productType || AccountProductType.Other,
        description: editTarget.description || '',
        variants: (editTarget.variants || []).map(v => ({
          name: v.name || 'Default',
          price: v.price || 0,
          warrantyDays: v.warrantyDays || 0
        }))
      }

      const changes = getChangedFields(original, current)

      if (!changes) return

      await updateMutation.mutateAsync({ id: editTarget.id, data: changes })
    } else {
      const payload: CreateProductRequest = {
        name: form.name,
        productType: form.productType || AccountProductType.Other,
        description: form.description,
        variants: sanitizedVariants
      }

      await createMutation.mutateAsync({ data: payload })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleAddPackage = () => {
    setForm(prev => ({
      ...prev,
      variants: [...(prev.variants || []), createDefaultVariant()]
    }))
  }

  const handleRemovePackage = (indexToRemove: number) => {
    setForm(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, idx) => idx !== indexToRemove)
    }))
  }

  const handlePackageChange = (index: number, field: keyof CreateProductVariantRequest, value: string | number) => {
    setForm(prev => ({
      ...prev,
      variants: (prev.variants || []).map((v, idx) => {
        if (idx !== index) return v

        if (field === 'price') {
          return { ...v, price: parseCurrencyInput(value as string) }
        }

        return { ...v, [field]: value }
      })
    }))
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='md' // slightly wider for the horizontal variant rows
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRadius: 4,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1)
        }
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          pt: 3.5,
          px: { xs: 2.5, sm: 4 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <Box>
          <Typography component='span' variant='h5' fontWeight={800} sx={{ display: 'block' }}>
            {isEdit ? 'Edit Product' : 'Add Product'}
          </Typography>
          <Typography component='span' variant='body2' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            Configure your product identity and tiered package offerings.
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'text.secondary', ml: 2 }} disabled={isPending}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pt: 3, pb: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* BASIC INFORMATION */}
        <Box>
          <Typography
            variant='subtitle2'
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.primary' }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='tabler-info-circle' style={{ fontSize: 14 }} />
            </Box>
            Basic Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  color: 'text.secondary',
                  mb: 0.75,
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                PRODUCT NAME
              </Typography>
              <TextField
                fullWidth
                placeholder='e.g. Etheris Core'
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  color: 'text.secondary',
                  mb: 0.75,
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                TYPE
              </Typography>
              <TextField
                select
                fullWidth
                value={form.productType}
                onChange={e => setForm(prev => ({ ...prev, productType: e.target.value as AccountProductType }))}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              >
                {Object.values(AccountProductType).map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 0.75, display: 'block', fontWeight: 600, textTransform: 'uppercase' }}
            >
              DESCRIPTION (OPTIONAL)
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder='Product description...'
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </Box>
        </Box>

        {/* PACKAGE CONFIGURATION */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography
              variant='subtitle2'
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className='tabler-packages' style={{ fontSize: 14 }} />
              </Box>
              Package Configuration
            </Typography>
            <Button
              size='small'
              startIcon={<i className='tabler-plus' style={{ fontSize: 14 }} />}
              onClick={handleAddPackage}
              sx={{ fontWeight: 600, textTransform: 'none' }}
              color='primary'
            >
              Add Package
            </Button>
          </Box>

          <Stack spacing={1.5}>
            {(form.variants || []).length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant='body2' color='text.secondary'>
                  No packages defined. Add a package to continue.
                </Typography>
              </Box>
            )}

            {(form.variants || []).map((variant, index) => (
              <Card
                key={`variant-${index}`}
                variant='outlined'
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: 'transparent',
                  borderColor: index === 0 ? 'primary.main' : 'divider',
                  position: 'relative',
                  overflow: 'visible',
                  transition: 'border-color 0.2s'
                }}
              >
                {index === 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 4,
                      bgcolor: 'primary.main',
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12
                    }}
                  />
                )}

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  {/* Name */}
                  <Box sx={{ flex: { xs: '1 1 100%', sm: '2 1 0' } }}>
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'text.secondary',
                        mb: 0.5,
                        display: 'block',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase'
                      }}
                    >
                      PACKAGE NAME
                    </Typography>
                    <TextField
                      fullWidth
                      size='small'
                      placeholder='e.g. Standard Tier'
                      value={variant.name}
                      onChange={e => handlePackageChange(index, 'name', e.target.value)}
                      slotProps={{ input: { sx: { bgcolor: 'background.default', borderRadius: 2 } } }}
                    />
                  </Box>

                  {/* Price */}
                  <Box sx={{ flex: { xs: '1 1 45%', sm: '1.2 1 0' } }}>
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'text.secondary',
                        mb: 0.5,
                        display: 'block',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase'
                      }}
                    >
                      PRICE (VND)
                    </Typography>
                    <TextField
                      fullWidth
                      size='small'
                      value={formatCurrencyInput(variant.price)}
                      onChange={e => handlePackageChange(index, 'price', e.target.value)}
                      slotProps={{
                        input: {
                          sx: { bgcolor: 'background.default', borderRadius: 2 },
                          endAdornment: (
                            <InputAdornment position='end'>
                              <Typography variant='caption' fontWeight={600}>
                                VND
                              </Typography>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Box>

                  {/* Warranty */}
                  <Box sx={{ flex: { xs: '1 1 35%', sm: '1 1 0' } }}>
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'text.secondary',
                        mb: 0.5,
                        display: 'block',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase'
                      }}
                    >
                      WARRANTY (DAYS)
                    </Typography>
                    <TextField
                      fullWidth
                      size='small'
                      type='number'
                      value={variant.warrantyDays}
                      onChange={e => handlePackageChange(index, 'warrantyDays', Number(e.target.value))}
                      slotProps={{ input: { sx: { bgcolor: 'background.default', borderRadius: 2 } } }}
                    />
                  </Box>

                  {/* Remove Button */}
                  <Box sx={{ pt: 2.5, pl: 0.5, display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      size='small'
                      onClick={() => handleRemovePackage(index)}
                      disabled={(form.variants || []).length <= 1}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) }
                      }}
                    >
                      <i className='tabler-trash' style={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            ))}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={handleClose} color='inherit' sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant='contained'
          color='primary'
          disabled={!form.name || (form.variants || []).length === 0 || isPending}
          onClick={handleSave}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
            fontWeight: 700
          }}
          startIcon={isPending ? <i className='tabler-loader animate-spin' /> : null}
        >
          {isEdit ? 'Save Product' : 'Save Product'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProductCreateEditModal
