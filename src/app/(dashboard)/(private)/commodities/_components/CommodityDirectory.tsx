'use client'

import { useMemo, useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'react-toastify'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
  getGetApiV1CommoditiesQueryKey,
  useDeleteApiV1CommoditiesId,
  useGetApiV1Commodities
} from '@generated/core-api'
import type { ApiErrorResponse, CommodityDto } from '@generated/core-api'
import { dsl } from '@/utils/dslQueryBuilder'

// ─── Asset class config ─────────────────────────────────────────────────────────
const assetClassConfig: Record<string, { label: string; icon: string; hex: string; sparkPath: string }> = {
  Metal: {
    label: 'Metal',
    icon: 'tabler-coin',
    hex: '#f59e0b',
    sparkPath: 'M0,30 C10,28 15,10 25,12 C35,14 40,5 50,8 C60,11 65,2 75,4 C85,6 90,18 100,15'
  },
  Forex: {
    label: 'Forex',
    icon: 'tabler-currency-dollar',
    hex: '#10b981',
    sparkPath: 'M0,20 C10,22 15,18 25,15 C35,12 40,20 50,18 C60,16 65,8 75,10 C85,12 90,6 100,4'
  },
  Stock: {
    label: 'Stock',
    icon: 'tabler-chart-line',
    hex: '#8b5cf6',
    sparkPath: 'M0,25 C10,23 15,30 25,28 C35,26 40,15 50,12 C60,9 65,18 75,14 C85,10 90,5 100,2'
  }
}

const ASSET_CLASSES = Object.keys(assetClassConfig)

// ─── Ticker Card ───────────────────────────────────────────────────────────────
interface TickerCardProps {
  assetClass: string
  count: number
  isActive: boolean
  onClick: () => void
}

