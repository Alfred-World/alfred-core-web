'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'

import {
  getGetApiV1AssetsQueryKey,
  useDeleteApiV1AssetsId,
  useGetApiV1Assets
} from '@generated/api'
import type { AssetDto } from '@generated/api'
import { dsl } from '@/utils/dslQueryBuilder'
import AssetQuickViewDrawer from './AssetQuickViewDrawer'

// ─── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; hex: string }> = {
  Active:    { label: 'Active',    hex: '#10b981' },
  Sold:      { label: 'Sold',      hex: '#6366f1' },
  Broken:    { label: 'Broken',    hex: '#ef4444' },
  Discarded: { label: 'Discarded', hex: '#6b7280' }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Returns [pct, daysLeft, isExpired] */
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

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: string
  trend?: string
  trendUp?: boolean
}

const StatCard = ({ label, value, icon, color, trend, trendUp }: StatCardProps) => (
  <Card
    sx={{
      p: 3,
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Box
      sx={{
        position: 'absolute', right: -8, top: -8,
        opacity: 0.06, pointerEvents: 'none', color
      }}
    >
      <i className={icon} style={{ fontSize: 88 }} />
    </Box>
    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
      {label}
    </Typography>
    <Typography variant='h4' fontWeight={800} sx={{ lineHeight: 1.1, mb: trend ? 1 : 0 }}>
      {value}
    </Typography>
    {trend && (
      <Box
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4,
          px: 1, py: 0.3, borderRadius: 1,
          bgcolor: alpha(trendUp ? '#10b981' : '#ef4444', 0.12),
          color: trendUp ? '#10b981' : '#ef4444',
          fontSize: 11, fontWeight: 700
        }}
      >
        <i className={trendUp ? 'tabler-trending-up' : 'tabler-trending-down'} style={{ fontSize: 13 }} />
        {trend}
      </Box>
    )}
  </Card>
)

