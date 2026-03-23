'use client'

import { useEffect, useMemo, useState } from 'react'

import { alpha } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { createGuardrails, generateSync } from 'otplib'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'

import {
  getApiV1AccountSalesAccountClones,
  getGetApiV1AccountSalesOrdersQueryKey,
  useGetApiV1AccountSalesAccountClones,
  getGetApiV1AccountSalesProductsQueryKey,
  useGetApiV1AccountSalesMembers,
  useGetApiV1AccountSalesOrders,
  useGetApiV1AccountSalesProducts,
  usePostApiV1AccountSalesProducts,
  usePostApiV1AccountSalesWarrantyCheck,
  usePostApiV1AccountSalesOrdersOrderIdReplace,
  usePostApiV1AccountSalesOrdersSell,
  AccountProductType
} from '@/generated/core-api'
import type {
  AccountCloneDto,
  AccountOrderDto,
  ApiErrorResponse,
  CheckWarrantyRequest,
  CreateAccountOrderRequest,
  CreateProductRequest,
  CreateProductVariantRequest,
  ReplaceAccountOrderRequest,
  WarrantyCheckResultDto
} from '@/generated/core-api'

const OTP_STEP_SECONDS = 30
const OTP_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 1 })

const statusTone: Record<string, string> = {
  Active: '#2563eb',
  WarrantyDone: '#16a34a',
  Refunded: '#ef4444'
}

