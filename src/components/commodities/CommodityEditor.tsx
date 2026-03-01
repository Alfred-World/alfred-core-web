'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { alpha } from '@mui/material/styles'
import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormHelperText from '@mui/material/FormHelperText'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
import * as v from 'valibot'

import {
  getGetApiV1CommoditiesQueryKey,
  getGetApiV1CommoditiesCommodityIdTransactionsQueryKey,
  useDeleteApiV1CommoditiesCommodityIdTransactionsTransactionId,
  useGetApiV1CommoditiesCommodityIdTransactions,
  useGetApiV1CommoditiesId,
  useGetApiV1Units,
  usePostApiV1Commodities,
  usePostApiV1CommoditiesCommodityIdTransactions,
  usePutApiV1CommoditiesId
} from '@generated/api'
import type { InvestmentTransactionDto, UnitDto } from '@generated/api'

// ─── Constants ─────────────────────────────────────────────────────────────────
const ASSET_CLASSES = ['Metal', 'Forex', 'Stock'] as const
const TRANSACTION_TYPES = ['Buy', 'Sell'] as const

const assetClassConfig: Record<string, { label: string; icon: string; hex: string; desc: string }> = {
  Metal: { label: 'Metal', icon: 'tabler-coin',            hex: '#f59e0b', desc: 'Gold, silver, platinum…' },
  Forex: { label: 'Forex', icon: 'tabler-currency-dollar', hex: '#10b981', desc: 'USD, EUR, JPY…' },
  Stock: { label: 'Stock', icon: 'tabler-chart-line',      hex: '#8b5cf6', desc: 'Stocks, ETFs, funds…' }
}

const txnTypeConfig: Record<string, { hex: string; bg: string; icon: string }> = {
  Buy:  { hex: '#10b981', bg: '#10b98118', icon: 'tabler-arrow-down-left' },
  Sell: { hex: '#ef4444', bg: '#ef444418', icon: 'tabler-arrow-up-right'  }
}

// ─── Field label ────────────────────────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Typography variant='body2' fontWeight={600} color='text.secondary' sx={{ mb: 0.75, display: 'flex', gap: 0.5 }}>
    {children}
    {required && <Typography component='span' color='error.main'>*</Typography>}
  </Typography>
)

// ─── Validation schemas ────────────────────────────────────────────────────────
const commoditySchema = v.object({
  code: v.pipe(v.string(), v.nonEmpty('Code is required'), v.maxLength(20)),
  name: v.pipe(v.string(), v.nonEmpty('Name is required'), v.maxLength(255)),
  assetClass: v.picklist([...ASSET_CLASSES], 'Select an asset class'),
  defaultUnitId: v.optional(v.string()),
  description: v.optional(v.pipe(v.string(), v.maxLength(500)))
})

type CommodityFormData = v.InferOutput<typeof commoditySchema>

const transactionSchema = v.object({
  transactionType: v.picklist([...TRANSACTION_TYPES], 'Select type'),
  transactionDate: v.pipe(v.string(), v.nonEmpty('Date is required')),
  quantity: v.pipe(v.number(), v.minValue(0.0001, 'Must be > 0')),
  unitId: v.pipe(v.string(), v.nonEmpty('Unit is required')),
  pricePerUnit: v.pipe(v.number(), v.minValue(0, 'Must be >= 0')),
  totalAmount: v.pipe(v.number(), v.minValue(0, 'Must be >= 0')),
  feeAmount: v.optional(v.pipe(v.number(), v.minValue(0))),
  notes: v.optional(v.pipe(v.string(), v.maxLength(500)))
})

type TransactionFormData = v.InferOutput<typeof transactionSchema>

// ─── Component ─────────────────────────────────────────────────────────────────
interface CommodityEditorProps {
  commodityId?: string
}

