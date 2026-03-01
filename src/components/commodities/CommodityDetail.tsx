'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
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
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import * as v from 'valibot'

import {
  getGetApiV1CommoditiesCommodityIdTransactionsQueryKey,
  useDeleteApiV1CommoditiesCommodityIdTransactionsTransactionId,
  useGetApiV1CommoditiesCommodityIdTransactions,
  useGetApiV1CommoditiesId,
  useGetApiV1Units,
  usePostApiV1CommoditiesCommodityIdTransactions
} from '@generated/api'
import type { InvestmentTransactionDto } from '@generated/api'

// ─── Constants & helpers ───────────────────────────────────────────────────────
const TRANSACTION_TYPES = ['Buy', 'Sell'] as const

const assetClassConfig: Record<string, { label: string; icon: string; hex: string }> = {
  Metal: { label: 'Metal', icon: 'tabler-coin', hex: '#f59e0b' },
  Forex: { label: 'Forex', icon: 'tabler-currency-dollar', hex: '#10b981' },
  Stock: { label: 'Stock', icon: 'tabler-chart-line', hex: '#8b5cf6' }
}

const typeConfig: Record<string, { hex: string; bg: string }> = {
  Buy:  { hex: '#10b981', bg: '#10b98118' },
  Sell: { hex: '#ef4444', bg: '#ef444418' }
}