const CloneInfoRow = ({ label, value, copyable, secret }: { label: string; value?: string | null; copyable?: boolean; secret?: boolean }) => {
  const [revealed, setRevealed] = useState(false)

  if (!value) return null

  const handleCopy = () => {
    void navigator.clipboard.writeText(value)
    toast.success(`Copied ${label}`)
  }

  const displayValue = secret && !revealed ? '•'.repeat(Math.min(value.length, 16)) : value

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75 }}>
      <Typography variant='caption' color='text.secondary' sx={{ minWidth: 110, flexShrink: 0, pt: 0.25 }}>{label}</Typography>
      <Typography variant='body2' sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1, letterSpacing: secret && !revealed ? 2 : undefined }}>{displayValue}</Typography>
      {secret && (
        <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
          <IconButton size='small' onClick={() => setRevealed(v => !v)} sx={{ flexShrink: 0 }}>
            <i className={revealed ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
      {copyable && (
        <Tooltip title='Copy'>
          <IconButton size='small' onClick={handleCopy} sx={{ flexShrink: 0 }}><i className='tabler-copy' style={{ fontSize: 14 }} /></IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

type OrderCodeAware = {
  orderCode?: string | null
  id?: string
}

const getOrderCodeDisplay = (order: OrderCodeAware) => {
  return order.orderCode || order.id?.slice(0, 10)
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  const apiError = error as ApiErrorResponse

  return apiError.errors?.[0]?.message || fallback
}

const getMemberLabel = (member: { displayName?: string | null; sourceId?: string | null; id?: string }) => {
  return member.displayName || member.sourceId || member.id || ''
}

const getProductLabel = (product: { name?: string | null; id?: string }) => {
  return product.name || product.id || ''
}

const getCloneLabel = (clone: AccountCloneDto) => {
  const username = clone.username || 'unknown'
  const externalId = clone.externalAccountId || clone.id || '-'

  return `${username} | ${externalId}`
}

const createDefaultVariant = (): CreateProductVariantRequest => ({
  name: 'Default',
  price: 0,
  warrantyDays: 30
})

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/[^\d]/g, '')

  return normalized ? Number(normalized) : 0
}

const formatCurrencyInput = (value?: number | null) => {
  return Number(value || 0).toLocaleString('en-US')
}

type SellOrderForm = CreateAccountOrderRequest & {
  accountCloneId?: string
}

const getVariantLabel = (variant: { name?: string | null; price?: number | null; warrantyDays?: number | null; id?: string }) => {
  const name = variant.name || variant.id || 'Variant'
  const price = Number(variant.price || 0).toLocaleString('vi-VN')
  const warrantyDays = variant.warrantyDays || 0

  return `${name} | ${price} VND | ${warrantyDays} days`
}

const AccountSalesOrders = () => {
  const queryClient = useQueryClient()

  const [searchMember, setSearchMember] = useState('')
  const [searchOrderCode, setSearchOrderCode] = useState('')
  const [searchSeller, setSearchSeller] = useState('')
  const [debouncedMember, setDebouncedMember] = useState('')
  const [debouncedOrderCode, setDebouncedOrderCode] = useState('')
  const [page, setPage] = useState(1)
  const [openSell, setOpenSell] = useState(false)
  const [openCreateProduct, setOpenCreateProduct] = useState(false)
  const [sellForm, setSellForm] = useState<SellOrderForm>({ memberId: '', productId: '', productVariantId: '', accountCloneId: '' })

  const [productForm, setProductForm] = useState<CreateProductRequest>({
    name: '',
    productType: AccountProductType.Other,
    variants: [createDefaultVariant()],
    description: ''
  })

  const [replaceOrderId, setReplaceOrderId] = useState<string | null>(null)
  const [replaceAccountCloneId, setReplaceAccountCloneId] = useState<string>('')
  const [openWarrantyCheck, setOpenWarrantyCheck] = useState(false)
  const [checkingWarranty, setCheckingWarranty] = useState(false)
  const [warrantyForm, setWarrantyForm] = useState<CheckWarrantyRequest>({ productId: '', username: '' })
  const [warrantyResult, setWarrantyResult] = useState<WarrantyCheckResultDto | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AccountOrderDto | null>(null)

  const [nowMs, setNowMs] = useState(0)

  const cloneDetailQuery = useQuery<AccountCloneDto | null>({
    queryKey: ['account-clone-detail', selectedOrder?.accountCloneId],
    enabled: !!selectedOrder?.accountCloneId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await getApiV1AccountSalesAccountClones({
        filter: `id == '${selectedOrder!.accountCloneId}'`,
        pageSize: 1,
        view: 'detail'
      })

      return res.result?.items?.[0] ?? null
    }
  })

  const membersQuery = useGetApiV1AccountSalesMembers({ page: 1, pageSize: 200, sort: '-createdAt' })
  const productsQuery = useGetApiV1AccountSalesProducts({ page: 1, pageSize: 200, sort: 'name' })
  const clonesQuery = useGetApiV1AccountSalesAccountClones({ page: 1, pageSize: 500, sort: '-createdAt' })

  const members = useMemo(() => membersQuery.data?.result?.items ?? [], [membersQuery.data?.result?.items])
  const products = useMemo(() => productsQuery.data?.result?.items ?? [], [productsQuery.data?.result?.items])
  const clones = useMemo(() => clonesQuery.data?.result?.items ?? [], [clonesQuery.data?.result?.items])

  const selectedProduct = useMemo(
    () => products.find(product => product.id === sellForm.productId),
    [products, sellForm.productId]
  )

  const referrerCandidates = useMemo(() => {
    return members.filter(member => member.id && member.id !== sellForm.memberId)
  }, [members, sellForm.memberId])

  const availableSellClones = useMemo(() => {
    if (!sellForm.productId) {
      return []
    }

    return clones.filter(clone => clone.product?.id === sellForm.productId && clone.status === 'Verified')
  }, [clones, sellForm.productId])

  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now())

  useEffect(() => {
    setNowMs(Date.now())
  }, [])

  useEffect(() => {
    if (!cloneDetailQuery.data?.twoFaSecret) return
    const id = setInterval(() => setNowEpochMs(Date.now()), 1000)

    return () => clearInterval(id)
  }, [cloneDetailQuery.data?.twoFaSecret])

  const otpView = useMemo(() => {
    const secret = cloneDetailQuery.data?.twoFaSecret?.replace(/\s+/g, '')

    if (!secret) return { code: '-', remainingSeconds: OTP_STEP_SECONDS, valid: false }

    const epochSeconds = Math.floor(nowEpochMs / 1000)
    const remainingSeconds = OTP_STEP_SECONDS - (epochSeconds % OTP_STEP_SECONDS)

    try {
      const code = generateSync({ secret, period: OTP_STEP_SECONDS, epoch: epochSeconds, guardrails: OTP_GUARDRAILS })

      return { code, remainingSeconds, valid: true }
    } catch {
      return { code: 'Invalid secret', remainingSeconds, valid: false }
    }
  }, [nowEpochMs, cloneDetailQuery.data?.twoFaSecret])

  const otpauthUri = useMemo(() => {
    const secret = cloneDetailQuery.data?.twoFaSecret?.replace(/\s+/g, '')

    if (!secret || !otpView.valid) return null

    const issuer = selectedOrder?.productName || 'Alfred'
    const account = cloneDetailQuery.data?.username || 'account'

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  }, [cloneDetailQuery.data?.twoFaSecret, cloneDetailQuery.data?.username, selectedOrder?.productName, otpView.valid])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMember(searchMember)
      setDebouncedOrderCode(searchOrderCode)
      setPage(1)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchMember, searchOrderCode])

  const ordersFilter = useMemo(() => {
    const parts: string[] = []

    if (debouncedMember.trim()) parts.push(`memberDisplayName @contains('${debouncedMember.trim()}')`)
    if (debouncedOrderCode.trim()) parts.push(`orderCode @contains('${debouncedOrderCode.trim()}')`)

    return parts.join(' and ') || undefined
  }, [debouncedMember, debouncedOrderCode])

  const ordersQuery = useGetApiV1AccountSalesOrders({
    page,
    pageSize: 10,
    sort: '-purchaseDate',
    filter: ordersFilter,
    view: 'list'
  })

  const sellMutation = usePostApiV1AccountSalesOrdersSell({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Sell failed. Please check product inventory.')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesOrdersQueryKey() })

        setOpenSell(false)
      }
    }
  })

  const replaceMutation = usePostApiV1AccountSalesOrdersOrderIdReplace({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to replace warranty order')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesOrdersQueryKey() })

        setReplaceOrderId(null)
      }
    }
  })

  const createProductMutation = usePostApiV1AccountSalesProducts({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create product')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesProductsQueryKey() })

        const createdProduct = response.result

        if (createdProduct?.id) {
          setSellForm(prev => ({
            ...prev,
            productId: createdProduct.id,
            productVariantId: createdProduct.variants?.[0]?.id || '',
            accountCloneId: ''
          }))
        }

        setOpenCreateProduct(false)
        setProductForm({
          name: '',
          productType: AccountProductType.Other,
          variants: [createDefaultVariant()],
          description: ''
        })
      }
    }
  })

  const checkWarrantyMutation = usePostApiV1AccountSalesWarrantyCheck()

  const allOrders = useMemo(() => ordersQuery.data?.result?.items ?? [], [ordersQuery.data?.result?.items])

  const orders = useMemo(() => {
    if (!searchSeller.trim()) return allOrders

    const lower = searchSeller.trim().toLowerCase()

    return allOrders.filter(o => {
      const name = o.soldByUser?.fullName?.toLowerCase() ?? ''
      const email = o.soldByUser?.email?.toLowerCase() ?? ''

      return name.includes(lower) || email.includes(lower)
    })
  }, [allOrders, searchSeller])

  const replaceOrder = useMemo(() => {
    if (!replaceOrderId) {
      return null
    }

    return orders.find(order => order.id === replaceOrderId) || null
  }, [orders, replaceOrderId])

  const availableReplacementClones = useMemo(() => {
    if (!replaceOrder?.productId) {
      return []
    }

    return clones.filter(
      clone =>
        clone.product?.id === replaceOrder.productId &&
        clone.status === 'Verified' &&
        clone.id !== replaceOrder.accountCloneId
    )
  }, [clones, replaceOrder])

  const ordersApiErrorMessage = useMemo(() => {
    const error = membersQuery.error || productsQuery.error || clonesQuery.error || ordersQuery.error

    return getApiErrorMessage(error, 'Unable to load order data from API.')
  }, [membersQuery.error, productsQuery.error, clonesQuery.error, ordersQuery.error])

  const soonExpired = useMemo(
    () => orders.filter(order => {
      if (!order.warrantyExpiry) {
        return false
      }

      const diff = new Date(order.warrantyExpiry).getTime() - nowMs
      const hours = diff / (1000 * 60 * 60)

      return hours > 0 && hours <= 48
    }).length,
    [nowMs, orders]
  )

  useEffect(() => {
    if (membersQuery.isError || productsQuery.isError || clonesQuery.isError || ordersQuery.isError) {
      toast.error(ordersApiErrorMessage)
    }
  }, [membersQuery.isError, productsQuery.isError, clonesQuery.isError, ordersQuery.isError, ordersApiErrorMessage])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant='h4' fontWeight={800}>Orders & Warranty</Typography>
            <Typography variant='body2' color='text.secondary'>Manage account handover, OTP visibility, and warranty replacement workflow.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            <TextField
              size='small'
              label='Search by member'
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size='small'
              label='Search by order code'
              value={searchOrderCode}
              onChange={e => setSearchOrderCode(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size='small'
              label='Search by seller'
              value={searchSeller}
              onChange={e => setSearchSeller(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setOpenSell(true)}>
              New Order
            </Button>
            <Button variant='outlined' startIcon={<i className='tabler-key' />} href='/account-sales/clones'>
              Manage Account Clones
            </Button>
            <Button variant='outlined' startIcon={<i className='tabler-shield-check' />} onClick={() => setOpenWarrantyCheck(true)}>
              Check Warranty
            </Button>
            <Button variant='outlined' startIcon={<i className='tabler-package' />} onClick={() => setOpenCreateProduct(true)}>
              New Product
            </Button>
          </Box>
        </Box>

        <Stack direction='row' spacing={1} sx={{ mt: 2.2 }}>
          <Chip label={`All Orders ${ordersQuery.data?.result?.total ?? 0}`} color='primary' variant='outlined' />
          <Chip label={`Expiring Soon ${soonExpired}`} color='warning' variant='outlined' />
          <Chip label={`Active ${orders.filter(x => x.status === 'Active').length}`} color='success' variant='outlined' />
        </Stack>
      </Card>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer / Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Warranty Expiry</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map(order => {
                const tone = statusTone[order.status || 'Active'] || '#64748b'
                const expiry = order.warrantyExpiry ? new Date(order.warrantyExpiry) : null
                const remainingHours = expiry ? Math.floor((expiry.getTime() - nowMs) / (1000 * 60 * 60)) : null

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={700}>{getOrderCodeDisplay(order)}</Typography>
                      <Typography variant='caption' color='text.secondary'>Purchased: {order.purchaseDate?.slice(0, 10)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={700}>{order.memberDisplayName || 'Unknown member'}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {order.productName} {order.productVariantNameSnapshot ? `| ${order.productVariantNameSnapshot}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{order.warrantyExpiry?.slice(0, 16).replace('T', ' ')}</Typography>
                      {remainingHours !== null && remainingHours > 0 && remainingHours <= 48 && (
                        <Typography variant='caption' sx={{ color: '#dc2626', fontWeight: 700 }}>
                          {remainingHours}h remaining
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={700}>{order.soldByUser?.fullName || order.soldByUser?.email || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size='small'
                        sx={{
                          bgcolor: alpha(tone, 0.16),
                          color: tone,
                          border: `1px solid ${alpha(tone, 0.25)}`,
                          fontWeight: 700
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={1}>
                        <Button
                          variant='outlined'
                          size='small'
                          onClick={async () => {
                            const payload = `${order.id}|${order.productName}|${order.warrantyExpiry}`

                            await navigator.clipboard.writeText(payload)
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          color='info'
                          onClick={() => setSelectedOrder(order)}
                          disabled={!order.accountCloneId}
                        >
                          Account
                        </Button>
                        <Button
                          size='small'
                          variant='contained'
                          color='warning'
                          onClick={() => {
                            setReplaceOrderId(order.id ?? null)
                            setReplaceAccountCloneId('')
                          }}
                          disabled={!order.id}
                        >
                          Warranty
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                      No orders available for this member.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing {orders.length} of {ordersQuery.data?.result?.total ?? 0} active account orders
          </Typography>
          <Pagination
            page={page}
            count={ordersQuery.data?.result?.totalPages ?? 1}
            onChange={(_, value) => setPage(value)}
          />
        </Stack>
      </Card>

      <Dialog open={openSell} onClose={() => setOpenSell(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Create New Order</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <Autocomplete
              options={members}
              value={members.find(member => member.id === sellForm.memberId) ?? null}
              onChange={(_, member) =>
                setSellForm(prev => ({
                  ...prev,
                  memberId: member?.id || '',
                  referrerMemberId: prev.referrerMemberId === member?.id ? null : prev.referrerMemberId
                }))
              }
              getOptionLabel={getMemberLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => <TextField {...params} label='Member' />}
            />
            <Autocomplete
              options={products}
              value={products.find(product => product.id === sellForm.productId) ?? null}
              onChange={(_, product) =>
                setSellForm(prev => ({
                  ...prev,
                  productId: product?.id || '',
                  productVariantId: '',
                  accountCloneId: ''
                }))
              }
              getOptionLabel={getProductLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Product'
                  helperText={products.length === 0 ? 'No product yet. Create one first.' : undefined}
                />
              )}
            />
            <Autocomplete
              options={selectedProduct?.variants || []}
              value={(selectedProduct?.variants || []).find(variant => variant.id === sellForm.productVariantId) ?? null}
              onChange={(_, variant) => setSellForm(prev => ({ ...prev, productVariantId: variant?.id || '' }))}
              getOptionLabel={getVariantLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Product package'
                  helperText={!sellForm.productId ? 'Select product first.' : undefined}
                />
              )}
              disabled={!sellForm.productId}
            />
            <Autocomplete
              options={availableSellClones}
              value={availableSellClones.find(clone => clone.id === sellForm.accountCloneId) ?? null}
              onChange={(_, clone) => setSellForm(prev => ({ ...prev, accountCloneId: clone?.id || '' }))}
              getOptionLabel={getCloneLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Account clone to sell'
                  helperText={!sellForm.productId ? 'Select product first.' : undefined}
                />
              )}
              disabled={!sellForm.productId}
            />
            <Autocomplete
              options={referrerCandidates}
              value={referrerCandidates.find(member => member.id === sellForm.referrerMemberId) ?? null}
              onChange={(_, member) =>
                setSellForm(prev => ({
                  ...prev,
                  referrerMemberId: member?.id || null
                }))
              }
              getOptionLabel={getMemberLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Referrer member (optional)'
                  helperText='Select a referrer member so the system can calculate referral commission.'
                />
              )}
            />
            {products.length === 0 && (
              <Button variant='outlined' onClick={() => setOpenCreateProduct(true)}>
                Create Product
              </Button>
            )}
            <TextField
              label='Order note'
              multiline
              minRows={3}
              value={sellForm.orderNote || ''}
              onChange={event => setSellForm(prev => ({ ...prev, orderNote: event.target.value }))}
            />
            {sellMutation.data?.result && (
              <Alert severity='success'>
                Issued: {sellMutation.data.result.username} | {sellMutation.data.result.password} | {sellMutation.data.result.otpCode}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenSell(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={
              !sellForm.memberId ||
              !sellForm.productId ||
              !sellForm.productVariantId ||
              !sellForm.accountCloneId ||
              sellMutation.isPending
            }
            onClick={async () => {
              await sellMutation.mutateAsync({ data: sellForm })
            }}
          >
            Sell Account
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCreateProduct} onClose={() => setOpenCreateProduct(false)} fullWidth maxWidth='md'>
        <DialogTitle sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 1.5 }}>Create Product</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pt: 2.5, pb: 1.5 }}>
          <Stack spacing={2.5}>
            <TextField
              label='Product name'
              value={productForm.name || ''}
              onChange={event => setProductForm(prev => ({ ...prev, name: event.target.value }))}
            />
            <Autocomplete
              options={Object.values(AccountProductType)}
              value={productForm.productType || AccountProductType.Other}
              onChange={(_, productType) =>
                setProductForm(prev => ({ ...prev, productType: (productType || AccountProductType.Other) as AccountProductType }))
              }
              renderInput={params => <TextField {...params} label='Product type' />}
            />
            <Stack spacing={2}>
              <Typography variant='subtitle2' fontWeight={700}>Product packages</Typography>
              {(productForm.variants || []).map((variant, index) => (
                <Stack key={`order-create-variant-${index}`} spacing={1}>
                  <TextField
                    label={`Package name #${index + 1}`}
                    value={variant.name || ''}
                    onChange={event =>
                      setProductForm(prev => ({
                        ...prev,
                        variants: (prev.variants || []).map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        )
                      }))
                    }
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label='Price (VND)'
                      type='text'
                      value={formatCurrencyInput(variant.price)}
                      inputMode='numeric'
                      onChange={event =>
                        setProductForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, price: parseCurrencyInput(event.target.value) } : item
                          )
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label='Warranty days'
                      type='number'
                      value={variant.warrantyDays ?? 30}
                      onChange={event =>
                        setProductForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, warrantyDays: Number(event.target.value) } : item
                          )
                        }))
                      }
                      fullWidth
                    />
                  </Stack>
                  <Stack direction='row' justifyContent='flex-end'>
                    <Button
                      color='error'
                      size='small'
                      onClick={() =>
                        setProductForm(prev => ({
                          ...prev,
                          variants: (prev.variants || []).filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                      disabled={(productForm.variants || []).length <= 1}
                    >
                      Remove package
                    </Button>
                  </Stack>
                </Stack>
              ))}
              <Button
                variant='outlined'
                size='small'
                onClick={() =>
                  setProductForm(prev => ({
                    ...prev,
                    variants: [...(prev.variants || []), createDefaultVariant()]
                  }))
                }
              >
                Add package
              </Button>
            </Stack>
            <TextField
              label='Description'
              multiline
              minRows={3}
              value={productForm.description || ''}
              onChange={event => setProductForm(prev => ({ ...prev, description: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenCreateProduct(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={!productForm.name || (productForm.variants || []).length === 0 || createProductMutation.isPending}
            onClick={async () => {
              await createProductMutation.mutateAsync({ data: productForm })
            }}
          >
            Create Product
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!replaceOrderId} onClose={() => setReplaceOrderId(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Issue Warranty Replacement</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={1.5}>
            <Typography variant='body2' color='text.secondary'>
              Select exactly which verified account clone will be used to replace this warranty order.
            </Typography>
            <Autocomplete
              options={availableReplacementClones}
              value={availableReplacementClones.find(clone => clone.id === replaceAccountCloneId) ?? null}
              onChange={(_, clone) => setReplaceAccountCloneId(clone?.id || '')}
              getOptionLabel={getCloneLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => <TextField {...params} label='Replacement account clone' />}
            />
          </Stack>
          {replaceMutation.data?.result && (
            <Alert severity='success' sx={{ mt: 1.5 }}>
              New credential: {replaceMutation.data.result.username} | {replaceMutation.data.result.password} | {replaceMutation.data.result.otpCode}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setReplaceOrderId(null)}>Cancel</Button>
          <Button
            variant='contained'
            color='warning'
            disabled={!replaceOrderId || !replaceAccountCloneId || replaceMutation.isPending}
            onClick={async () => {
              if (!replaceOrderId) {
                return
              }

              const payload: ReplaceAccountOrderRequest & { replacementAccountCloneId: string } = {
                replacementAccountCloneId: replaceAccountCloneId,
                orderNote: 'Warranty replacement issued from UI'
              }

              await replaceMutation.mutateAsync({ orderId: replaceOrderId, data: payload })
            }}
          >
            Replace Now
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openWarrantyCheck}
        onClose={() => {
          setOpenWarrantyCheck(false)
          setWarrantyResult(null)
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Check Warranty Ownership</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <Autocomplete
              options={products}
              value={products.find(product => product.id === warrantyForm.productId) ?? null}
              onChange={(_, product) => setWarrantyForm(prev => ({ ...prev, productId: product?.id || '' }))}
              getOptionLabel={getProductLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={params => <TextField {...params} label='Product' />}
            />
            <TextField
              label='Username (optional)'
              value={warrantyForm.username || ''}
              onChange={event => setWarrantyForm(prev => ({ ...prev, username: event.target.value }))}
            />
            {warrantyResult && (
              <Alert severity={warrantyResult.isSoldByUs && warrantyResult.isInWarranty ? 'success' : 'warning'}>
                {warrantyResult.message || 'Warranty check completed.'}
                {warrantyResult.order?.id ? ` | Order: ${getOrderCodeDisplay(warrantyResult.order as OrderCodeAware)}` : ''}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button
            onClick={() => {
              setOpenWarrantyCheck(false)
              setWarrantyResult(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={!warrantyForm.productId || checkingWarranty}
            onClick={async () => {
              setCheckingWarranty(true)

              try {
                const response = await checkWarrantyMutation.mutateAsync({ data: warrantyForm })

                if (!response.success) {
                  toast.error(response.errors?.[0]?.message || 'Failed to check warranty')
                }

                setWarrantyResult(response.result ?? null)
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Failed to check warranty'))
              } finally {
                setCheckingWarranty(false)
              }
            }}
          >
            {checkingWarranty ? 'Checking...' : 'Check'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Account Clone Detail Drawer ──────────────────────────────── */}
      <Drawer
        anchor='right'
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, p: 0 } } }}
      >
        {selectedOrder && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton size='small' onClick={() => setSelectedOrder(null)}>
                <i className='tabler-x' style={{ fontSize: 18 }} />
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Typography variant='subtitle1' fontWeight={700}>{getOrderCodeDisplay(selectedOrder)}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {selectedOrder.memberDisplayName || 'Unknown member'} · {selectedOrder.productName}
                </Typography>
              </Box>
              <Chip size='small' label={selectedOrder.status} color={selectedOrder.status === 'Active' ? 'primary' : 'default'} />
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Order Info */}
              <Box>
                <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: 1.2 }}>Order Info</Typography>
                <Divider sx={{ mb: 1.5, mt: 0.5 }} />
                <CloneInfoRow label='Variant' value={selectedOrder.productVariantNameSnapshot} />
                <CloneInfoRow label='Price' value={selectedOrder.unitPriceSnapshot != null ? `${selectedOrder.unitPriceSnapshot.toLocaleString('vi-VN')} VND` : null} />
                <CloneInfoRow label='Purchase Date' value={selectedOrder.purchaseDate?.slice(0, 10)} />
                <CloneInfoRow label='Warranty Expiry' value={selectedOrder.warrantyExpiry?.slice(0, 10)} />
                <CloneInfoRow label='Sold By' value={selectedOrder.soldByUser?.fullName || selectedOrder.soldByUser?.email} />
                {(selectedOrder.referralCommissionAmountSnapshot != null && selectedOrder.referralCommissionAmountSnapshot > 0) && (
                  <>
                    <CloneInfoRow
                      label='Commission'
                      value={`${selectedOrder.referralCommissionAmountSnapshot.toLocaleString('vi-VN')} ₫ (${selectedOrder.referralCommissionPercentSnapshot}%)`}
                    />
                    <CloneInfoRow
                      label='Referrer'
                      value={selectedOrder.referrerMember?.displayName || selectedOrder.referrerMemberId || null}
                    />
                  </>
                )}
                {selectedOrder.orderNote && <CloneInfoRow label='Note' value={selectedOrder.orderNote} />}
              </Box>

              {/* Account Clone Info */}
              <Box>
                <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: 1.2 }}>Account Clone</Typography>
                <Divider sx={{ mb: 1.5, mt: 0.5 }} />
                {cloneDetailQuery.isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                {cloneDetailQuery.isError && (
                  <Typography variant='body2' color='error'>Failed to load account info.</Typography>
                )}
                {cloneDetailQuery.data && (
                  <>
                    <CloneInfoRow label='Status' value={cloneDetailQuery.data.status} />
                    <CloneInfoRow label='External ID' value={cloneDetailQuery.data.externalAccountId} copyable />
                    <CloneInfoRow label='Username' value={cloneDetailQuery.data.username} copyable />
                    <CloneInfoRow label='Password' value={cloneDetailQuery.data.password} copyable secret />
                    <CloneInfoRow label='2FA Secret' value={cloneDetailQuery.data.twoFaSecret} copyable secret />
                    {otpView.valid && (
                      <Box sx={{ mt: 1.5, mb: 0.5 }}>
                        <Card
                          variant='outlined'
                          sx={{
                            p: 2,
                            borderColor: 'success.main',
                            backgroundColor: theme => alpha(theme.palette.success.main, 0.06),
                            borderRadius: 2
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ letterSpacing: 0.8 }}>LIVE OTP</Typography>
                            <Tooltip title='Copy code'>
                              <IconButton size='small' onClick={() => { void navigator.clipboard.writeText(otpView.code); toast.success('Copied OTP code') }}>
                                <i className='tabler-copy' style={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography
                            variant='h3'
                            fontWeight={800}
                            fontFamily='monospace'
                            color='success.main'
                            sx={{ letterSpacing: '0.2em', mb: 0.5 }}
                          >
                            {otpView.code.length === 6 ? `${otpView.code.slice(0, 3)} ${otpView.code.slice(3)}` : otpView.code}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>Refresh in {otpView.remainingSeconds}s</Typography>
                          {otpauthUri && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1.5, display: 'inline-flex', boxShadow: 1 }}>
                                <QRCodeSVG value={otpauthUri} size={160} />
                              </Box>
                              <Typography variant='caption' color='text.secondary' textAlign='center'>
                                Scan with Apple Passwords or Microsoft Authenticator
                              </Typography>
                            </Box>
                          )}
                        </Card>
                      </Box>
                    )}
                    <CloneInfoRow label='Extra Info' value={cloneDetailQuery.data.extraInfo} copyable secret />
                    <CloneInfoRow label='Sold At' value={cloneDetailQuery.data.soldAt?.slice(0, 16).replace('T', ' ')} />
                    <CloneInfoRow label='Verified At' value={cloneDetailQuery.data.verifiedAt?.slice(0, 16).replace('T', ' ')} />
                  </>
                )}
                {!cloneDetailQuery.isLoading && !cloneDetailQuery.data && !cloneDetailQuery.isError && (
                  <Typography variant='body2' color='text.secondary'>No account clone found for this order.</Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}

export default AccountSalesOrders