const CommodityEditor = ({ commodityId }: CommodityEditorProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(commodityId)

  // Transaction dialog state
  const [txnOpen, setTxnOpen] = useState(false)

  // ─── Fetch data ────────────────────────────────────────────────────────────
  const { data: commodityData } = useGetApiV1CommoditiesId(commodityId!, {
    query: { enabled: isEditMode }
  })

  const commodity = commodityData?.result

  const { data: unitsData } = useGetApiV1Units({ pageSize: 200 })
  const units: UnitDto[] = useMemo(() => unitsData?.result?.items ?? [], [unitsData])

  const { data: txnData } = useGetApiV1CommoditiesCommodityIdTransactions(
    commodityId!,
    { sort: '-transactionDate', pageSize: 50 },
    { query: { enabled: isEditMode } }
  )

  const transactions = useMemo(() => txnData?.result?.items ?? [], [txnData?.result?.items])

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = usePostApiV1Commodities()
  const updateMutation = usePutApiV1CommoditiesId()
  const createTxnMutation = usePostApiV1CommoditiesCommodityIdTransactions()
  const deleteTxnMutation = useDeleteApiV1CommoditiesCommodityIdTransactionsTransactionId()

  // ─── Commodity form ────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CommodityFormData>({
    resolver: valibotResolver(commoditySchema),
    defaultValues: {
      code: '',
      name: '',
      assetClass: 'Metal',
      defaultUnitId: '',
      description: ''
    }
  })

  // Populate form when editing
  useEffect(() => {
    if (commodity) {
      reset({
        code: commodity.code ?? '',
        name: commodity.name ?? '',
        assetClass: (commodity.assetClass as CommodityFormData['assetClass']) ?? 'Metal',
        defaultUnitId: commodity.defaultUnitId ?? '',
        description: commodity.description ?? ''
      })
    }
  }, [commodity, reset])

  const currentAssetClass = watch('assetClass')
  const cfg = assetClassConfig[currentAssetClass] ?? assetClassConfig.Metal

  const onSubmit = async (formData: CommodityFormData) => {
    const payload = {
      code: formData.code,
      name: formData.name,
      assetClass: formData.assetClass,
      defaultUnitId: formData.defaultUnitId || null,
      description: formData.description || null
    }

    if (isEditMode && commodityId) {
      await updateMutation.mutateAsync({
        id: commodityId,
        data: { name: payload.name, assetClass: payload.assetClass, defaultUnitId: payload.defaultUnitId, description: payload.description }
      })
      await queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesQueryKey() })
      router.push(`/commodities/${commodityId}`)
    } else {
      const res = await createMutation.mutateAsync({ data: payload })

      await queryClient.invalidateQueries({ queryKey: getGetApiV1CommoditiesQueryKey() })
      const newId = res?.result?.id

      router.push(newId ? `/commodities/${newId}` : '/commodities')
    }
  }

  // ─── Transaction form (inside dialog) ─────────────────────────────────────
  const {
    control: txnControl,
    handleSubmit: handleTxnSubmit,
    reset: resetTxn,
    watch: watchTxn,
    setValue: setTxnValue,
    formState: { errors: txnErrors }
  } = useForm<TransactionFormData>({
    resolver: valibotResolver(transactionSchema),
    defaultValues: {
      transactionType: 'Buy',
      transactionDate: new Date().toISOString().split('T')[0],
      quantity: 0,
      unitId: '',
      pricePerUnit: 0,
      totalAmount: 0,
      feeAmount: 0,
      notes: ''
    }
  })

  // Auto-calculate totalAmount when quantity/pricePerUnit change
  const txnQuantity = watchTxn('quantity')
  const txnPricePerUnit = watchTxn('pricePerUnit')

  useEffect(() => {
    if (txnQuantity > 0 && txnPricePerUnit > 0) {
      setTxnValue('totalAmount', Math.round(txnQuantity * txnPricePerUnit * 100) / 100)
    }
  }, [txnQuantity, txnPricePerUnit, setTxnValue])

  // Pre-fill unitId from commodity's defaultUnit
  useEffect(() => {
    if (commodity?.defaultUnitId && txnOpen) {
      setTxnValue('unitId', commodity.defaultUnitId)
    }
  }, [commodity?.defaultUnitId, txnOpen, setTxnValue])

  const onTxnSubmit = async (formData: TransactionFormData) => {
    if (!commodityId) return

    await createTxnMutation.mutateAsync({
      commodityId,
      data: {
        transactionType: formData.transactionType,
        transactionDate: new Date(formData.transactionDate).toISOString(),
        quantity: formData.quantity,
        unitId: formData.unitId,
        pricePerUnit: formData.pricePerUnit,
        totalAmount: formData.totalAmount,
        feeAmount: formData.feeAmount ?? 0,
        notes: formData.notes || null
      }
    })

    await queryClient.invalidateQueries({
      queryKey: getGetApiV1CommoditiesCommodityIdTransactionsQueryKey(commodityId)
    })

    setTxnOpen(false)
    resetTxn()
  }

  const handleDeleteTxn = async (transactionId: string) => {
    if (!commodityId || !confirm('Delete this transaction?')) return

    await deleteTxnMutation.mutateAsync({ commodityId, transactionId })

    await queryClient.invalidateQueries({
      queryKey: getGetApiV1CommoditiesCommodityIdTransactionsQueryKey(commodityId)
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const fmtCurrency = (n?: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  // ─── Holdings summary ─────────────────────────────────────────────────────
  const holdings = useMemo(() => {
    let qty = 0, invested = 0, fees = 0

    for (const txn of transactions) {
      if (txn.transactionType === 'Buy') { qty += txn.quantity ?? 0; invested += txn.totalAmount ?? 0 }
      else { qty -= txn.quantity ?? 0; invested -= txn.totalAmount ?? 0 }

      fees += txn.feeAmount ?? 0
    }

    
return { qty, invested, fees, avg: qty > 0 ? invested / qty : 0 }
  }, [transactions])

  const txnType  = watchTxn('transactionType')
  const txnTotal = watchTxn('totalAmount')

  return (
    <Box sx={{ maxWidth: isEditMode ? '100%' : 700, mx: isEditMode ? 0 : 'auto' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Box sx={{ alignItems: 'center', gap: 2, mb: 5 }}>
        <IconButton
          onClick={() => router.push(isEditMode ? `/commodities/${commodityId}` : '/commodities')}
          size='small'
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
        >
          <i className='tabler-arrow-left' style={{ fontSize: 18 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant='h4' fontWeight={900} letterSpacing={-0.5}>
            {isEditMode ? `Edit: ${commodity?.name ?? '...'}` : 'New Commodity'}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
            {isEditMode ? `Editing ${commodity?.code ?? ''}` : 'Add a new investment commodity to your portfolio'}
          </Typography>
        </Box>
        {isEditMode && commodity?.assetClass && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2, py: 0.75, borderRadius: 2,
            bgcolor: alpha(cfg.hex, 0.12), border: `1px solid ${alpha(cfg.hex, 0.3)}`
          }}>
            <i className={cfg.icon} style={{ fontSize: 16, color: cfg.hex }} />
            <Typography variant='body2' fontWeight={700} sx={{ color: cfg.hex }}>{cfg.label}</Typography>
          </Box>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* ── Left: Commodity form ─────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: isEditMode ? 5 : 12 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {/* Accent bar */}
            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${cfg.hex}, ${alpha(cfg.hex, 0.3)})`, transition: 'background 0.4s' }} />
            <Box sx={{ px: 3.5, pt: 3, pb: 4 }}>
              {/* Card title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(cfg.hex, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                  <i className={cfg.icon} style={{ fontSize: 18, color: cfg.hex, transition: 'color 0.3s' }} />
                </Box>
                <Box>
                  <Typography variant='subtitle1' fontWeight={700}>Commodity Details</Typography>
                  <Typography variant='caption' color='text.secondary'>Fill in all required fields</Typography>
                </Box>
              </Box>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                  {/* ── Asset Class toggle ──────────────────────────────── */}
                  <Box>
                    <FieldLabel required>Asset Class</FieldLabel>
                    <Controller
                      name='assetClass'
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          {ASSET_CLASSES.map(cls => {
                            const c = assetClassConfig[cls]
                            const active = field.value === cls

                            
return (
                              <Box
                                key={cls}
                                onClick={() => field.onChange(cls)}
                                sx={{
                                  flex: 1, py: 1.5, px: 1, borderRadius: 1.5,
                                  border: '2px solid', cursor: 'pointer',
                                  borderColor: active ? c.hex : 'divider',
                                  bgcolor: active ? alpha(c.hex, 0.1) : 'transparent',
                                  transition: 'all 0.18s',
                                  '&:hover': { borderColor: c.hex, bgcolor: alpha(c.hex, 0.06) },
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5
                                }}
                              >
                                <i className={c.icon} style={{ fontSize: 22, color: active ? c.hex : 'inherit', opacity: active ? 1 : 0.4, transition: 'color 0.18s' }} />
                                <Typography variant='caption' fontWeight={700}
                                  sx={{ color: active ? c.hex : 'text.secondary', letterSpacing: 0.3, transition: 'color 0.18s' }}>
                                  {c.label}
                                </Typography>
                                <Typography variant='caption'
                                  sx={{ fontSize: '0.65rem', color: 'text.disabled', textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                                  {c.desc}
                                </Typography>
                              </Box>
                            )
                          })}
                        </Box>
                      )}
                    />
                    {errors.assetClass && <FormHelperText error sx={{ mt: 0.5 }}>{errors.assetClass.message}</FormHelperText>}
                  </Box>

                  {/* ── Code + Name ─────────────────────────────────────── */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <FieldLabel required>Code</FieldLabel>
                      <Controller
                        name='code'
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size='small'
                            fullWidth
                            disabled={isEditMode}
                            placeholder='e.g. SJC, USD_VND'
                            error={!!errors.code}
                            helperText={errors.code?.message}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position='start'>
                                    <i className={cfg.icon} style={{ fontSize: 16, color: cfg.hex, opacity: 0.7 }} />
                                  </InputAdornment>
                                )
                              }
                            }}
                          />
                        )}
                      />
                    </Box>
                    <Box>
                      <FieldLabel required>Name</FieldLabel>
                      <Controller
                        name='name'
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size='small'
                            fullWidth
                            placeholder='e.g. SJC Gold Bar'
                            error={!!errors.name}
                            helperText={errors.name?.message}
                          />
                        )}
                      />
                    </Box>
                  </Box>

                  {/* ── Default Unit ─────────────────────────────────────── */}
                  <Box>
                    <FieldLabel>Default Unit</FieldLabel>
                    <Controller
                      name='defaultUnitId'
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          size='small'
                          options={units}
                          getOptionLabel={(opt: UnitDto) => `${opt.name} (${opt.code})`}
                          value={units.find(u => u.id === field.value) ?? null}
                          onChange={(_, val) => field.onChange(val?.id ?? '')}
                          renderInput={params => <TextField {...params} placeholder='Search units…' />}
                          isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        />
                      )}
                    />
                  </Box>

                  {/* ── Description ──────────────────────────────────────── */}
                  <Box>
                    <FieldLabel>Description</FieldLabel>
                    <Controller
                      name='description'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size='small'
                          fullWidth
                          multiline
                          rows={3}
                          placeholder='Brief description of this commodity…'
                          error={!!errors.description}
                          helperText={errors.description?.message}
                        />
                      )}
                    />
                  </Box>

                  {/* ── Actions ──────────────────────────────────────────── */}
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                    <Button
                      variant='outlined'
                      onClick={() => router.push(isEditMode ? `/commodities/${commodityId}` : '/commodities')}
                      sx={{ fontWeight: 700 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type='submit'
                      variant='contained'
                      disabled={isSubmitting}
                      startIcon={
                        isSubmitting
                          ? <i className='tabler-loader-2 animate-spin' style={{ fontSize: 16 }} />
                          : <i className={isEditMode ? 'tabler-device-floppy' : 'tabler-plus'} style={{ fontSize: 16 }} />
                      }
                      sx={{ fontWeight: 700, px: 3, bgcolor: cfg.hex, '&:hover': { bgcolor: alpha(cfg.hex, 0.85) } }}
                    >
                      {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Commodity'}
                    </Button>
                  </Box>
                </Box>
              </form>
            </Box>
          </Card>
        </Grid>

        {/* ── Right: Holdings + Transactions (edit only) ────────────────────── */}
        {isEditMode && (
          <Grid size={{ xs: 12, md: 7 }}>

            {/* Holdings summary */}
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <i className='tabler-wallet' style={{ fontSize: 18, color: cfg.hex }} />
                <Typography variant='subtitle1' fontWeight={700}>Holdings Summary</Typography>
              </Box>
              <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                {[
                  { label: 'Qty Held',       v: holdings.qty.toLocaleString('en-US', { maximumFractionDigits: 4 }) },
                  { label: 'Total Invested', v: fmtCurrency(holdings.invested) },
                  { label: 'Avg Cost',       v: fmtCurrency(holdings.avg) },
                  { label: 'Total Fees',     v: fmtCurrency(holdings.fees) }
                ].map(kpi => (
                  <Box key={kpi.label}>
                    <Typography variant='caption' color='text.secondary' fontWeight={500}>{kpi.label}</Typography>
                    <Typography variant='subtitle2' fontWeight={700} sx={{ mt: 0.5 }}>{kpi.v}</Typography>
                  </Box>
                ))}
              </Box>
            </Card>

            {/* Transactions */}
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <i className='tabler-history' style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
                  <Typography variant='subtitle1' fontWeight={700}>Transactions</Typography>
                  {transactions.length > 0 && (
                    <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: 'action.selected' }}>
                      <Typography variant='caption' fontWeight={700}>{transactions.length}</Typography>
                    </Box>
                  )}
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<i className='tabler-plus' style={{ fontSize: 13 }} />}
                  onClick={() => setTxnOpen(true)}
                  sx={{ fontWeight: 700, borderRadius: 1.5 }}
                >
                  Add
                </Button>
              </Box>

              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      {['Type', 'Date', 'Qty', 'Price/Unit', 'Total', 'Fee', ''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.25 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                          <Box sx={{ opacity: 0.4 }}>
                            <i className='tabler-inbox' style={{ fontSize: 32 }} />
                            <Typography variant='body2' sx={{ mt: 1 }}>No transactions yet.</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((txn: InvestmentTransactionDto) => {
                        const tc2 = txnTypeConfig[txn.transactionType ?? 'Buy']

                        
return (
                          <TableRow key={txn.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.9, py: 0.3, borderRadius: 1, bgcolor: tc2.bg }}>
                                <i className={tc2.icon} style={{ fontSize: 11, color: tc2.hex }} />
                                <Typography variant='caption' fontWeight={700} sx={{ color: tc2.hex, fontSize: '0.68rem' }}>
                                  {txn.transactionType?.toUpperCase()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtDate(txn.transactionDate)}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                              {txn.quantity?.toLocaleString()} <Typography component='span' variant='caption' color='text.disabled'>{txn.unitCode}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{fmtCurrency(txn.pricePerUnit)}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{fmtCurrency(txn.totalAmount)}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{txn.feeAmount ? fmtCurrency(txn.feeAmount) : '—'}</TableCell>
                            <TableCell sx={{ pr: 1.5 }}>
                              <Tooltip title='Delete'>
                                <IconButton size='small' onClick={() => handleDeleteTxn(txn.id!)}
                                  sx={{ opacity: 0.35, '&:hover': { opacity: 1, color: 'error.main' } }}>
                                  <i className='tabler-trash' style={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ── Add Transaction Dialog ────────────────────────────────────────────── */}
      <Dialog open={txnOpen} onClose={() => { setTxnOpen(false); resetTxn() }} maxWidth='sm' fullWidth>
        <form onSubmit={handleTxnSubmit(onTxnSubmit)}>
          <DialogTitle sx={{ pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(cfg.hex, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={cfg.icon} style={{ fontSize: 18, color: cfg.hex }} />
              </Box>
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>Add Transaction</Typography>
                <Typography variant='caption' color='text.secondary'>{commodity?.name} · {commodity?.code}</Typography>
              </Box>
            </Box>
          </DialogTitle>
          <Divider sx={{ mt: 2 }} />
          <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Buy / Sell toggle */}
            <Box>
              <FieldLabel required>Transaction Type</FieldLabel>
              <Controller
                name='transactionType'
                control={txnControl}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {TRANSACTION_TYPES.map(type => {
                      const c2 = txnTypeConfig[type]
                      const active = field.value === type

                      
return (
                        <Box
                          key={type}
                          onClick={() => field.onChange(type)}
                          sx={{
                            flex: 1, py: 1.5, borderRadius: 1.5, textAlign: 'center', cursor: 'pointer',
                            border: '2px solid', borderColor: active ? c2.hex : 'divider',
                            bgcolor: active ? c2.bg : 'transparent', transition: 'all 0.15s',
                            '&:hover': { borderColor: c2.hex }
                          }}
                        >
                          <i className={c2.icon} style={{ fontSize: 20, color: c2.hex, display: 'block' }} />
                          <Typography variant='body2' fontWeight={700} sx={{ color: c2.hex, mt: 0.5 }}>{type}</Typography>
                        </Box>
                      )
                    })}
                  </Box>
                )}
              />
            </Box>

            {/* Date + Qty + Unit + Price */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <FieldLabel required>Date</FieldLabel>
                <Controller
                  name='transactionDate'
                  control={txnControl}
                  render={({ field }) => (
                    <TextField {...field} type='date' size='small' fullWidth
                      error={!!txnErrors.transactionDate} helperText={txnErrors.transactionDate?.message}
                    />
                  )}
                />
              </Box>
              <Box>
                <FieldLabel required>Quantity</FieldLabel>
                <Controller
                  name='quantity'
                  control={txnControl}
                  render={({ field }) => (
                    <TextField {...field} onChange={e => field.onChange(Number(e.target.value))}
                      type='number' size='small' fullWidth
                      error={!!txnErrors.quantity} helperText={txnErrors.quantity?.message}
                      slotProps={{ htmlInput: { step: 'any', min: 0 } }}
                    />
                  )}
                />
              </Box>
              <Box>
                <FieldLabel required>Unit</FieldLabel>
                <Controller
                  name='unitId'
                  control={txnControl}
                  render={({ field }) => (
                    <Autocomplete
                      size='small'
                      options={units}
                      getOptionLabel={(opt: UnitDto) => `${opt.name} (${opt.code})`}
                      value={units.find(u => u.id === field.value) ?? null}
                      onChange={(_, val) => field.onChange(val?.id ?? '')}
                      renderInput={params => <TextField {...params} error={!!txnErrors.unitId} helperText={txnErrors.unitId?.message} />}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    />
                  )}
                />
              </Box>
              <Box>
                <FieldLabel required>Price per Unit</FieldLabel>
                <Controller
                  name='pricePerUnit'
                  control={txnControl}
                  render={({ field }) => (
                    <TextField {...field} onChange={e => field.onChange(Number(e.target.value))}
                      type='number' size='small' fullWidth
                      error={!!txnErrors.pricePerUnit}
                      slotProps={{ htmlInput: { step: 'any', min: 0 } }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Auto-calculated total */}
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              p: 2, borderRadius: 1.5,
              border: '1px solid', borderColor: txnTypeConfig[txnType]?.hex ?? 'divider',
              bgcolor: alpha(txnTypeConfig[txnType]?.hex ?? '#888', 0.06)
            }}>
              <Box>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>Total Amount</Typography>
                <Typography variant='caption' color='text.disabled' sx={{ display: 'block' }}>Auto-calculated · Qty × Price</Typography>
              </Box>
              <Typography variant='h6' fontWeight={700} sx={{ color: txnTypeConfig[txnType]?.hex }}>
                {fmtCurrency(txnTotal)}
              </Typography>
            </Box>

            {/* Fee + Notes */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <FieldLabel>Fee</FieldLabel>
                <Controller
                  name='feeAmount'
                  control={txnControl}
                  render={({ field }) => (
                    <TextField {...field} onChange={e => field.onChange(Number(e.target.value))}
                      type='number' size='small' fullWidth placeholder='0'
                      slotProps={{ htmlInput: { step: 'any', min: 0 } }}
                    />
                  )}
                />
              </Box>
              <Box>
                <FieldLabel>Notes</FieldLabel>
                <Controller
                  name='notes'
                  control={txnControl}
                  render={({ field }) => (
                    <TextField {...field} size='small' fullWidth placeholder='Optional…' />
                  )}
                />
              </Box>
            </Box>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={() => { setTxnOpen(false); resetTxn() }} variant='outlined' sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={createTxnMutation.isPending}
              startIcon={createTxnMutation.isPending
                ? <i className='tabler-loader-2 animate-spin' style={{ fontSize: 15 }} />
                : <i className='tabler-circle-check' style={{ fontSize: 15 }} />
              }
              sx={{ fontWeight: 700, minWidth: 140 }}
            >
              {createTxnMutation.isPending ? 'Saving…' : 'Add Transaction'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default CommodityEditor