const formatCurrency = (n?: number | null, compact = false) => {
  if (n === undefined || n === null) return '—'

  if (compact && Math.abs(n) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(n)
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// ─── Transaction form schema ───────────────────────────────────────────────────
const txnSchema = v.object({
  transactionType: v.picklist([...TRANSACTION_TYPES], 'Select type'),
  transactionDate: v.pipe(v.string(), v.nonEmpty('Required')),
  quantity:        v.pipe(v.number(), v.minValue(0.0001, 'Must be > 0')),
  unitId:          v.pipe(v.string(), v.nonEmpty('Required')),
  pricePerUnit:    v.pipe(v.number(), v.minValue(0)),
  feeAmount:       v.optional(v.pipe(v.number(), v.minValue(0))),
  notes:           v.optional(v.pipe(v.string(), v.maxLength(500)))
})

type TxnFormData = v.InferOutput<typeof txnSchema>

// ─── Component ─────────────────────────────────────────────────────────────────
interface CommodityDetailProps {
  commodityId: string
}

const CommodityDetail = ({ commodityId }: CommodityDetailProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Buy' | 'Sell'>('All')
  const [txnDialogOpen, setTxnDialogOpen] = useState(false)
  const pageSize = 15

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: commodityData, isLoading: commodityLoading } = useGetApiV1CommoditiesId(commodityId, {
    query: { staleTime: 5 * 60 * 1000 }
  })

  const commodity = commodityData?.result

  const txnParams = {
    page,
    pageSize,
    sort: '-transactionDate',
    ...(typeFilter !== 'All' ? { filter: `transactionType == '${typeFilter}'` } : {})
  }

  const { data: txnData, isLoading: txnLoading } = useGetApiV1CommoditiesCommodityIdTransactions(
    commodityId, txnParams, { query: { staleTime: 60_000 } }
  )

  const transactions = txnData?.result?.items ?? []
  const totalCount  = txnData?.result?.total ?? 0
  const totalPages  = txnData?.result?.totalPages ?? 1

  // All transactions for KPI (page 1 large page just for stats)
  const { data: allTxnData } = useGetApiV1CommoditiesCommodityIdTransactions(
    commodityId, { page: 1, pageSize: 999, sort: '-transactionDate' },
    { query: { staleTime: 60_000 } }
  )

  const allTxns = useMemo(() => allTxnData?.result?.items ?? [], [allTxnData?.result?.items])

  const { data: unitsData } = useGetApiV1Units({ pageSize: 200, sort: 'name' })
  const units = useMemo(() => unitsData?.result?.items ?? [], [unitsData])

  // ─── KPI Calculations ─────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const buys  = allTxns.filter(t => t.transactionType === 'Buy')
    const sells = allTxns.filter(t => t.transactionType === 'Sell')
    const totalBuyValue  = buys.reduce((s, t) => s + (t.totalAmount ?? 0), 0)
    const totalSellValue = sells.reduce((s, t) => s + (t.totalAmount ?? 0), 0)
    const totalFees      = allTxns.reduce((s, t) => s + (t.feeAmount ?? 0), 0)
    const netValue       = totalBuyValue - totalSellValue
    const now = new Date()

    const monthlyTxns    = allTxns.filter(t => {
      const d = t.transactionDate ? new Date(t.transactionDate) : null

      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return { totalBuyValue, totalSellValue, netValue, totalFees, monthlyTxns, totalCount }
  }, [allTxns, totalCount])

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const createTxn = usePostApiV1CommoditiesCommodityIdTransactions()
  const deleteTxn = useDeleteApiV1CommoditiesCommodityIdTransactionsTransactionId()

  const {
    control, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting }
  } = useForm<TxnFormData>({
    resolver: valibotResolver(txnSchema),
    defaultValues: {
      transactionType: 'Buy',
      transactionDate: new Date().toISOString().split('T')[0],
      quantity: 0,
      unitId: commodity?.defaultUnitId ?? '',
      pricePerUnit: 0,
      feeAmount: 0,
      notes: ''
    }
  })

  const qty   = watch('quantity') ?? 0
  const price = watch('pricePerUnit') ?? 0
  const total = qty * price

  // Auto-set default unit when commodity loads
  useMemo(() => {
    if (commodity?.defaultUnitId) setValue('unitId', commodity.defaultUnitId)
  }, [commodity?.defaultUnitId, setValue])

  const handleAddTxn = async (data: TxnFormData) => {
    await createTxn.mutateAsync({
      commodityId,
      data: {
        transactionType: data.transactionType,
        transactionDate: new Date(data.transactionDate).toISOString(),
        quantity: data.quantity,
        unitId: data.unitId,
        pricePerUnit: data.pricePerUnit,
        totalAmount: total,
        feeAmount: data.feeAmount ?? 0,
        notes: data.notes || null
      }
    })
    await queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesCommodityIdTransactionsQueryKey(commodityId) })
    setTxnDialogOpen(false)
    reset()
  }

  const handleDeleteTxn = async (txn: InvestmentTransactionDto) => {
    if (!txn.id) return
    await deleteTxn.mutateAsync({ commodityId, transactionId: txn.id })
    await queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesCommodityIdTransactionsQueryKey(commodityId) })
  }

  const cfg = assetClassConfig[commodity?.assetClass ?? ''] ?? assetClassConfig['Metal']

  if (commodityLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Skeleton height={32} width='25%' />
        <Skeleton height={60} width='40%' />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={110} variant='rounded' />)}
        </Box>
        <Skeleton height={400} variant='rounded' />
      </Box>
    )
  }

  if (!commodity) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* ── Breadcrumb ───────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {[
          { label: 'Dashboard', path: '/' },
          { label: 'Commodities', path: '/commodities' },
          { label: commodity.name ?? '' }
        ].map((seg, i, arr) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {i > 0 && <i className='tabler-chevron-right' style={{ fontSize: 13, opacity: 0.4 }} />}
            <Typography
              variant='body2'
              color={i === arr.length - 1 ? 'text.primary' : 'text.secondary'}
              fontWeight={i === arr.length - 1 ? 600 : 400}
              sx={seg.path ? { cursor: 'pointer', '&:hover': { color: 'primary.main' } } : undefined}
              onClick={seg.path ? () => router.push(seg.path!) : undefined}
            >
              {seg.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Header ───────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 2,
              bgcolor: alpha(cfg.hex, 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <i className={cfg.icon} style={{ fontSize: 24, color: cfg.hex }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant='h3' fontWeight={900} letterSpacing={-1} sx={{ lineHeight: 1.1 }}>
                  {commodity.name}
                </Typography>
                <Box sx={{
                  px: 1.5, py: 0.5, borderRadius: 1,
                  bgcolor: alpha(cfg.hex, 0.12), border: `1px solid ${alpha(cfg.hex, 0.3)}`
                }}>
                  <Typography variant='caption' fontWeight={800} sx={{ color: cfg.hex, letterSpacing: 0.5 }}>
                    {commodity.assetClass?.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
                {commodity.code}
                {commodity.defaultUnitName && ` · Default unit: ${commodity.defaultUnitName}`}
              </Typography>
            </Box>
          </Box>
          {commodity.description && (
            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 520 }}>
              {commodity.description}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-pencil' style={{ fontSize: 16 }} />}
            onClick={() => router.push(`/commodities/${commodityId}/edit`)}
            sx={{ fontWeight: 700 }}
          >
            Edit
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' style={{ fontSize: 16 }} />}
            onClick={() => setTxnDialogOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            New Transaction
          </Button>
        </Box>
      </Box>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-chart-bar' style={{ fontSize: 20, color: cfg.hex }} />
          <Typography variant='subtitle1' fontWeight={700}>Portfolio Overview</Typography>
        </Box>
        <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {/* Total Buy Value */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative' }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07 }}>
              <i className='tabler-shopping-cart' style={{ fontSize: 52, color: cfg.hex }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>Total Invested</Typography>
            <Typography variant='h5' fontWeight={700} letterSpacing={-0.5}>{formatCurrency(kpi.totalBuyValue, true)}</Typography>
            <Typography variant='caption' color='text.disabled'>{allTxns.filter(t => t.transactionType === 'Buy').length} buy orders</Typography>
          </Box>

          {/* Net Position */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative' }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07 }}>
              <i className='tabler-trending-up' style={{ fontSize: 52, color: kpi.netValue >= 0 ? '#10b981' : '#ef4444' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>Net Position</Typography>
            <Typography variant='h5' fontWeight={700} letterSpacing={-0.5}
              sx={{ color: kpi.netValue >= 0 ? '#10b981' : '#ef4444' }}
            >
              {kpi.netValue >= 0 ? '+' : ''}{formatCurrency(kpi.netValue, true)}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              {formatCurrency(kpi.totalSellValue, true)} recovered
            </Typography>
          </Box>

          {/* Total Fees */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative' }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07 }}>
              <i className='tabler-receipt' style={{ fontSize: 52, color: '#f59e0b' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>Total Fees</Typography>
            <Typography variant='h5' fontWeight={700} letterSpacing={-0.5}>{formatCurrency(kpi.totalFees, true)}</Typography>
            <Typography variant='caption' color='text.disabled'>All-time transaction fees</Typography>
          </Box>

          {/* Transactions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, position: 'relative' }}>
            <Box sx={{ position: 'absolute', right: 0, top: -8, opacity: 0.07 }}>
              <i className='tabler-list-details' style={{ fontSize: 52, color: '#6366f1' }} />
            </Box>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>Monthly Txns</Typography>
            <Typography variant='h5' fontWeight={700} letterSpacing={-0.5}>{kpi.monthlyTxns}</Typography>
            <Typography variant='caption' color='text.disabled'>{kpi.totalCount} all-time transactions</Typography>
          </Box>
        </Box>
      </Card>

      {/* ── Transaction Ledger Table ──────────────────────────────── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Table header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-history' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='subtitle1' fontWeight={700}>Transaction History</Typography>
            {totalCount > 0 && (
              <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected' }}>
                <Typography variant='caption' fontWeight={700}>{totalCount}</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {/* Type filter */}
            <Select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value as 'All' | 'Buy' | 'Sell'); setPage(1) }}
              size='small'
              sx={{ fontSize: '0.8rem', minWidth: 90, '.MuiSelect-select': { py: 0.75, px: 1.5 } }}
            >
              <MenuItem value='All'>All</MenuItem>
              <MenuItem value='Buy'>Buy</MenuItem>
              <MenuItem value='Sell'>Sell</MenuItem>
            </Select>

            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-plus' style={{ fontSize: 14 }} />}
              onClick={() => setTxnDialogOpen(true)}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            >
              Add Transaction
            </Button>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Date', 'Type', 'Quantity', 'Price / Unit', 'Total Amount', 'Fee', 'Notes', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {txnLoading && [1,2,3,4,5].map(i => (
                <TableRow key={i}>
                  {[1,2,3,4,5,6,7,8].map(j => (
                    <TableCell key={j}><Skeleton height={20} /></TableCell>
                  ))}
                </TableRow>
              ))}
              {!txnLoading && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, textAlign: 'center' }}>
                    <Box sx={{ opacity: 0.4 }}>
                      <i className='tabler-inbox' style={{ fontSize: 36 }} />
                      <Typography variant='body2' sx={{ mt: 1 }}>No transactions yet.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {!txnLoading && transactions.map((txn) => {
                const tc = typeConfig[txn.transactionType ?? ''] ?? typeConfig['Buy']

                return (
                  <TableRow key={txn.id}
                    sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.15s' }}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.815rem' }}>
                      {formatDate(txn.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.35, borderRadius: 1, bgcolor: tc.bg }}>
                        <i
                          className={txn.transactionType === 'Buy' ? 'tabler-arrow-down-left' : 'tabler-arrow-up-right'}
                          style={{ fontSize: 12, color: tc.hex }}
                        />
                        <Typography variant='caption' fontWeight={700} sx={{ color: tc.hex, letterSpacing: 0.3 }}>
                          {txn.transactionType?.toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.815rem', fontWeight: 500 }}>
                      {txn.quantity?.toLocaleString()} <Typography component='span' variant='caption' color='text.secondary'>{txn.unitCode}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.815rem' }}>
                      {formatCurrency(txn.pricePerUnit)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.815rem', fontWeight: 700 }}>
                      {formatCurrency(txn.totalAmount)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.815rem', color: 'text.secondary' }}>
                      {txn.feeAmount ? formatCurrency(txn.feeAmount) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.815rem', color: 'text.secondary', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {txn.notes || '—'}
                    </TableCell>
                    <TableCell sx={{ width: 40, pr: 2 }}>
                      <Tooltip title='Delete'>
                        <IconButton
                          size='small'
                          onClick={() => handleDeleteTxn(txn)}
                          sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
                        >
                          <i className='tabler-trash' style={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' color='text.secondary'>
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size='small'
              color='primary'
            />
          </Box>
        )}
      </Card>

      {/* ── Add Transaction Dialog ────────────────────────────────── */}
      <Dialog open={txnDialogOpen} onClose={() => setTxnDialogOpen(false)} maxWidth='sm' fullWidth>
        <form onSubmit={handleSubmit(handleAddTxn)}>
          <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(cfg.hex, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={cfg.icon} style={{ fontSize: 18, color: cfg.hex }} />
              </Box>
              Record New Transaction
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 400, display: 'block', mt: 0.5 }}>
              {commodity.name} · {commodity.code}
            </Typography>
          </DialogTitle>
          <Divider sx={{ mt: 2 }} />
          <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Type + Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Transaction Type</Typography>
                <Controller
                  name='transactionType'
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {TRANSACTION_TYPES.map(type => {
                        const tc = typeConfig[type]
                        const active = field.value === type

                        return (
                          <Box
                            key={type}
                            onClick={() => field.onChange(type)}
                            sx={{
                              flex: 1, py: 1.5, borderRadius: 1.5, textAlign: 'center', cursor: 'pointer',
                              border: '2px solid',
                              borderColor: active ? tc.hex : 'divider',
                              bgcolor: active ? tc.bg : 'transparent',
                              transition: 'all 0.15s',
                              '&:hover': { borderColor: tc.hex }
                            }}
                          >
                            <i
                              className={type === 'Buy' ? 'tabler-arrow-down-left' : 'tabler-arrow-up-right'}
                              style={{ fontSize: 20, color: tc.hex, display: 'block' }}
                            />
                            <Typography variant='body2' fontWeight={700} sx={{ color: tc.hex, mt: 0.5 }}>
                              {type}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  )}
                />
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Transaction Date</Typography>
                <Controller
                  name='transactionDate'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type='date'
                      size='small'
                      fullWidth
                      error={!!errors.transactionDate}
                      helperText={errors.transactionDate?.message}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Qty + Unit */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Quantity</Typography>
                <Controller
                  name='quantity'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      type='number'
                      size='small'
                      fullWidth
                      error={!!errors.quantity}
                      helperText={errors.quantity?.message}
                      slotProps={{ htmlInput: { step: 0.0001, min: 0 } }}
                    />
                  )}
                />
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Unit</Typography>
                <Controller
                  name='unitId'
                  control={control}
                  render={({ field }) => (
                    <Select {...field} size='small' fullWidth error={!!errors.unitId} displayEmpty>
                      <MenuItem value=''><em>Select unit</em></MenuItem>
                      {units.map(u => (
                        <MenuItem key={u.id} value={u.id ?? ''}>{u.name} ({u.code})</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </Box>
            </Box>

            {/* Price per unit */}
            <Box>
              <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Price per Unit</Typography>
              <Controller
                name='pricePerUnit'
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    type='number'
                    size='small'
                    fullWidth
                    error={!!errors.pricePerUnit}
                    helperText={errors.pricePerUnit?.message}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position='start'>$</InputAdornment>
                      }
                    }}
                  />
                )}
              />
            </Box>

            {/* Auto-calculated total */}
            <Box sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>Total Amount</Typography>
              <Typography variant='h6' fontWeight={700} color='primary.main'>
                {formatCurrency(total)}
              </Typography>
            </Box>

            {/* Fee + Notes */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Transaction Fee <Typography component='span' variant='caption' color='text.disabled'>(optional)</Typography></Typography>
                <Controller
                  name='feeAmount'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      type='number'
                      size='small'
                      fullWidth
                      slotProps={{
                        htmlInput: { step: 0.01, min: 0 },
                        input: {
                          startAdornment: <InputAdornment position='start'>$</InputAdornment>
                        }
                      }}
                    />
                  )}
                />
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary' fontWeight={600} sx={{ mb: 0.75 }}>Notes <Typography component='span' variant='caption' color='text.disabled'>(optional)</Typography></Typography>
                <Controller
                  name='notes'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size='small'
                      fullWidth
                      placeholder='Reason, reference…'
                      slotProps={{ htmlInput: { maxLength: 500 } }}
                    />
                  )}
                />
              </Box>
            </Box>
          </DialogContent>

          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={() => setTxnDialogOpen(false)} variant='outlined' sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={isSubmitting}
              startIcon={isSubmitting
                ? <i className='tabler-loader-2 animate-spin' style={{ fontSize: 16 }} />
                : <i className='tabler-device-floppy' style={{ fontSize: 16 }} />
              }
              sx={{ fontWeight: 700, minWidth: 160 }}
            >
              {isSubmitting ? 'Saving…' : 'Save Transaction'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default CommodityDetail
