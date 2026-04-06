'use client'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { useGetApiV1AssetsId } from '@generated/core-api'

// ─── Config ────────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; hex: string }> = {
  Active: { label: 'Active', hex: '#10b981' },
  Sold: { label: 'Sold', hex: '#6366f1' },
  Broken: { label: 'Broken', hex: '#ef4444' },
  Discarded: { label: 'Discarded', hex: '#6b7280' }
}

function warrantyInfo(purchaseDateStr?: string | null, expiryStr?: string | null): [number, number, boolean] {
  if (!expiryStr) return [0, 0, false]
  const now = Date.now()
  const expiry = new Date(expiryStr).getTime()
  const start = purchaseDateStr ? new Date(purchaseDateStr).getTime() : expiry - 365 * 24 * 60 * 60 * 1000
  const total = expiry - start
  const remaining = expiry - now
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0
  const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000))

  return [pct, daysLeft, daysLeft <= 0]
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const formatCurrency = (n?: number | null) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
    : '—'

// ─── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '42% 1fr',
      alignItems: 'start',
      py: 1.5,
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 500, pt: 0.25 }}>
      {label}
    </Typography>
    <Typography variant='body2' fontWeight={500}>
      {value ?? '—'}
    </Typography>
  </Box>
)

// ─── Props ─────────────────────────────────────────────────────────────────────
interface AssetQuickViewDrawerProps {
  assetId: string | null
  onClose: () => void
  onViewDetail: (id: string) => void
  onEdit: (id: string) => void
}

