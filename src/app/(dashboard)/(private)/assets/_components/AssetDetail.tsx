'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

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
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { AssetStatus, useGetApiV1AssetsId, useGetApiV1Attachments } from '@generated/core-api'

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

const formatCurrency = (n?: number | null) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
    : '$0.00'

const statusConfig: Record<AssetStatus, { label: AssetStatus; hex: string }> = {
  Active: { label: 'Active', hex: '#10b981' },
  Sold: { label: 'Sold', hex: '#6366f1' },
  Broken: { label: 'Broken', hex: '#ef4444' },
  Discarded: { label: 'Discarded', hex: '#6b7280' }
}

const isAssetStatus = (value?: string | null): value is AssetStatus => {
  if (!value) {
    return false
  }

  return (Object.values(AssetStatus) as string[]).includes(value)
}

function warrantyMonthsLeft(expiryStr?: string | null): number {
  if (!expiryStr) return 0
  const now = new Date()
  const expiry = new Date(expiryStr)
  const months = (expiry.getFullYear() - now.getFullYear()) * 12 + expiry.getMonth() - now.getMonth()

  return Math.max(0, months)
}

// ─── Timeline event type ──────────────────────────────────────────────────────
interface TimelineEvent {
  id: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  date: string
  description: string
  badge?: { label: string; color: string }
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface AssetDetailProps {
  assetId: string
}

const AssetDetail = ({ assetId }: AssetDetailProps) => {
  const router = useRouter()

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

  const { data, isLoading } = useGetApiV1AssetsId(assetId, {
    query: { staleTime: 5 * 60 * 1000 } // 5 min cache — significantly reduces API calls
  })

  const asset = data?.result

  // Attachments query with caching
  const { data: attachmentsData } = useGetApiV1Attachments(
    { targetId: assetId, targetType: 'Asset' },
    {
      query: { staleTime: 5 * 60 * 1000 } // 5 min cache
    }
  )

  const allAttachments = useMemo(() => attachmentsData?.result ?? [], [attachmentsData])
  const primaryImage = useMemo(() => allAttachments.find(a => a.purpose === 'PrimaryImage') ?? null, [allAttachments])
  const attachments = useMemo(() => allAttachments.filter(a => a.purpose !== 'PrimaryImage'), [allAttachments])

  const status = isAssetStatus(asset?.status) ? statusConfig[asset.status] : statusConfig.Active

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  const daysInUse = asset?.purchaseDate
    ? Math.floor((now - new Date(asset.purchaseDate).getTime()) / (24 * 60 * 60 * 1000))
    : null

  const warrantyMonths = warrantyMonthsLeft(asset?.warrantyExpiryDate)
  const warrantyIsActive = asset?.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate) > new Date() : false

