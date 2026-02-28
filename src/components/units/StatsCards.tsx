'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StatsCardsProps {
  total: number
  active: number
  review: number
  categoryCount: number
}

interface StatItem {
  title: string
  value: number
  subtitle: string
  icon: string
  color: string
  bgColor: string
}

// ─── Component ─────────────────────────────────────────────────────────────────
const StatsCards = ({ total, active, review, categoryCount }: StatsCardsProps) => {
  const items: StatItem[] = [
    {
      title: 'Total Units',
      value: total,
      subtitle: 'Registered units',
      icon: 'tabler-ruler-measure',
      color: '#7C4DFF',
      bgColor: '#EDE7F6'
    },
    {
      title: 'Active Conversions',
      value: active,
      subtitle: `Standardized, Across ${categoryCount} categories`,
      icon: 'tabler-arrows-exchange',
      color: '#00BFA5',
      bgColor: '#E0F2F1'
    },
    {
      title: 'Pending Reviews',
      value: review,
      subtitle: 'Requires admin approval',
      icon: 'tabler-clock',
      color: '#FF6D00',
      bgColor: '#FFF3E0'
    }
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
      {items.map(item => (
        <Card key={item.title} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {item.title}
              </Typography>
              <Typography variant='h4' fontWeight={700} sx={{ my: 1 }}>
                {item.value}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {item.subtitle}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: item.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={item.icon} style={{ fontSize: 24, color: item.color }} />
            </Box>
          </Box>
        </Card>
      ))}
    </Box>
  )
}

export default StatsCards
