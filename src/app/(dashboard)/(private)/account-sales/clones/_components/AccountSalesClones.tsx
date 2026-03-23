'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { createGuardrails, generateSync } from 'otplib'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'

import { dsl } from '@/utils/dslQueryBuilder'
import {
  AccountProductType,
  AccountCloneStatus,
  getApiV1AccountSalesWarrantyGithubUsersUsername,
  useGetApiV1AccountSalesAccountClones,
  useGetApiV1AccountSalesProducts,
  usePostApiV1AccountSalesAccountClones,
  usePutApiV1AccountSalesAccountClonesAccountCloneIdStatus
} from '@/generated/core-api'
import type {
  AccountCloneDto,
  AccountCloneDtoApiResponse,
  ApiErrorResponse,
  CreateAccountCloneRequest,
  GithubUserProfileDto,
  UpdateAccountCloneStatusRequest
} from '@/generated/core-api'
import { customFetch } from '@/libs/custom-instance'

const defaultCloneForm: CreateAccountCloneRequest = {
  productId: '',
  externalAccountId: '',
  username: '',
  password: '',
  twoFaSecret: '',
  extraInfo: ''
}

const PAGE_SIZE = 8
const OTP_STEP_SECONDS = 30
const OTP_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 1 })
const MANUAL_STATUS_OPTIONS: AccountCloneStatus[] = ['Init', 'Pending', 'Verified', 'RejectVerified']

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info' | 'secondary'> = {
  Init: 'default',
  Pending: 'warning',
  Verified: 'success',
  RejectVerified: 'error',
  Sold: 'info',
  InWarranty: 'secondary',
  Die: 'error'
}

const canManualStatusUpdate = (status?: AccountCloneStatus | null) => {
  if (!status) {
    return false
  }

  return MANUAL_STATUS_OPTIONS.includes(status)
}

const maskSensitiveValue = (value?: string | null) => {
  if (!value) {
    return '-'
  }

  return '*'.repeat(Math.max(8, Math.min(value.length, 16)))
}

const formatRelativeTime = (isoDate: string | null | undefined, nowMs: number) => {
  if (!isoDate) {
    return '-'
  }

  const parsed = new Date(isoDate)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  const diffMs = Math.max(0, nowMs - parsed.getTime())
  const minutes = Math.floor(diffMs / (1000 * 60))

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const weeks = Math.floor(days / 7)

  if (weeks < 5) {
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }

  const months = Math.floor(days / 30)

  if (months < 12) {
    return `${months} month${months > 1 ? 's' : ''} ago`
  }

  const years = Math.floor(days / 365)

  
return `${years} year${years > 1 ? 's' : ''} ago`
}

