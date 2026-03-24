'use client'

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  AccountProductType,
  getApiV1AccountSalesWarrantyGithubUsersUsername,
  usePutApiV1AccountSalesAccountClonesAccountCloneIdStatus
} from '@/generated/core-api'
import type {
  AccountCloneDto,
  AccountCloneDtoApiResponse,
  AccountCloneStatus,
  ApiErrorResponse,
  CreateAccountCloneRequest,
  ProductDto,
  SourceAccountDto
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

const MANUAL_STATUS_OPTIONS: AccountCloneStatus[] = ['Init', 'Pending', 'Verified', 'RejectVerified']

const canManualStatusUpdate = (status?: AccountCloneStatus | null) => {
  if (!status) return false
  
  return MANUAL_STATUS_OPTIONS.includes(status)
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editTarget: AccountCloneDto | null
  products: ProductDto[]
  sourceAccounts: SourceAccountDto[]
}

export const AccountCloneEditModal = ({ open, onClose, onSuccess, editTarget, products, sourceAccounts }: Props) => {
  const theme = useTheme()
  const [form, setForm] = useState<CreateAccountCloneRequest>(defaultCloneForm)
  const [targetStatus, setTargetStatus] = useState<AccountCloneStatus>('Init')

  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [openGithubModal, setOpenGithubModal] = useState(false)
  const [githubUsernameInput, setGithubUsernameInput] = useState('')

  const selectedProduct = useMemo(() => products.find(p => p.id === form.productId), [form.productId, products])
  const isGithubProduct = selectedProduct?.productType === AccountProductType.Github

  useEffect(() => {
    if (open && editTarget) {
      setTargetStatus(editTarget.status || 'Init')
      setGithubUsernameInput('')
      setForm({
        productId: editTarget.product?.id || '',
        username: editTarget.username || '',
        externalAccountId: editTarget.externalAccountId || '',
        password: editTarget.password || '',
        twoFaSecret: editTarget.twoFaSecret || '',
        extraInfo: editTarget.extraInfo || '',
        sourceAccountId: editTarget.sourceAccount?.id ?? null
      })
    }
  }, [open, editTarget])

  const updateCloneStatusMutation = usePutApiV1AccountSalesAccountClonesAccountCloneIdStatus({
    mutation: {
      onSuccess: response => {
        if (!response.success || !response.result) {
          toast.error(response.errors?.[0]?.message || 'Failed to update account clone status')
          
          return
        }

        toast.success('Account clone status updated')
        onSuccess()
      }
    }
  })

  const updateCloneMutation = useMutation({
    mutationFn: async (payload: { accountCloneId: string; data: CreateAccountCloneRequest }) => {
      return customFetch<AccountCloneDtoApiResponse>(`/api/v1/account-sales/account-clones/${payload.accountCloneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data)
      })
    },
    onSuccess: async response => {
      if (!response.success || !response.result) {
        toast.error(response.errors?.[0]?.message || 'Failed to update account clone')
        
        return
      }

      toast.success('Account clone updated')
      onSuccess()
      handleClose()
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

  const handleUpdateStatus = async () => {
    if (!editTarget?.id) return

    await updateCloneStatusMutation.mutateAsync({
      accountCloneId: editTarget.id,
      data: { status: targetStatus }
    })
  }

  const fetchGithubProfile = async () => {
    const username = githubUsernameInput.trim()

    if (!username) return

    setIsGithubLoading(true)

    try {
      const response = await getApiV1AccountSalesWarrantyGithubUsersUsername(encodeURIComponent(username))

      if (!response.success || !response.result) {
        toast.error(response.errors?.[0]?.message || 'Failed to fetch GitHub profile')
        setForm(prev => ({ ...prev, externalAccountId: '' }))
        
        return
      }

      setForm(prev => ({
        ...prev,
        externalAccountId: String(response.result?.id || '')
      }))
      setOpenGithubModal(false)
      setGithubUsernameInput('')
    } catch (error: unknown) {
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

  const handleClose = () => {
    setForm(defaultCloneForm)
    onClose()
  }

  const flowSteps = [
    { label: 'Init', id: 'Init', icon: 'tabler-check' },
    { label: 'Pending', id: 'Pending', icon: 'tabler-dots' },
    { label: 'Verified', id: 'Verified', icon: 'tabler-check' },
    { label: 'Reject', id: 'RejectVerified', icon: 'tabler-slash' }
  ]

  const currentStatusIndex = flowSteps.findIndex(s => s.id === (editTarget?.status === 'RejectVerified' ? 'RejectVerified' : editTarget?.status === 'Verified' ? 'Verified' : editTarget?.status === 'Pending' ? 'Pending' : 'Init'))

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        fullWidth 
        maxWidth='sm'
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 3.5, px: { xs: 2.5, sm: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography component='span' variant='h5' fontWeight={700} sx={{ display: 'block' }}>
              Edit Account Clone
            </Typography>
            <Typography component='span' variant='caption' sx={{ display: 'block', mt: 0.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              INSTANCE ID: {editTarget?.externalAccountId || editTarget?.id?.substring(0, 10) || 'UNKNOWN'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2.5, sm: 4 }, pt: 2, pb: 4, borderColor: 'divider' }}>
          <Stack spacing={4}>
            
            {/* Status Workflow Indicator */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='caption' fontWeight={700} sx={{ color: 'text.secondary', letterSpacing: '1px' }}>STATUS WORKFLOW</Typography>
                
                {canManualStatusUpdate(editTarget?.status) ? (
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <TextField
                      select
                      size='small'
                      label='Status'
                      value={targetStatus}
                      onChange={e => setTargetStatus(e.target.value as AccountCloneStatus)}
                      sx={{ minWidth: 120 }}
                    >
                      {MANUAL_STATUS_OPTIONS.map(status => (
                        <MenuItem key={status} value={status}>{status === 'RejectVerified' ? 'Reject' : status}</MenuItem>
                      ))}
                    </TextField>
                    {targetStatus !== editTarget?.status && (
                      <Button
                        variant='contained'
                        size='small'
                        onClick={handleUpdateStatus}
                        disabled={updateCloneStatusMutation.isPending}
                        sx={{ minWidth: 0, px: 2, py: 1, borderRadius: 2 }}
                      >
                        {updateCloneStatusMutation.isPending ? <i className='tabler-loader animate-spin' /> : 'Apply'}
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Chip size='small' label='System Controlled' variant='outlined' />
                )}
              </Box>

              <Box sx={{ position: 'relative', pt: 1, pb: 2, px: 2 }}>
                <Box sx={{ position: 'absolute', top: 20, left: 32, right: 32, height: 2, bgcolor: 'divider', zIndex: 0 }} />
                <Box sx={{ position: 'absolute', top: 20, left: 32, right: 32, height: 2, bgcolor: 'primary.main', zIndex: 1, width: `${(Math.max(0, currentStatusIndex) / 3) * 100}%`, transition: 'width 0.4s ease' }} />
                
                <Stack direction='row' justifyContent='space-between' sx={{ position: 'relative', zIndex: 2 }}>
                  {flowSteps.map((step, idx) => {
                    const isActive = idx <= currentStatusIndex
                    const isCurrent = idx === currentStatusIndex

                    return (
                      <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48 }}>
                        <Box sx={{ 
                          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: isActive ? 'primary.main' : 'background.paper',
                          border: '2px solid',
                          borderColor: isActive ? 'primary.main' : 'divider',
                          color: '#fff',
                          boxShadow: isActive ? `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}` : 'none',
                          mb: 1
                        }}>
                          {isActive ? <i className={step.icon} style={{ fontSize: 14 }} /> : <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'divider' }} />}
                        </Box>
                        <Typography variant='caption' sx={{ fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'text.primary' : 'text.secondary', textTransform: 'uppercase' }}>
                          {step.label}
                        </Typography>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Box>

            {/* Form Fields */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2.5, rowGap: 3 }}>
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>Source Account</Typography>
                <TextField
                  select
                  fullWidth
                  value={form.sourceAccountId ?? ''}
                  onChange={event => setForm(prev => ({ ...prev, sourceAccountId: event.target.value || null }))}
                >
                  <MenuItem value=''>— None —</MenuItem>
                  {sourceAccounts.map(sa => (
                    <MenuItem key={sa.id} value={sa.id}>[{sa.accountType}] {sa.username}</MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>Username</Typography>
                <TextField 
                  value={form.username || ''} 
                  onChange={event => setForm(prev => ({ ...prev, username: event.target.value }))}
                  fullWidth
                />
              </Box>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>External Account ID</Typography>
                <TextField
                  value={form.externalAccountId || ''}
                  onChange={event => setForm(prev => ({ ...prev, externalAccountId: event.target.value }))}
                  disabled={isGithubProduct}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: isGithubProduct ? (
                        <InputAdornment position='end'>
                          <Button 
                            size='small' 
                            color='primary'
                            onClick={() => setOpenGithubModal(true)}
                            sx={{ textTransform: 'none' }}
                          >
                            <i className='tabler-refresh' style={{ marginRight: 6, fontSize: 16 }} />
                            FETCH
                          </Button>
                        </InputAdornment>
                      ) : undefined
                    }
                  }}
                />
              </Box>

              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>Password</Typography>
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  value={form.password || ''}
                  onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton edge='end' onClick={() => setShowPassword(prev => !prev)}>
                            <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Box>

              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>2FA Secret Key</Typography>
                <TextField
                  type={showSecret ? 'text' : 'password'}
                  value={form.twoFaSecret || ''}
                  onChange={event => setForm(prev => ({ ...prev, twoFaSecret: event.target.value }))}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton edge='end' onClick={() => setShowSecret(prev => !prev)}>
                            <i className={showSecret ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Box>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>Extra Information</Typography>
                <TextField
                  multiline
                  minRows={2}
                  value={form.extraInfo || ''}
                  onChange={event => setForm(prev => ({ ...prev, extraInfo: event.target.value }))}
                  fullWidth
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 3, justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            onClick={handleClose} 
            color='inherit'
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={!editTarget?.id || !form.username || !form.password || !form.externalAccountId || updateCloneMutation.isPending}
            onClick={async () => {
              if (!editTarget?.id) return
              await updateCloneMutation.mutateAsync({
                accountCloneId: editTarget.id,
                data: {
                  productId: form.productId,
                  username: form.username,
                  externalAccountId: form.externalAccountId,
                  password: form.password,
                  twoFaSecret: form.twoFaSecret,
                  extraInfo: form.extraInfo,
                  sourceAccountId: form.sourceAccountId
                }
              })
            }}
            startIcon={updateCloneMutation.isPending ? <i className='tabler-loader animate-spin' /> : <i className='tabler-device-floppy' />}
            color='primary'
            sx={{ px: 3 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openGithubModal} onClose={() => setOpenGithubModal(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Fetch GitHub Profile</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: 2, pb: 1 }}>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Enter the GitHub Username to refresh the External Account ID for this clone.
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
    </>
  )
}