// ─── Component ─────────────────────────────────────────────────────────────────
const AssetQuickViewDrawer = ({ assetId, onClose, onViewDetail, onEdit }: AssetQuickViewDrawerProps) => {
  const { data, isLoading } = useGetApiV1AssetsId(assetId!, {
    query: { enabled: Boolean(assetId) }
  })

  const asset = data?.result

  const status = statusConfig[asset?.status ?? ''] ?? statusConfig['Active']
  const [warrantyPct, daysLeft, isExpired] = warrantyInfo(asset?.purchaseDate, asset?.warrantyExpiryDate)
  const isExpiringSoon = !isExpired && daysLeft > 0 && daysLeft <= 30
  const warrantyColor = isExpired ? '#ef4444' : isExpiringSoon ? '#ff9f43' : '#10b981'

  // Parse specs
  const specsObj: Record<string, string> = (() => {
    try {
      return JSON.parse(asset?.specs ?? '{}')
    } catch {
      return {}
    }
  })()

  const specsEntries = Object.entries(specsObj).filter(([, v]) => v !== '' && v !== null && v !== undefined)

  // Days in use
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  const daysInUse = asset?.purchaseDate
    ? Math.floor((now - new Date(asset.purchaseDate).getTime()) / (24 * 60 * 60 * 1000))
    : null

  return (
    <Drawer
      anchor='right'
      open={Boolean(assetId)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 480 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper'
          }
        }
      }}
    >
      {/* ─── Header ────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'action.selected',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className='tabler-package' style={{ fontSize: 20, opacity: 0.5 }} />
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1 }}>
              Quick View
            </Typography>
            <Typography variant='subtitle2' fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {isLoading ? <Skeleton width={140} /> : (asset?.name ?? '—')}
            </Typography>
          </Box>
        </Box>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* ─── Body ──────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Status + ID row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isLoading ? (
            <Skeleton variant='rounded' width={72} height={22} />
          ) : (
            <Chip
              label={status.label}
              size='small'
              sx={{
                fontWeight: 700,
                fontSize: 11,
                bgcolor: alpha(status.hex, 0.12),
                color: status.hex,
                border: `1px solid ${alpha(status.hex, 0.3)}`,
                height: 22
              }}
            />
          )}
          <Typography variant='caption' color='text.disabled' fontFamily='monospace'>
            {isLoading ? <Skeleton width={80} /> : `#${asset?.id?.slice(0, 8).toUpperCase() ?? '—'}`}
          </Typography>
        </Box>

        {/* KPI strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {[
            {
              label: 'Initial Cost',
              value: isLoading ? null : formatCurrency(asset?.initialCost),
              icon: 'tabler-coin',
              color: '#7367f0'
            },
            {
              label: 'Days in Use',
              value: isLoading ? null : daysInUse !== null ? `${daysInUse} days` : '—',
              icon: 'tabler-clock',
              color: '#10b981'
            }
          ].map(({ label, value, icon, color }) => (
            <Box
              key={label}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ position: 'absolute', right: -4, top: -4, opacity: 0.08, color, pointerEvents: 'none' }}>
                <i className={icon} style={{ fontSize: 52 }} />
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 500 }}>
                {label}
              </Typography>
              <Typography variant='subtitle1' fontWeight={700} sx={{ mt: 0.25 }}>
                {value ?? <Skeleton width={80} />}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Warranty bar */}
        {(isLoading || asset?.warrantyExpiryDate) && (
          <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='caption' color='text.secondary' fontWeight={500}>
                Warranty
              </Typography>
              {isLoading ? (
                <Skeleton width={60} />
              ) : isExpired ? (
                <Typography variant='caption' color='error'>
                  Expired
                </Typography>
              ) : (
                <Typography
                  variant='caption'
                  sx={{ color: isExpiringSoon ? '#ff9f43' : 'text.secondary', fontWeight: 600 }}
                >
                  {daysLeft} days remaining
                </Typography>
              )}
            </Box>
            {isLoading ? (
              <Skeleton variant='rounded' height={6} />
            ) : (
              <LinearProgress
                variant='determinate'
                value={warrantyPct}
                sx={{
                  height: 6,
                  borderRadius: 5,
                  bgcolor: 'action.selected',
                  '& .MuiLinearProgress-bar': { bgcolor: warrantyColor, borderRadius: 5 }
                }}
              />
            )}
            {!isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
                <Typography variant='caption' color='text.disabled'>
                  {formatDate(asset?.purchaseDate)}
                </Typography>
                <Typography variant='caption' color='text.disabled'>
                  {formatDate(asset?.warrantyExpiryDate)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Basic info grid */}
        <Box>
          <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            Asset Info
          </Typography>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
          ) : (
            <>
              <InfoRow label='Category' value={asset?.categoryName} />
              <InfoRow label='Brand' value={asset?.brandName} />
              <InfoRow label='Location' value={asset?.location} />
              <InfoRow label='Purchase Date' value={formatDate(asset?.purchaseDate)} />
              <InfoRow label='Warranty Expiry' value={formatDate(asset?.warrantyExpiryDate)} />
            </>
          )}
        </Box>

        {/* Specs */}
        {!isLoading && specsEntries.length > 0 && (
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
              Specifications
            </Typography>
            <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {specsEntries.map(([key, value], i) => (
                <Box
                  key={key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '42% 1fr',
                    px: 2,
                    py: 1.5,
                    alignItems: 'start',
                    bgcolor: i % 2 === 0 ? 'transparent' : 'action.hover',
                    borderBottom: i < specsEntries.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant='caption' color='text.secondary' fontWeight={500} sx={{ pt: 0.25 }}>
                    {key}
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* ─── Footer actions ─────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
          flexShrink: 0
        }}
      >
        <Button
          variant='contained'
          fullWidth
          startIcon={<i className='tabler-eye' style={{ fontSize: 17 }} />}
          onClick={() => assetId && onViewDetail(assetId)}
          disabled={!asset}
        >
          View Details
        </Button>
        <Button
          variant='outlined'
          fullWidth
          startIcon={<i className='tabler-pencil' style={{ fontSize: 17 }} />}
          onClick={() => assetId && onEdit(assetId)}
          disabled={!asset}
        >
          Edit
        </Button>
      </Box>
    </Drawer>
  )
}

export default AssetQuickViewDrawer