const AccountSalesClones = () => {
  const [form, setForm] = useState<CreateAccountCloneRequest>(defaultCloneForm)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 400)

    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, productFilter, statusFilter])
  const [openCreate, setOpenCreate] = useState(false)
  const [selectedClone, setSelectedClone] = useState<AccountCloneDto | null>(null)
  const [nowEpochMs, setNowEpochMs] = useState(0)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showCreateSecret, setShowCreateSecret] = useState(false)
  const [showViewPassword, setShowViewPassword] = useState(false)
  const [showViewSecret, setShowViewSecret] = useState(false)
  const [githubProfile, setGithubProfile] = useState<GithubUserProfileDto | null>(null)
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [openGithubModal, setOpenGithubModal] = useState(false)
  const [openEditGithubModal, setOpenEditGithubModal] = useState(false)
  const [editGithubProfile, setEditGithubProfile] = useState<GithubUserProfileDto | null>(null)
  const [isEditGithubLoading, setIsEditGithubLoading] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editTarget, setEditTarget] = useState<AccountCloneDto | null>(null)
  const [editForm, setEditForm] = useState<CreateAccountCloneRequest>(defaultCloneForm)
  const [githubUsernameInput, setGithubUsernameInput] = useState('')
  const [editGithubUsernameInput, setEditGithubUsernameInput] = useState('')
  const [targetStatus, setTargetStatus] = useState<AccountCloneStatus>('Init')

  useEffect(() => {
    setNowEpochMs(Date.now())
    const timer = window.setInterval(() => setNowEpochMs(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  const productsQuery = useGetApiV1AccountSalesProducts({ page: 1, pageSize: 200, sort: 'name' })

  const products = useMemo(() => productsQuery.data?.result?.items ?? [], [productsQuery.data?.result?.items])
  const selectedProduct = useMemo(() => products.find(product => product.id === form.productId), [form.productId, products])
  const isGithubProduct = selectedProduct?.productType === AccountProductType.Github
  const editProduct = useMemo(() => products.find(product => product.id === editTarget?.product?.id), [products, editTarget?.product?.id])
  const isEditGithubProduct = editProduct?.productType === AccountProductType.Github

  useEffect(() => {
    if (!form.productId && products.length > 0 && products[0].id) {
      setForm(prev => ({ ...prev, productId: products[0].id }))
    }
  }, [form.productId, products])

  const filter = useMemo(() => {
    let builder = dsl()
    const value = debouncedKeyword.trim().toLowerCase()

    if (value) {
      builder = builder.group(g => {
        g.string('username').contains(value).or().string('externalAccountId').contains(value)
      })
    }

    if (productFilter !== 'all') {
      builder = builder.and().string('productId').eq(productFilter)
    }

    if (statusFilter !== 'all') {
      builder = builder.and().string('status').eq(statusFilter)
    }

    const compiled = builder.build()

    
return compiled === '' ? undefined : compiled
  }, [debouncedKeyword, productFilter, statusFilter])

  const clonesQuery = useGetApiV1AccountSalesAccountClones({ 
    page, 
    pageSize: PAGE_SIZE, 
    sort: '-createdAt',
    filter
  })

  const clones = useMemo(() => clonesQuery.data?.result?.items ?? [], [clonesQuery.data?.result?.items])
  const totalClones = clonesQuery.data?.result?.total ?? 0
  const totalPages = Math.max(1, clonesQuery.data?.result?.totalPages ?? 1)

  const createCloneMutation = usePostApiV1AccountSalesAccountClones({
    mutation: {
      onSuccess: response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create account clone')

          return
        }

        if (response.result) {
          setSelectedClone(response.result)
          void clonesQuery.refetch()
        }

        setForm({
          ...defaultCloneForm,
          productId: form.productId
        })
        setShowCreatePassword(false)
        setShowCreateSecret(false)
        setGithubProfile(null)
      }
    }
  })

  const updateCloneStatusMutation = usePutApiV1AccountSalesAccountClonesAccountCloneIdStatus({
    mutation: {
      onSuccess: response => {
        if (!response.success || !response.result) {
          toast.error(response.errors?.[0]?.message || 'Failed to update account clone status')

          return
        }

        toast.success('Account clone status updated')
        setSelectedClone(response.result)
        setEditTarget(response.result)
        setTargetStatus(response.result.status || 'Init')
        void clonesQuery.refetch()
      }
    }
  })

  const updateCloneMutation = useMutation({
    mutationFn: async (payload: { accountCloneId: string; data: CreateAccountCloneRequest }) => {
      return customFetch<AccountCloneDtoApiResponse>(`/api/v1/account-sales/account-clones/${payload.accountCloneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload.data)
      })
    },
    onSuccess: async response => {
      if (!response.success || !response.result) {
        toast.error(response.errors?.[0]?.message || 'Failed to update account clone')

        return
      }

      toast.success('Account clone updated')
      setOpenEdit(false)
      setEditTarget(null)
      setEditForm(defaultCloneForm)
      setSelectedClone(response.result)
      await clonesQuery.refetch()
    },
    onError: error => {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to update account clone')
      } else {
        const apiError = error as ApiErrorResponse

        toast.error(apiError.errors?.[0]?.message || 'Failed to update account clone')
      }
    }
  })

  const fetchGithubProfile = async () => {
    const username = githubUsernameInput.trim()

    if (!username) {
      return
    }

    setIsGithubLoading(true)

    try {
      const response = await getApiV1AccountSalesWarrantyGithubUsersUsername(encodeURIComponent(username))

      if (!response.success || !response.result) {
        toast.error(response.errors?.[0]?.message || 'Failed to fetch GitHub profile')
        setGithubProfile(null)
        setForm(prev => ({ ...prev, externalAccountId: '' }))

        return
      }

      setGithubProfile(response.result)
      setForm(prev => ({
        ...prev,
        externalAccountId: String(response.result?.id || '')
      }))
      setOpenGithubModal(false)
      setGithubUsernameInput('')
    } catch (error: unknown) {
      setGithubProfile(null)
      setForm(prev => ({ ...prev, externalAccountId: '' }))

      if (error instanceof Error) {
        toast.error(error.message || 'Failed to fetch GitHub profile')
      } else {
        const apiError = error as ApiErrorResponse

        toast.error(apiError.errors?.[0]?.message || 'Failed to fetch GitHub profile')
      }
    } finally {
      setIsGithubLoading(false)
    }
  }

  const fetchGithubProfileForEdit = async () => {
    const username = editGithubUsernameInput.trim()

    if (!username) {
      return
    }

    setIsEditGithubLoading(true)

    try {
      const response = await getApiV1AccountSalesWarrantyGithubUsersUsername(encodeURIComponent(username))

      if (!response.success || !response.result) {
        toast.error(response.errors?.[0]?.message || 'Failed to fetch GitHub profile')
        setEditGithubProfile(null)
        setEditForm(prev => ({ ...prev, externalAccountId: '' }))

        return
      }

      setEditGithubProfile(response.result)
      setEditForm(prev => ({
        ...prev,
        externalAccountId: String(response.result?.id || '')
      }))
      setOpenEditGithubModal(false)
      setEditGithubUsernameInput('')
    } catch (error: unknown) {
      setEditGithubProfile(null)
      setEditForm(prev => ({ ...prev, externalAccountId: '' }))

      if (error instanceof Error) {
        toast.error(error.message || 'Failed to fetch GitHub profile')
      } else {
        const apiError = error as ApiErrorResponse

        toast.error(apiError.errors?.[0]?.message || 'Failed to fetch GitHub profile')
      }
    } finally {
      setIsEditGithubLoading(false)
    }
  }

  const availableStatuses = useMemo(() => Object.values(AccountCloneStatus).sort(), [])

  const otpView = useMemo(() => {
    const secret = selectedClone?.twoFaSecret?.replace(/\s+/g, '')

    if (!secret) {
      return { code: '-', remainingSeconds: OTP_STEP_SECONDS, valid: false }
    }

    const epochSeconds = Math.floor(nowEpochMs / 1000)
    const remainingSeconds = OTP_STEP_SECONDS - (epochSeconds % OTP_STEP_SECONDS)

    try {
      const code = generateSync({
        secret,
        period: OTP_STEP_SECONDS,
        epoch: epochSeconds,
        guardrails: OTP_GUARDRAILS
      })

      return { code, remainingSeconds, valid: true }
    } catch {
      return { code: 'Invalid secret', remainingSeconds, valid: false }
    }
  }, [nowEpochMs, selectedClone?.twoFaSecret])

  const otpauthUri = useMemo(() => {
    const secret = selectedClone?.twoFaSecret?.replace(/\s+/g, '')

    if (!secret || !otpView.valid) return null

    const issuer = selectedClone?.product?.name || 'Alfred'
    const account = selectedClone?.username || 'account'

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  }, [selectedClone?.twoFaSecret, selectedClone?.product?.name, selectedClone?.username, otpView.valid])

  const clonesApiErrorMessage = useMemo(() => {
    const error = clonesQuery.error || productsQuery.error

    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    const apiError = error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Unable to load clone inventory from API.'
  }, [clonesQuery.error, productsQuery.error])

  useEffect(() => {
    if (clonesQuery.isError || productsQuery.isError) {
      toast.error(clonesApiErrorMessage || 'Unable to load clone inventory from API.')
    }
  }, [clonesQuery.isError, productsQuery.isError, clonesApiErrorMessage])

  const handleCopy = (text?: string | null) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleUpdateStatus = async () => {
    if (!editTarget?.id) {
      return
    }

    const payload: UpdateAccountCloneStatusRequest = {
      status: targetStatus
    }

    await updateCloneStatusMutation.mutateAsync({
      accountCloneId: editTarget.id,
      data: payload
    })
  }

  const handleOpenEdit = (clone: AccountCloneDto) => {
    setEditTarget(clone)
    setTargetStatus(clone.status || 'Init')
    setEditGithubProfile(null)
    setEditGithubUsernameInput('')
    setEditForm({
      productId: clone.product?.id || '',
      username: clone.username || '',
      externalAccountId: clone.externalAccountId || '',
      password: clone.password || '',
      twoFaSecret: clone.twoFaSecret || '',
      extraInfo: clone.extraInfo || ''
    })
    setOpenEdit(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant='h4' fontWeight={800}>Account Clones</Typography>
            <Typography variant='body2' color='text.secondary'>Manage account clone inventory. Only <strong>Verified</strong> clones can be sold.</Typography>
          </Box>
          <Stack direction='row' spacing={1}>
            <Chip label={`Products ${products.length}`} color='primary' variant='outlined' />
            <Chip label={`Inventory ${totalClones}`} color='info' variant='outlined' />
            <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setOpenCreate(true)}>
              Create Clone
            </Button>
          </Stack>
        </Box>
      </Card>

      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant='h6' fontWeight={700}>Clone Inventory</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mt: 1.8 }}>
          <TextField
            size='small'
            label='Search username/external id'
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size='small'
            label='Product'
            value={productFilter}
            onChange={event => setProductFilter(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value='all'>All products</MenuItem>
            {products.map(product => (
              <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size='small'
            label='Status'
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value='all'>All status</MenuItem>
            {availableStatuses.map(status => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <TableContainer sx={{ mt: 2 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>External ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verified At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clones.map(clone => {

                return (
                  <TableRow key={clone.id} hover>
                    <TableCell>{clone.username}</TableCell>
                    <TableCell>{clone.externalAccountId || '-'}</TableCell>
                    <TableCell>{formatRelativeTime(clone.verifiedAt, nowEpochMs)}</TableCell>
                    <TableCell>
                      <Chip size='small' color={STATUS_COLOR[clone.status ?? ''] ?? 'default'} label={clone.status || 'Unknown'} />
                    </TableCell>
                    <TableCell>{formatRelativeTime(clone.createdAt, nowEpochMs)}</TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={1}>
                        <Button size='small' variant='outlined' onClick={() => setSelectedClone(clone)}>
                          View
                        </Button>
                        <Button size='small' variant='contained' onClick={() => handleOpenEdit(clone)}>
                          Edit
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {clones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 1.2 }}>
                      No clone matched your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mt: 1.8 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing {clones.length} of {totalClones} clones
          </Typography>
          <Pagination
            size='small'
            page={page}
            count={totalPages}
            onChange={(_, value) => setPage(value)}
          />
        </Stack>
      </Card>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth='sm'>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component='span' variant='h5' fontWeight={700} sx={{ display: 'block' }}>
            Create Account Clone
          </Typography>
          <Typography component='span' variant='body2' color='text.secondary' sx={{ display: 'block' }}>
            Add new clone to stock. Move it through Init → Pending → Verified before selling.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.5px', mb: 2 }}>
                Product Settings
              </Typography>
              <TextField
                select
                fullWidth
                label='Product'
                value={form.productId || ''}
                onChange={event => {
                  const productId = event.target.value

                  setForm(prev => ({ ...prev, productId, externalAccountId: '' }))
                  setGithubProfile(null)
                  setGithubUsernameInput('')
                }}
                helperText={products.length === 0 ? 'No product available. Please create product first.' : undefined}
              >
                {products.map(product => (
                  <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.5px', mb: 2 }}>
                Account Credentials
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2.5, sm: 3 } }}>
                <TextField
                  label='Username'
                  value={form.username || ''}
                  onChange={event => setForm(prev => ({ ...prev, username: event.target.value }))}
                  helperText={isGithubProduct ? 'Independent from GitHub username.' : undefined}
                  fullWidth
                />
                <TextField
                  label='External Account ID'
                  required
                  value={form.externalAccountId || ''}
                  onChange={event => setForm(prev => ({ ...prev, externalAccountId: event.target.value }))}
                  disabled={isGithubProduct}
                  helperText={isGithubProduct ? 'Auto-filled from GitHub Profile.' : 'Stable external identifier'}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: isGithubProduct ? (
                        <InputAdornment position='end'>
                          <Button 
                            size='small' 
                            variant='outlined' 
                            color='secondary'
                            onClick={() => setOpenGithubModal(true)}
                            sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.25 }}
                          >
                            <i className='tabler-brand-github' style={{ marginRight: 6, fontSize: 16 }} />
                            Fetch
                          </Button>
                        </InputAdornment>
                      ) : undefined
                    }
                  }}
                />

                {isGithubProduct && !githubProfile && (
                  <Alert severity='warning' sx={{ gridColumn: '1 / -1' }}>You must fetch GitHub profile before creating a GitHub clone.</Alert>
                )}
                {isGithubProduct && githubProfile && (
                  <Alert severity='info' icon={<i className='tabler-brand-github' style={{ fontSize: 24 }} />} sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="subtitle2" fontWeight={700}>{githubProfile.login}</Typography>
                    <Typography variant="body2">ID: {githubProfile.id} &bull; Followers: {githubProfile.followers} &bull; Repos: {githubProfile.publicRepos}</Typography>
                  </Alert>
                )}

                <TextField
                  label='Password'
                  type={showCreatePassword ? 'text' : 'password'}
                  value={form.password || ''}
                  onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton edge='end' onClick={() => setShowCreatePassword(prev => !prev)}>
                            <i className={showCreatePassword ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <TextField
                  label='2FA Secret (optional)'
                  type={showCreateSecret ? 'text' : 'password'}
                  value={form.twoFaSecret || ''}
                  onChange={event => setForm(prev => ({ ...prev, twoFaSecret: event.target.value }))}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton edge='end' onClick={() => setShowCreateSecret(prev => !prev)}>
                            <i className={showCreateSecret ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <TextField
                  label='Extra Info (optional)'
                  multiline
                  minRows={3}
                  value={form.extraInfo || ''}
                  onChange={event => setForm(prev => ({ ...prev, extraInfo: event.target.value }))}
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={
              !form.productId ||
              !form.username ||
              !form.password ||
              !form.externalAccountId ||
              (isGithubProduct && !githubProfile) ||
              createCloneMutation.isPending
            }
            onClick={async () => {
              const result = await createCloneMutation.mutateAsync({ data: form })

              if (result.success) {
                setOpenCreate(false)
              }
            }}
          >
            Create Clone
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEdit}
        onClose={() => {
          setOpenEdit(false)
          setEditTarget(null)
          setEditGithubProfile(null)
          setEditGithubUsernameInput('')
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component='span' variant='h5' fontWeight={700} sx={{ display: 'block' }}>
            Edit Account Clone
          </Typography>
          <Typography component='span' variant='body2' color='text.secondary' sx={{ display: 'block' }}>
            Update clone credentials and manage its current status workflow.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 3 }}>
          <Stack spacing={4}>
            {/* Status Workflow Section */}
            <Card variant='outlined' sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), borderColor: 'primary.light' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant='subtitle2' fontWeight={700} color='primary.main'>Status Workflow</Typography>
                {!canManualStatusUpdate(editTarget?.status) && (
                  <Chip size='small' label='System Controlled' sx={{ bgcolor: 'background.paper' }} />
                )}
              </Box>

              {/* Flow indicator */}
              <Stack direction='row' alignItems='center' spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                {([
                  { label: 'Init', color: 'default' },
                  { label: '→', color: null },
                  { label: 'Pending', color: 'warning' },
                  { label: '→', color: null },
                  { label: 'Verified ✓', color: 'success' },
                  { label: '/', color: null },
                  { label: 'Reject', color: 'error' }
                ] as const).map((item, i) =>
                  item.color === null
                    ? <Typography key={i} variant='caption' color='text.secondary'>{item.label}</Typography>
                    : <Chip key={i} size='small' label={item.label} color={item.color as 'default' | 'warning' | 'success' | 'error'} variant={editTarget?.status === item.label.replace(' ✓', '') ? 'filled' : 'outlined'} />
                )}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  select
                  size='medium'
                  label='Move to status'
                  value={targetStatus}
                  onChange={event => setTargetStatus(event.target.value as AccountCloneStatus)}
                  sx={{ flexGrow: 1 }}
                  disabled={!canManualStatusUpdate(editTarget?.status)}
                >
                  {MANUAL_STATUS_OPTIONS.map(status => (
                    <MenuItem key={status} value={status} disabled={status === editTarget?.status}>
                      <Stack direction='row' alignItems='center' spacing={1}>
                        <Box component='span' sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLOR[status] === 'default' ? 'text.disabled' : `${STATUS_COLOR[status]}.main`, display: 'inline-block', flexShrink: 0 }} />
                        <span>{status}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant='contained'
                  size='large'
                  startIcon={updateCloneStatusMutation.isPending ? <i className='tabler-loader animate-spin' /> : <i className='tabler-arrows-exchange' />}
                  onClick={handleUpdateStatus}
                  disabled={
                    !editTarget?.id ||
                    !canManualStatusUpdate(editTarget?.status) ||
                    updateCloneStatusMutation.isPending ||
                    editTarget?.status === targetStatus
                  }
                  sx={{ height: 53, px: 3 }}
                >
                  Apply
                </Button>
              </Stack>
              {!canManualStatusUpdate(editTarget?.status) && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                  Special statuses (Sold, InWarranty, Die) are controlled by system flows and cannot be changed manually.
                </Typography>
              )}
              {canManualStatusUpdate(editTarget?.status) && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                  Flow: Init → Pending (submit for ~3-day review) → Verified (can sell) or Reject. Rejected clones can go back to Pending or reset to Init.
                </Typography>
              )}
            </Card>

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.5px', mb: 2 }}>
                Account Credentials
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2.5, sm: 3 } }}>
                <TextField 
                  label='Username' 
                  value={editForm.username || ''} 
                  onChange={event => setEditForm(prev => ({ ...prev, username: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label='External Account ID'
                  value={editForm.externalAccountId || ''}
                  onChange={event => setEditForm(prev => ({ ...prev, externalAccountId: event.target.value }))}
                  disabled={isEditGithubProduct}
                  helperText={isEditGithubProduct ? 'Auto-filled from GitHub Profile.' : undefined}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: isEditGithubProduct ? (
                        <InputAdornment position='end'>
                          <Button 
                            size='small' 
                            variant='outlined'
                            color='secondary' 
                            onClick={() => setOpenEditGithubModal(true)}
                            sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.25 }}
                          >
                            <i className='tabler-brand-github' style={{ marginRight: 6, fontSize: 16 }} />
                            Fetch
                          </Button>
                        </InputAdornment>
                      ) : undefined
                    }
                  }}
                />

                {isEditGithubProduct && editGithubProfile && (
                  <Alert severity='info' icon={<i className='tabler-brand-github' style={{ fontSize: 24 }} />} sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="subtitle2" fontWeight={700}>{editGithubProfile.login}</Typography>
                    <Typography variant="body2">ID: {editGithubProfile.id} &bull; Followers: {editGithubProfile.followers} &bull; Repos: {editGithubProfile.publicRepos}</Typography>
                  </Alert>
                )}

                <TextField
                  label='Password'
                  type='password'
                  value={editForm.password || ''}
                  onChange={event => setEditForm(prev => ({ ...prev, password: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label='2FA Secret (optional)'
                  value={editForm.twoFaSecret || ''}
                  onChange={event => setEditForm(prev => ({ ...prev, twoFaSecret: event.target.value }))}
                  fullWidth
                />

                <TextField
                  label='Extra Info (optional)'
                  multiline
                  minRows={3}
                  value={editForm.extraInfo || ''}
                  onChange={event => setEditForm(prev => ({ ...prev, extraInfo: event.target.value }))}
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button
            onClick={() => {
              setOpenEdit(false)
              setEditTarget(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={!editTarget?.id || !editForm.username || !editForm.password || !editForm.externalAccountId || updateCloneMutation.isPending}
            onClick={async () => {
              if (!editTarget?.id) {
                return
              }

              await updateCloneMutation.mutateAsync({
                accountCloneId: editTarget.id,
                data: {
                  username: editForm.username,
                  externalAccountId: editForm.externalAccountId,
                  password: editForm.password,
                  twoFaSecret: editForm.twoFaSecret,
                  extraInfo: editForm.extraInfo
                }
              })
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditGithubModal} onClose={() => setOpenEditGithubModal(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Fetch GitHub Profile (Edit)</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: 2, pb: 1 }}>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Enter the GitHub Username to refresh the External Account ID for this clone.
          </Typography>
          <TextField
            fullWidth
            label='GitHub Username'
            value={editGithubUsernameInput}
            onChange={e => setEditGithubUsernameInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenEditGithubModal(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={fetchGithubProfileForEdit}
            disabled={!editGithubUsernameInput.trim() || isEditGithubLoading}
          >
            {isEditGithubLoading ? 'Fetching...' : 'Fetch'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openGithubModal} onClose={() => setOpenGithubModal(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Fetch GitHub Profile</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: 2, pb: 1 }}>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Enter the GitHub Username to fetch the External ID (it will be auto-filled into the External Account ID field).
          </Typography>
          <TextField
            fullWidth
            label='GitHub Username'
            value={githubUsernameInput}
            onChange={e => setGithubUsernameInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenGithubModal(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={fetchGithubProfile}
            disabled={!githubUsernameInput.trim() || isGithubLoading}
          >
            {isGithubLoading ? 'Fetching...' : 'Fetch'}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor='right'
        open={!!selectedClone}
        onClose={() => {
          setSelectedClone(null)
          setShowViewPassword(false)
          setShowViewSecret(false)
        }}
      >
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant='h6' fontWeight={800}>Quick View</Typography>
          <Typography variant='body2' color='text.secondary'>Clone detail snapshot for fast support and verification.</Typography>

          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>Username</Typography>
              <IconButton size='small' onClick={() => handleCopy(selectedClone?.username)}>
                <i className='tabler-copy' style={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Typography variant='body1' fontWeight={700}>{selectedClone?.username || '-'}</Typography>
          </Card>
          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>Password</Typography>
              <Stack direction='row' spacing={0.5}>
                <Button size='small' variant='text' onClick={() => setShowViewPassword(prev => !prev)}>
                  {showViewPassword ? 'Hide' : 'Show'}
                </Button>
                <IconButton size='small' onClick={() => handleCopy(selectedClone?.password)}>
                  <i className='tabler-copy' style={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            </Box>
            <Typography variant='body1' fontWeight={700}>
              {showViewPassword ? (selectedClone?.password || '-') : maskSensitiveValue(selectedClone?.password)}
            </Typography>
          </Card>
          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Typography variant='caption' color='text.secondary'>Product</Typography>
            <Typography variant='body1' fontWeight={700}>{selectedClone?.product?.name || '-'}</Typography>
          </Card>
          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>2FA Secret</Typography>
              <Stack direction='row' spacing={0.5}>
                <Button size='small' variant='text' onClick={() => setShowViewSecret(prev => !prev)}>
                  {showViewSecret ? 'Hide' : 'Show'}
                </Button>
                <IconButton size='small' onClick={() => handleCopy(selectedClone?.twoFaSecret)}>
                  <i className='tabler-copy' style={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            </Box>
            <Typography variant='body1' fontWeight={700}>
              {showViewSecret ? (selectedClone?.twoFaSecret || '-') : maskSensitiveValue(selectedClone?.twoFaSecret)}
            </Typography>
          </Card>
          <Card
            variant='outlined'
            sx={{
              p: 1.5,
              borderColor: otpView.valid ? 'success.main' : 'divider',
              backgroundColor: otpView.valid ? 'success.50' : 'transparent'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Typography variant='caption' color='text.secondary'>Live OTP (from secret)</Typography>
              {otpView.valid && (
                <IconButton size='small' onClick={() => handleCopy(otpView.code)}>
                  <i className='tabler-copy' style={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
            <Typography
              variant='h4'
              fontWeight={800}
              fontFamily='monospace'
              sx={{ letterSpacing: '0.15em', mb: 0.25 }}
            >
              {otpView.code.length === 6
                ? `${otpView.code.slice(0, 3)} ${otpView.code.slice(3)}`
                : otpView.code}
            </Typography>
            <Typography variant='caption' color='text.secondary'>Refresh in {otpView.remainingSeconds}s</Typography>
            {otpauthUri && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, display: 'inline-flex' }}>
                  <QRCodeSVG value={otpauthUri} size={160} />
                </Box>
                <Typography variant='caption' color='text.secondary' textAlign='center'>
                  Scan with Apple Passwords or Microsoft Authenticator
                </Typography>
              </Box>
            )}
          </Card>
          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Typography variant='caption' color='text.secondary'>External Account ID</Typography>
            <Typography variant='body1' fontWeight={700}>{selectedClone?.externalAccountId || '-'}</Typography>
          </Card>
          <Card variant='outlined' sx={{ p: 1.5 }}>
            <Typography variant='caption' color='text.secondary'>Extra Info</Typography>
            <Typography variant='body1' fontWeight={700}>{selectedClone?.extraInfo || '-'}</Typography>
          </Card>

          <Box sx={{ pt: 1 }}>
            <Button
              variant='outlined'
              onClick={() => {
                setSelectedClone(null)
                setShowViewPassword(false)
                setShowViewSecret(false)
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}

export default AccountSalesClones