const TickerCard = ({ assetClass, count, isActive, onClick }: TickerCardProps) => {
  const cfg = assetClassConfig[assetClass]

  return (
    <Card
      onClick={onClick}
      sx={{
        flex: 1,
        p: 3,
        cursor: 'pointer',
        border: '2px solid',
        borderColor: isActive ? cfg.hex : 'divider',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(cfg.hex, 0.25)}` }
      }}
    >
      {/* Decorative sparkline */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.15 }}>
        <svg viewBox='0 0 100 40' width='100%' height='40' preserveAspectRatio='none'>
          <path d={cfg.sparkPath} fill='none' stroke={cfg.hex} strokeWidth='2' />
        </svg>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: alpha(cfg.hex, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={cfg.icon} style={{ fontSize: 18, color: cfg.hex }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={600}>
              {cfg.label}
            </Typography>
          </Box>
          <Typography variant='h4' fontWeight={800} sx={{ lineHeight: 1.1 }}>
            {count}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            instruments
          </Typography>
        </Box>
        <Chip
          label={isActive ? 'Selected' : 'View'}
          size='small'
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 700,
            bgcolor: isActive ? alpha(cfg.hex, 0.15) : 'action.hover',
            color: isActive ? cfg.hex : 'text.secondary'
          }}
        />
      </Box>
    </Card>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────
const CommodityDirectory = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const pageSize = 15

  // ─── Stats per asset class ─────────────────────────────────────────────────
  const metalFilter = useMemo(() => dsl().string('assetClass').eq('Metal').build(), [])
  const forexFilter = useMemo(() => dsl().string('assetClass').eq('Forex').build(), [])
  const stockFilter = useMemo(() => dsl().string('assetClass').eq('Stock').build(), [])

  const {
    data: metalData,
    isError: isMetalError,
    error: metalError
  } = useGetApiV1Commodities({ page: 1, pageSize: 1, filter: metalFilter })

  const {
    data: forexData,
    isError: isForexError,
    error: forexError
  } = useGetApiV1Commodities({ page: 1, pageSize: 1, filter: forexFilter })

  const {
    data: stockData,
    isError: isStockError,
    error: stockError
  } = useGetApiV1Commodities({ page: 1, pageSize: 1, filter: stockFilter })

  const classCounts: Record<string, number> = {
    Metal: metalData?.result?.total ?? 0,
    Forex: forexData?.result?.total ?? 0,
    Stock: stockData?.result?.total ?? 0
  }

  // ─── Filters ────────────────────────────────────────────────────────────────
  const filter = useMemo(() => {
    const builder = dsl()

    if (search.trim()) builder.string('name').contains(search.trim())
    if (classFilter) builder.string('assetClass').eq(classFilter)

    return builder.build() || undefined
  }, [search, classFilter])

  // ─── Main data ──────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError: isDataError,
    error: dataError
  } = useGetApiV1Commodities({ page, pageSize, filter, sort: 'code' })

  const deleteMutation = useDeleteApiV1CommoditiesId()

  const commodities = data?.result?.items ?? []
  const total = data?.result?.total ?? 0
  const totalPages = data?.result?.totalPages ?? 1

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this commodity?')) return
    await deleteMutation.mutateAsync({ id })
    await queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesQueryKey() })
  }

  const apiErrorMessage = useMemo(() => {
    const error = metalError || forexError || stockError || dataError

    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    const apiError = error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load commodities'
  }, [metalError, forexError, stockError, dataError])

  // ─── Error handling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMetalError || isForexError || isStockError || isDataError) {
      toast.error(apiErrorMessage || 'Failed to load commodities')
    }
  }, [isMetalError, isForexError, isStockError, isDataError, apiErrorMessage])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant='h4' fontWeight={800} letterSpacing={-0.5}>
            Commodities Portfolio
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Manage investment instruments — precious metals, forex pairs, and stocks.
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' style={{ fontSize: 18 }} />}
          onClick={() => router.push('/commodities/new')}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Add New Commodity
        </Button>
      </Box>

      {/* ─── Ticker Cards ────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {ASSET_CLASSES.map(cls => (
          <TickerCard
            key={cls}
            assetClass={cls}
            count={classCounts[cls]}
            isActive={classFilter === cls}
            onClick={() => {
              setClassFilter(prev => (prev === cls ? '' : cls))
              setPage(1)
            }}
          />
        ))}
      </Box>

      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size='small'
              placeholder='Search by name or code...'
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
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
              select
              size='small'
              label='Asset Class'
              value={classFilter}
              onChange={e => {
                setClassFilter(e.target.value)
                setPage(1)
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value=''>All Classes</MenuItem>
              {ASSET_CLASSES.map(cls => (
                <MenuItem key={cls} value={cls}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i
                      className={assetClassConfig[cls].icon}
                      style={{ fontSize: 15, color: assetClassConfig[cls].hex }}
                    />
                    {assetClassConfig[cls].label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            {(search || classFilter) && (
              <Chip
                label='Clear'
                size='small'
                variant='outlined'
                onDelete={() => {
                  setSearch('')
                  setClassFilter('')
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Refresh'>
              <IconButton
                size='small'
                onClick={() => queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesQueryKey() })}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <i className='tabler-refresh' style={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Card>

      {/* ─── Market Watchlist Table ───────────────────────────────────── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <i className='tabler-list-details' style={{ fontSize: 18, opacity: 0.5 }} />
          <Typography variant='subtitle1' fontWeight={700}>
            Market Watchlist
          </Typography>
          <Chip label={`${total} instruments`} size='small' sx={{ ml: 'auto', fontWeight: 600 }} />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Code', 'Name', 'Asset Class', 'Default Unit', 'Buy Price', 'Sell Price', ''].map((h, i) => (
                  <TableCell
                    key={h || i}
                    align={['Buy Price', 'Sell Price'].includes(h) ? 'right' : 'left'}
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      color: 'text.secondary',
                      py: 1.5
                    }}
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
                        <Box
                          sx={{ height: 16, borderRadius: 1, bgcolor: 'action.hover', width: j === 0 ? '40%' : '65%' }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : commodities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 12 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className='tabler-chart-dots-3' style={{ fontSize: 40, opacity: 0.35 }} />
                      </Box>
                      <Typography variant='h6' fontWeight={600} color='text.secondary'>
                        No instruments found
                      </Typography>
                      <Typography variant='body2' color='text.disabled'>
                        Add commodities to start tracking your portfolio.
                      </Typography>
                      <Button
                        variant='outlined'
                        size='small'
                        startIcon={<i className='tabler-plus' />}
                        onClick={() => router.push('/commodities/new')}
                      >
                        Add First Commodity
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                commodities.map((c: CommodityDto) => {
                  const cls = assetClassConfig[c.assetClass ?? ''] ?? assetClassConfig['Metal']

                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .row-actions': { opacity: 0 },
                        '&:hover .row-actions': { opacity: 1 },
                        transition: 'background-color 0.15s'
                      }}
                      onClick={() => router.push(`/commodities/${c.id}`)}
                    >
                      {/* Code */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1.5,
                              bgcolor: alpha(cls.hex, 0.12),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <i className={cls.icon} style={{ fontSize: 18, color: cls.hex }} />
                          </Box>
                          <Typography
                            variant='body2'
                            fontWeight={800}
                            fontFamily='monospace'
                            fontSize={14}
                            letterSpacing={0.5}
                          >
                            {c.code}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='body2' fontWeight={500}>
                            {c.name}
                          </Typography>
                        </Box>
                        {c.description && (
                          <Typography
                            variant='caption'
                            color='text.disabled'
                            sx={{
                              display: 'block',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {c.description}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Asset Class */}
                      <TableCell>
                        <Chip
                          label={cls.label}
                          size='small'
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            bgcolor: alpha(cls.hex, 0.12),
                            color: cls.hex,
                            border: `1px solid ${alpha(cls.hex, 0.3)}`,
                            height: 22
                          }}
                        />
                      </TableCell>

                      {/* Default Unit */}
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {c.defaultUnitName
                            ? `${c.defaultUnitName}${c.defaultUnitCode ? ` (${c.defaultUnitCode})` : ''}`
                            : '—'}
                        </Typography>
                      </TableCell>

                      {/* Buy Price */}
                      <TableCell align='right'>
                        <Typography variant='body2' color='text.disabled' fontStyle='italic'>
                          —
                        </Typography>
                      </TableCell>

                      {/* Sell Price */}
                      <TableCell align='right'>
                        <Typography variant='body2' color='text.disabled' fontStyle='italic'>
                          —
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align='right'>
                        <Box
                          className='row-actions'
                          sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', transition: 'opacity 0.15s' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Tooltip title='Edit'>
                            <IconButton size='small' onClick={() => router.push(`/commodities/${c.id}`)}>
                              <i className='tabler-pencil' style={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton size='small' color='error' onClick={e => handleDelete(c.id!, e)}>
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

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant='body2' color='text.secondary'>
            {total === 0 ? (
              'No instruments'
            ) : (
              <>
                Showing{' '}
                <Box component='span' fontWeight={700} color='text.primary'>
                  {(page - 1) * pageSize + 1}
                </Box>{' '}
                –{' '}
                <Box component='span' fontWeight={700} color='text.primary'>
                  {Math.min(page * pageSize, total)}
                </Box>{' '}
                of{' '}
                <Box component='span' fontWeight={700} color='text.primary'>
                  {total}
                </Box>{' '}
                instruments
              </>
            )}
          </Typography>
          {totalPages > 1 && (
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} shape='rounded' size='small' />
          )}
        </Box>
      </Card>
    </Box>
  )
}

export default CommodityDirectory