// ─── Component ─────────────────────────────────────────────────────────────────
const AssetDirectory = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const pageSize = 15

  // ─── Filters ────────────────────────────────────────────────────────────────
  const filter = useMemo(() => {
    const builder = dsl()

    if (search.trim()) builder.string('name').contains(search.trim())
    if (statusFilter) builder.string('status').eq(statusFilter)

    return builder.build() || undefined
  }, [search, statusFilter])

  // ─── Stats queries ─────────────────────────────────────────────────────────
  const { data: totalData }  = useGetApiV1Assets({ page: 1, pageSize: 1 })
  const { data: activeData } = useGetApiV1Assets({ page: 1, pageSize: 1, filter: "status == 'Active'" })
  const { data: brokenData } = useGetApiV1Assets({ page: 1, pageSize: 1, filter: "status == 'Broken'" })

  const statsTotal  = totalData?.result?.total  ?? 0
  const statsActive = activeData?.result?.total ?? 0
  const statsBroken = brokenData?.result?.total ?? 0

  // ─── Main data ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useGetApiV1Assets({ page, pageSize, filter, sort: '-createdAt' })
  const deleteMutation = useDeleteApiV1AssetsId()

  const assets     = useMemo(() => data?.result?.items ?? [], [data?.result?.items])
  const total      = data?.result?.total     ?? 0
  const totalPages = data?.result?.totalPages ?? 1

  const estimatedValue = useMemo(() => {
    const sum = assets.reduce((acc, a) => acc + (a.initialCost ?? 0), 0)

    return new Intl.NumberFormat('vi-VN', {
      notation: 'compact', currency: 'VND', style: 'currency', maximumFractionDigits: 1
    }).format(sum)
  }, [assets])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this asset?')) return
    await deleteMutation.mutateAsync({ id })
    await queryClient.invalidateQueries({ queryKey: getGetApiV1AssetsQueryKey() })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant='h4' fontWeight={800} letterSpacing={-0.5}>
            Physical Asset Inventory
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Track, manage and maintain all physical assets and equipment.
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' style={{ fontSize: 18 }} />}
          onClick={() => router.push('/assets/new')}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Add Asset
        </Button>
      </Box>

      {/* ─── Stats Cards ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
        <StatCard label='Total Assets'  value={statsTotal.toLocaleString()}  icon='tabler-package'        color='#7367f0' />
        <StatCard label='Active'        value={statsActive.toLocaleString()} icon='tabler-checks'         color='#10b981' trend='active' trendUp />
        <StatCard label='Needs Repair'  value={statsBroken.toLocaleString()} icon='tabler-alert-triangle' color='#ff9f43' trend='broken' trendUp={false} />
        <StatCard label='Est. Value'    value={estimatedValue}               icon='tabler-coin'           color='#7367f0' />
      </Box>

      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size='small'
              placeholder='Search assets, tags, locations...'
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              sx={{ minWidth: 260 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search' style={{ fontSize: 17, opacity: 0.5 }} />
                    </InputAdornment>
                  )
                }
              }}
            />
            <TextField
              select size='small' label='Status'
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value=''>All Statuses</MenuItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </TextField>
            {(search || statusFilter) && (
              <Chip
                label={`Clear filters`}
                size='small'
                variant='outlined'
                onDelete={() => { setSearch(''); setStatusFilter('') }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { icon: 'tabler-refresh', tip: 'Refresh', onClick: () => queryClient.invalidateQueries({ queryKey: getGetApiV1AssetsQueryKey() }) },
              { icon: 'tabler-download', tip: 'Export CSV' }
            ].map(({ icon, tip, onClick }) => (
              <Tooltip key={tip} title={tip}>
                <IconButton size='small' onClick={onClick} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  <i className={icon} style={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Card>

      {/* ─── Table ───────────────────────────────────────────────────── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Asset', 'Category', 'Brand', 'Status', 'Location', 'Warranty', ''].map(h => (
                  <TableCell
                    key={h}
                    align={h === '' ? 'right' : 'left'}
                    sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', py: 1.5 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Box sx={{ height: 16, borderRadius: 1, bgcolor: 'action.hover', width: j === 0 ? '75%' : '55%' }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 12 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 80, height: 80, borderRadius: '50%', bgcolor: 'action.hover',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <i className='tabler-package-off' style={{ fontSize: 40, opacity: 0.35 }} />
                      </Box>
                      <Typography variant='h6' fontWeight={600} color='text.secondary'>No assets found</Typography>
                      <Typography variant='body2' color='text.disabled'>
                        Try adjusting your filters or add a new asset.
                      </Typography>
                      <Button
                        variant='outlined' size='small'
                        startIcon={<i className='tabler-plus' />}
                        onClick={() => router.push('/assets/new')}
                      >
                        Add First Asset
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset: AssetDto) => {
                  const status = statusConfig[asset.status ?? ''] ?? statusConfig['Active']
                  const [warrantyPct, daysLeft, isExpired] = warrantyInfo(asset.purchaseDate, asset.warrantyExpiryDate)
                  const isExpiringSoon = !isExpired && daysLeft > 0 && daysLeft <= 30
                  const warrantyColor = isExpired ? '#ef4444' : isExpiringSoon ? '#ff9f43' : '#10b981'

                  return (
                    <TableRow
                      key={asset.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .row-actions': { opacity: 0 },
                        '&:hover .row-actions': { opacity: 1 },
                        transition: 'background-color 0.15s'
                      }}
                      onClick={() => setQuickViewId(asset.id ?? null)}
                    >
                      {/* Asset name + ID */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{
                            width: 38, height: 38, borderRadius: 1.5,
                            bgcolor: 'action.selected',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <i className='tabler-package' style={{ fontSize: 20, opacity: 0.45 }} />
                          </Box>
                          <Box>
                            <Typography variant='body2' fontWeight={600}>{asset.name}</Typography>
                            <Typography variant='caption' color='text.disabled' fontFamily='monospace' sx={{ fontSize: 10 }}>
                              #{asset.id?.slice(0, 8).toUpperCase()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <i className='tabler-stack-2' style={{ fontSize: 15, opacity: 0.45 }} />
                          <Typography variant='body2' color='text.secondary'>{asset.categoryName ?? '—'}</Typography>
                        </Box>
                      </TableCell>

                      {/* Brand */}
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{asset.brandName ?? '—'}</Typography>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <Chip
                          label={status.label}
                          size='small'
                          sx={{
                            fontWeight: 600, fontSize: 11,
                            bgcolor: alpha(status.hex, 0.12),
                            color: status.hex,
                            border: `1px solid ${alpha(status.hex, 0.28)}`,
                            height: 22
                          }}
                        />
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{asset.location ?? '—'}</Typography>
                      </TableCell>

                      {/* Warranty progress bar */}
                      <TableCell sx={{ minWidth: 140 }}>
                        {asset.warrantyExpiryDate ? (
                          isExpired ? (
                            <Typography variant='caption' color='text.disabled' fontStyle='italic'>Expired</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <LinearProgress
                                variant='determinate'
                                value={warrantyPct}
                                sx={{
                                  flex: 1, maxWidth: 72, height: 5, borderRadius: 5, bgcolor: 'action.hover',
                                  '& .MuiLinearProgress-bar': { bgcolor: warrantyColor, borderRadius: 5 }
                                }}
                              />
                              <Typography variant='caption' fontWeight={500} sx={{ color: isExpiringSoon ? '#ff9f43' : 'text.secondary', whiteSpace: 'nowrap' }}>
                                {daysLeft}d
                              </Typography>
                            </Box>
                          )
                        ) : (
                          <Typography variant='caption' color='text.disabled'>—</Typography>
                        )}
                      </TableCell>

                      {/* Hover actions */}
                      <TableCell align='right'>
                        <Box
                          className='row-actions'
                          sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', transition: 'opacity 0.15s' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Tooltip title='Quick View'>
                            <IconButton size='small' onClick={e => { e.stopPropagation(); setQuickViewId(asset.id!) }}>
                              <i className='tabler-eye' style={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Edit'>
                            <IconButton size='small' onClick={e => { e.stopPropagation(); router.push(`/assets/${asset.id}/edit`) }}>
                              <i className='tabler-pencil' style={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton size='small' color='error' onClick={e => handleDelete(asset.id!, e)}>
                              <i className='tabler-trash' style={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer / Pagination */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover'
        }}>
          <Typography variant='body2' color='text.secondary'>
            {total === 0 ? 'No results' : (
              <>
                Showing{' '}
                <Box component='span' fontWeight={700} color='text.primary'>{((page - 1) * pageSize) + 1}</Box>
                {' '}–{' '}
                <Box component='span' fontWeight={700} color='text.primary'>{Math.min(page * pageSize, total)}</Box>
                {' '}of{' '}
                <Box component='span' fontWeight={700} color='text.primary'>{total}</Box>
                {' '}assets
              </>
            )}
          </Typography>
          {totalPages > 1 && (
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} shape='rounded' size='small' />
          )}
        </Box>
      </Card>

      {/* ─── Quick View Drawer ──────────────────────────────────────── */}
      <AssetQuickViewDrawer
        assetId={quickViewId}
        onClose={() => setQuickViewId(null)}
        onViewDetail={id => { setQuickViewId(null); router.push(`/assets/${id}`) }}
        onEdit={id => { setQuickViewId(null); router.push(`/assets/${id}/edit`) }}
      />
    </Box>
  )
}

export default AssetDirectory
