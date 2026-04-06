'use client'

import { alpha, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { ProductDto } from '@/generated/core-api'
import { AccountProductType } from '@/generated/core-api'

interface ProductDetailDrawerProps {
  open: boolean
  onClose: () => void
  product?: ProductDto | null
  onEdit?: (product: ProductDto) => void
}

const ProductDetailDrawer = ({ open, onClose, product, onEdit }: ProductDetailDrawerProps) => {
  const theme = useTheme()

  if (!product) return null

  const isHardware = product.productType === AccountProductType.Other // Fallback logic or map hardware types if exist

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 480 },
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none'
          }
        }
      }}
    >
      {/* HEADER SECTION */}
      <Box sx={{ p: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{ color: 'text.secondary', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            PRODUCT DETAIL
          </Typography>
          <Typography variant='h4' fontWeight={800} sx={{ mt: 1, mb: 0.5, color: 'text.primary' }}>
            {product.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                boxShadow: `0 0 8px ${theme.palette.primary.main}`
              }}
            />
            <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {product.productType} &bull; ID-{product.id?.substring(0, 8).toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
          sx={{ color: 'text.secondary', bgcolor: alpha(theme.palette.text.secondary, 0.08) }}
        >
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4, flexGrow: 1, overflowY: 'auto' }}>
        {/* HERO IMAGE PLACEHOLDER */}
        <Box
          sx={{
            width: '100%',
            height: 200,
            borderRadius: 4,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.4)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.2),
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              filter: 'blur(30px)'
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              left: 20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.info.main, 0.1),
              filter: 'blur(20px)'
            }}
          />

          <i
            className={isHardware ? 'tabler-cpu' : 'tabler-box'}
            style={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.5) }}
          />
        </Box>

        {/* PRICING PACKAGES */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant='caption'
            fontWeight={700}
            sx={{ color: 'text.primary', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            PRICING PACKAGES
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => onEdit?.(product)}
          >
            Manage All
          </Typography>
        </Box>

        <Stack spacing={2}>
          {(product.variants || []).length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              No packages set for this product.
            </Typography>
          )}
          {(product.variants || []).map((variant, index) => {
            const isPopular = index === 1 || (index === 0 && (product.variants || []).length === 1) // Just visual placeholder logic for mockup matching

            return (
              <Box
                key={variant.id || `variant-${index}`}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: isPopular ? 'primary.main' : 'divider',
                  position: 'relative'
                }}
              >
                {isPopular && (
                  <Chip
                    label='POPULAR'
                    size='small'
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 16,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 800,
                      fontSize: '0.6rem',
                      height: 20
                    }}
                  />
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant='subtitle1' fontWeight={700} sx={{ color: 'text.primary' }}>
                      {variant.name || 'Standard Tier'}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      Included with full access
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='h5' fontWeight={800} sx={{ color: 'text.primary' }}>
                      <Typography
                        component='span'
                        sx={{ fontSize: '1rem', verticalAlign: 'top', mr: 0.5, color: 'text.secondary' }}
                      >
                        ₫
                      </Typography>
                      {Number(variant.price || 0).toLocaleString('vi-VN')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.5px' }}
                    >
                      PER PACKAGE
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.divider, 0.5) }} />

                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Typography
                    variant='caption'
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontWeight: 500 }}
                  >
                    <i className='tabler-shield-check' style={{ color: theme.palette.success.main, fontSize: 14 }} />
                    {variant.warrantyDays} Day Warranty
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontWeight: 500 }}
                  >
                    <i className='tabler-headset' style={{ fontSize: 14 }} />
                    24/7 Support
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Stack>

        {/* DESCRIPTION */}
        {product.description && (
          <Box sx={{ mt: 4 }}>
            <Typography
              variant='caption'
              fontWeight={700}
              sx={{ color: 'text.primary', letterSpacing: '1px', textTransform: 'uppercase', mb: 1, display: 'block' }}
            >
              DESCRIPTION
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {product.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* FOOTER ACTIONS */}
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)',
          display: 'flex',
          gap: 2
        }}
      >
        <Button
          variant='contained'
          color='primary'
          fullWidth
          startIcon={<i className='tabler-pencil' />}
          onClick={() => {
            if (onEdit) onEdit(product)
          }}
          sx={{ py: 1.2, borderRadius: 2, fontWeight: 700 }}
        >
          Edit Product
        </Button>
        <Button
          variant='outlined'
          color='inherit'
          fullWidth
          startIcon={<i className='tabler-archive' />}
          sx={{ py: 1.2, borderRadius: 2, fontWeight: 600, color: 'text.secondary' }}
        >
          Archive
        </Button>
      </Box>
    </Drawer>
  )
}

export default ProductDetailDrawer
