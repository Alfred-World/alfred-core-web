'use client'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type { BrandDto } from '@generated/api'
import { getInitials } from '@/utils/getInitials'

// Category tag color mapping
const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  technology: 'primary',
  tech: 'primary',
  energy: 'error',
  retail: 'info',
  gold: 'warning',
  'f&b': 'success',
  services: 'secondary',
  saas: 'primary'
}

const getCategoryColor = (name: string) => {
  return CATEGORY_COLORS[name.toLowerCase()] ?? 'default'
}

interface BrandCardProps {
  brand: BrandDto
}

const BrandCard = ({ brand }: BrandCardProps) => {
  const router = useRouter()
  const firstCategory = brand.categories?.[0]

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardActionArea
        onClick={() => router.push(`/brands/${brand.id}/edit`)}
        sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {/* Category Badge */}
        {firstCategory && (
          <Chip
            label={firstCategory.name}
            color={getCategoryColor(firstCategory.name ?? '')}
            size='small'
            sx={{ position: 'absolute', top: 12, right: 12 }}
          />
        )}

        {/* Logo / Avatar */}
        {brand.logoUrl ? (
          <Avatar src={brand.logoUrl} variant='rounded' sx={{ width: 48, height: 48, mb: 3 }} />
        ) : (
          <Avatar
            variant='rounded'
            sx={{
              width: 48,
              height: 48,
              mb: 3,
              bgcolor: 'primary.main',
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            {getInitials(brand.name ?? '')}
          </Avatar>
        )}

        {/* Brand Info */}
        <Typography variant='subtitle1' fontWeight={600} noWrap sx={{ width: '100%' }}>
          {brand.name}
        </Typography>

        {brand.website && (
          <Typography variant='caption' color='primary.main' noWrap sx={{ width: '100%' }}>
            {brand.website}
          </Typography>
        )}

        {brand.supportPhone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <i className='tabler-phone' style={{ fontSize: 14, opacity: 0.6 }} />
            <Typography variant='caption' color='text.secondary'>
              {brand.supportPhone}
            </Typography>
          </Box>
        )}
      </CardActionArea>
    </Card>
  )
}

export default BrandCard