  // Parse specs JSON
  const specsEntries: [string, string][] = useMemo(() => {
    try {
      const obj = JSON.parse(asset?.specs ?? '{}')

      return Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined) as [string, string][]
    } catch {
      return []
    }
  }, [asset?.specs])

  // Build timeline events from asset data
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = []

    if (asset?.status === 'Broken') {
      events.push({
        id: 'broken',
        icon: 'tabler-alert-triangle',
        iconBg: '#ef44441a',
        iconColor: '#ef4444',
        title: 'Asset Marked as Broken',
        date: formatDate(asset?.warrantyExpiryDate) ?? 'Recent',
        description: 'Asset status changed to Broken. Pending repair or replacement.'
      })
    }

    if (asset?.purchaseDate) {
      events.push({
        id: 'purchase',
        icon: 'tabler-shopping-cart',
        iconBg: '#6366f11a',
        iconColor: '#6366f1',
        title: 'Asset Purchased',
        date: formatDate(asset.purchaseDate)!,
        description: `${asset.name} was purchased${asset.brandName ? ` from ${asset.brandName}` : ''} for ${formatCurrency(asset.initialCost)}.`,
        badge: asset.initialCost ? { label: formatCurrency(asset.initialCost), color: '#6366f1' } : undefined
      })
    }

    events.push({
      id: 'registered',
      icon: 'tabler-package-import',
      iconBg: '#10b9811a',
      iconColor: '#10b981',
      title: 'Asset Registered in System',
      date: formatDate(asset?.purchaseDate ?? asset?.warrantyExpiryDate) ?? 'Jan 1, 2023',
      description: `${asset?.name ?? 'Asset'} was registered${asset?.location ? ` and assigned to ${asset.location}` : ''}.`
    })

    return events
  }, [asset])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Skeleton height={32} width='30%' />
        <Skeleton height={56} width='60%' />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={120} variant='rounded' />
          ))}
        </Box>
        <Skeleton height={400} variant='rounded' />
      </Box>
    )
  }

  if (!asset) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* ─── Breadcrumb ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {['Dashboard', 'Assets', asset.name ?? ''].map((seg, i, arr) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {i > 0 && <i className='tabler-chevron-right' style={{ fontSize: 14, opacity: 0.4 }} />}
            <Typography
              variant='body2'
              color={i === arr.length - 1 ? 'text.primary' : 'text.secondary'}
              fontWeight={i === arr.length - 1 ? 600 : 400}
              sx={i < arr.length - 1 ? { cursor: 'pointer', '&:hover': { color: 'primary.main' } } : undefined}
              onClick={i === 0 ? () => router.push('/') : i === 1 ? () => router.push('/assets') : undefined}
            >
              {seg}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant='h3' fontWeight={900} letterSpacing={-1} sx={{ lineHeight: 1.1 }}>
            {asset.name}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            {asset.categoryName && (
              <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: 'action.selected' }}>
                <Typography variant='caption' fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {asset.categoryName}
                </Typography>
              </Box>
            )}
            <Typography variant='body2' color='text.secondary'>
              Asset ID:{' '}
              <Box component='span' sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
                #{asset.id?.slice(0, 12).toUpperCase()}
              </Box>
            </Typography>
            {asset.location && (
              <>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                <Typography variant='body2' color='text.secondary'>
                  Location:{' '}
                  <Box component='span' fontWeight={500} color='text.primary'>
                    {asset.location}
                  </Box>
                </Typography>
              </>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-printer' style={{ fontSize: 18 }} />}
            sx={{ fontWeight: 700 }}
          >
            Print Label
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-pencil' style={{ fontSize: 18 }} />}
            onClick={() => router.push(`/assets/${assetId}/edit`)}
            sx={{ fontWeight: 700 }}
          >
            Edit Asset
          </Button>
        </Box>
      </Box>

      {/* ─── KPI Cards Section ═════════════════════════════════════════════ */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <i className='tabler-chart-dots' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant='subtitle1' fontWeight={700}>
            Asset Overview
          </Typography>
        </Box>

        {/* KPI Grid */}
        <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {/* Card 1: Initial Cost */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative', py: 1 }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07, pointerEvents: 'none' }}>
              <i className='tabler-coin' style={{ fontSize: 56, color: 'var(--mui-palette-primary-main)' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>
              Initial Cost
            </Typography>
            <Typography variant='h4' fontWeight={700} letterSpacing={-0.5} sx={{ position: 'relative', zIndex: 1 }}>
              {formatCurrency(asset.initialCost)}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              Purchase price on record
            </Typography>
          </Box>

          {/* Card 2: Days in Use */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative', py: 1 }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07, pointerEvents: 'none' }}>
              <i className='tabler-clock' style={{ fontSize: 56, color: 'var(--mui-palette-success-main)' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>
              Days in Use
            </Typography>
            <Typography variant='h4' fontWeight={700} letterSpacing={-0.5} sx={{ position: 'relative', zIndex: 1 }}>
              {daysInUse !== null ? `${daysInUse} Days` : '—'}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              {asset.purchaseDate ? `Since ${formatDate(asset.purchaseDate)}` : 'No purchase date set'}
            </Typography>
          </Box>

          {/* Card 3: Warranty Status */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative', py: 1 }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07, pointerEvents: 'none' }}>
              <i className='tabler-shield-check' style={{ fontSize: 56, color: 'var(--mui-palette-warning-main)' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>
              Warranty Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {warrantyIsActive && (
                <Box sx={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      bgcolor: '#10b981',
                      opacity: 0.7,
                      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                      '@keyframes ping': {
                        '0%': { transform: 'scale(1)', opacity: 0.7 },
                        '100%': { transform: 'scale(2.5)', opacity: 0 }
                      }
                    }}
                  />
                  <Box sx={{ position: 'absolute', inset: '2px', borderRadius: '50%', bgcolor: '#10b981' }} />
                </Box>
              )}
              <Typography variant='h4' fontWeight={700} letterSpacing={-0.5} sx={{ position: 'relative', zIndex: 1 }}>
                {asset.warrantyExpiryDate ? (warrantyIsActive ? 'Active' : 'Expired') : 'N/A'}
              </Typography>
            </Box>
            <Typography variant='caption' color='text.disabled'>
              {asset.warrantyExpiryDate
                ? warrantyIsActive
                  ? `Expires in ${warrantyMonths} months`
                  : `Expired ${formatDate(asset.warrantyExpiryDate)}`
                : 'No warranty information'}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* ─── Split Section ────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* Left: Technical Specifications */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant='subtitle1' fontWeight={700}>
                Technical Specifications
              </Typography>
              {specsEntries.length > 8 && (
                <Typography
                  variant='caption'
                  color='primary.main'
                  sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                >
                  View All
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 3, flex: 1 }}>
              {specsEntries.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '42% 1fr', rowGap: 0 }}>
                  {specsEntries.slice(0, 8).map(([key, value], i) => (
                    <>
                      <Typography
                        key={`k-${i}`}
                        variant='body2'
                        color='text.secondary'
                        sx={{ py: 1.75, borderBottom: '1px solid', borderColor: 'divider', pr: 2 }}
                      >
                        {key}
                      </Typography>
                      <Box key={`v-${i}`} sx={{ py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {key.toLowerCase().includes('serial') ? (
                          <Box
                            component='span'
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 13,
                              fontWeight: 600,
                              bgcolor: 'action.selected',
                              px: 1,
                              py: 0.25,
                              borderRadius: 0.75
                            }}
                          >
                            {String(value)}
                          </Box>
                        ) : (
                          <Typography variant='body2' fontWeight={500}>
                            {String(value)}
                          </Typography>
                        )}
                      </Box>
                    </>
                  ))}
                  {/* Always show basic fields */}
                  {asset.brandName && (
                    <>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ py: 1.75, borderBottom: '1px solid', borderColor: 'divider', pr: 2 }}
                      >
                        Brand
                      </Typography>
                      <Typography
                        variant='body2'
                        fontWeight={500}
                        sx={{ py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        {asset.brandName}
                      </Typography>
                    </>
                  )}
                  {asset.purchaseDate && (
                    <>
                      <Typography variant='body2' color='text.secondary' sx={{ py: 1.75, pr: 2 }}>
                        Purchase Date
                      </Typography>
                      <Typography variant='body2' fontWeight={500} sx={{ py: 1.75 }}>
                        {formatDate(asset.purchaseDate)}
                      </Typography>
                    </>
                  )}
                </Box>
              ) : (
                <Box>
                  {/* No specs — show asset metadata as specs */}
                  {(() => {
                    const rows: Array<{ label: string; value: React.ReactNode }> = [
                      {
                        label: 'Status',
                        value: (
                          <Chip
                            label={status.label}
                            size='small'
                            sx={{
                              height: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: alpha(status.hex, 0.12),
                              color: status.hex,
                              border: `1px solid ${alpha(status.hex, 0.3)}`
                            }}
                          />
                        )
                      },
                      ...(asset.brandName ? [{ label: 'Brand', value: asset.brandName }] : []),
                      ...(asset.location ? [{ label: 'Location', value: asset.location }] : []),
                      ...(asset.initialCost
                        ? [{ label: 'Initial Cost', value: formatCurrency(asset.initialCost) }]
                        : []),
                      ...(asset.purchaseDate
                        ? [{ label: 'Purchase Date', value: formatDate(asset.purchaseDate) }]
                        : []),
                      ...(asset.warrantyExpiryDate
                        ? [{ label: 'Warranty Expiry', value: formatDate(asset.warrantyExpiryDate) }]
                        : [])
                    ]

                    return (
                      <Box sx={{ display: 'grid', gridTemplateColumns: '42% 1fr', rowGap: 0 }}>
                        {rows.map(({ label, value }, i) => (
                          <>
                            <Typography
                              key={`k-${i}`}
                              variant='body2'
                              color='text.secondary'
                              sx={{
                                py: 1.75,
                                borderBottom: i < rows.length - 1 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                pr: 2
                              }}
                            >
                              {label}
                            </Typography>
                            <Box
                              key={`v-${i}`}
                              sx={{
                                py: 1.75,
                                borderBottom: i < rows.length - 1 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {typeof value === 'string' ? (
                                <Typography variant='body2' fontWeight={500}>
                                  {value}
                                </Typography>
                              ) : (
                                value
                              )}
                            </Box>
                          </>
                        ))}
                      </Box>
                    )
                  })()}
                </Box>
              )}
            </Box>

            {/* Image preview */}
            <Box
              sx={{
                mx: 3,
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}
              >
                {primaryImage?.downloadUrl ? (
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
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2' fontWeight={500}>
                  Primary Image
                </Typography>
                <Typography variant='caption' color='text.disabled'>
                  {primaryImage?.downloadUrl ? primaryImage.fileName : 'No image uploaded yet'}
                </Typography>
              </Box>
              {primaryImage?.downloadUrl && (
                <Box
                  component='a'
                  href={primaryImage.downloadUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}
                >
                  <i className='tabler-eye' style={{ fontSize: 20 }} />
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right: Maintenance Timeline */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant='subtitle1' fontWeight={700}>
                Maintenance Timeline
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<i className='tabler-filter' style={{ fontSize: 14 }} />}
                  sx={{ fontSize: 12, py: 0.5, px: 1.5 }}
                >
                  Filter
                </Button>
                <Button
                  size='small'
                  variant='contained'
                  startIcon={<i className='tabler-plus' style={{ fontSize: 14 }} />}
                  sx={{ fontSize: 12, py: 0.5, px: 1.5 }}
                >
                  Log Event
                </Button>
              </Box>
            </Box>

            <Box sx={{ p: 3, flex: 1, position: 'relative' }}>
              {/* Vertical timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 51,
                  top: 24,
                  bottom: 24,
                  width: '1px',
                  bgcolor: 'divider'
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {timelineEvents.map(event => (
                  <Box key={event.id} sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1 }}>
                    {/* Icon circle */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: event.iconBg,
                        border: '4px solid',
                        borderColor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 1
                      }}
                    >
                      <i className={event.icon} style={{ fontSize: 20, color: event.iconColor }} />
                    </Box>

                    {/* Event card */}
                    <Card
                      variant='outlined'
                      sx={{
                        flex: 1,
                        p: 2.5,
                        bgcolor: 'action.hover',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant='body2' fontWeight={700}>
                          {event.title}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.disabled'
                          fontWeight={500}
                          sx={{ whiteSpace: 'nowrap', ml: 2 }}
                        >
                          {event.date}
                        </Typography>
                      </Box>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: event.badge ? 1.5 : 0 }}>
                        {event.description}
                      </Typography>
                      {event.badge && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 1,
                            bgcolor: alpha(event.badge.color, 0.1),
                            color: event.badge.color,
                            border: `1px solid ${alpha(event.badge.color, 0.2)}`,
                            fontSize: 12,
                            fontWeight: 700
                          }}
                        >
                          {event.badge.label}
                        </Box>
                      )}
                    </Card>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* View full history footer */}
            <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', mt: 'auto' }}>
              <Button
                fullWidth
                size='small'
                color='inherit'
                endIcon={<i className='tabler-arrow-down' style={{ fontSize: 16 }} />}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                View Full History
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Attachments Section ─────────────────────────────────────── */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant='h6' fontWeight={700}>
            Attachments &amp; Receipts
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {attachments.length > 0 ? `${attachments.length} file(s)` : 'No attachments'}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
          {attachments.map(att => (
            <Box
              key={att.id}
              onClick={() => handleOpenPreview(att)}
              sx={{
                aspectRatio: '4/3',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': { borderColor: 'primary.main' },
                '&:hover .doc-overlay': { opacity: 1 }
              }}
            >
              {att.contentType?.startsWith('image/') ? (
                <Box
                  component='img'
                  src={att.downloadUrl ?? ''}
                  alt={att.fileName ?? ''}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <i className='tabler-file-description' style={{ fontSize: 36, opacity: 0.3 }} />
                  <Box sx={{ px: 2, pb: 2, textAlign: 'center' }}>
                    <Typography variant='caption' fontWeight={600} sx={{ display: 'block', lineHeight: 1.3 }}>
                      {att.fileName}
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : '—'}
                    </Typography>
                  </Box>
                </>
              )}
              <Box
                className='doc-overlay'
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  borderRadius: 0.75,
                  p: 0.5,
                  opacity: 0,
                  transition: 'opacity 0.15s'
                }}
              >
                <i className='tabler-download' style={{ fontSize: 16, color: '#fff' }} />
              </Box>
              {att.contentType?.startsWith('image/') && (
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
                    {att.fileName}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

          {attachments.length === 0 && (
            <Box
              sx={{
                aspectRatio: '4/3',
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                opacity: 0.5
              }}
            >
              <i className='tabler-files-off' style={{ fontSize: 28, opacity: 0.4 }} />
              <Typography variant='caption' color='text.disabled'>
                No attachments
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

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
    </Box>
  )
}

export default AssetDetail
