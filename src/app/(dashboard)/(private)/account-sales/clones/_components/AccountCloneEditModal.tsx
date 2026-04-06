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
import { toast } from 'react-toastify'

import {
  AccountProductType,
  getApiV1AccountSalesWarrantyGithubUsersUsername,
  usePatchApiV1AccountSalesAccountClonesAccountCloneIdStatus,
  usePatchApiV1AccountSalesAccountClonesAccountCloneId
} from '@/generated/core-api'
import type {
  AccountCloneDto,
  AccountCloneStatus,
  ApiErrorResponse,
  CreateAccountCloneRequest,
  UpdateAccountCloneRequest,
  ProductDto,
  SourceAccountDto
} from '@/generated/core-api'
import { getChangedFields } from '@/utils/getChangedFields'

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

  const updateCloneStatusMutation = usePatchApiV1AccountSalesAccountClonesAccountCloneIdStatus({
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

  const updateCloneMutation = usePatchApiV1AccountSalesAccountClonesAccountCloneId({
    mutation: {
      onSuccess: async response => {
        if (!response.success || !response.result) {
          toast.error(response.errors?.[0]?.message || 'Failed to update account clone')

          return
        }

        toast.success('Account clone updated')
        onSuccess()
        handleClose()
      }
    }
  })

  const handleUpdateStatus = async (newStatus: AccountCloneStatus) => {
    if (!editTarget?.id) return

    setTargetStatus(newStatus)
    await updateCloneStatusMutation.mutateAsync({
      accountCloneId: editTarget.id,
      data: { status: newStatus }
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

  const flowSteps: { label: string; id: AccountCloneStatus; icon: string }[] = [
    { label: 'Init', id: 'Init', icon: 'tabler-arrow-right' },
    { label: 'Pending', id: 'Pending', icon: 'tabler-hourglass' },
    { label: 'Verified', id: 'Verified', icon: 'tabler-check' },
    { label: 'Reject', id: 'RejectVerified', icon: 'tabler-x' }
  ]

  const currentStatusIndex = flowSteps.findIndex(s => s.id === targetStatus)

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
        <DialogTitle
          sx={{
            pb: 1,
            pt: 3.5,
            px: { xs: 2.5, sm: 4 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Box>
            <Typography component='span' variant='h5' fontWeight={700} sx={{ display: 'block' }}>
              Edit Account Clone
            </Typography>
            <Typography
              component='span'
              variant='caption'
              sx={{
                display: 'block',
                mt: 0.5,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
              }}
            >
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
                <Typography variant='caption' fontWeight={700} sx={{ color: 'text.secondary', letterSpacing: '1px' }}>
                  STATUS WORKFLOW
                </Typography>

                <Chip
                  size='small'
                  label={targetStatus === 'RejectVerified' ? 'REJECTED' : `${targetStatus.toUpperCase()} STATE`}
                  sx={{
                    bgcolor:
                      targetStatus === 'Verified'
                        ? alpha(theme.palette.success.main, 0.15)
                        : targetStatus === 'RejectVerified'
                          ? alpha(theme.palette.error.main, 0.15)
                          : alpha(theme.palette.primary.main, 0.15),
                    color:
                      targetStatus === 'Verified'
                        ? 'success.main'
                        : targetStatus === 'RejectVerified'
                          ? 'error.main'
                          : 'primary.main',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 1,
                    letterSpacing: '0.5px'
                  }}
                  icon={
                    targetStatus === 'Verified' ? (
                      <i className='tabler-check' style={{ fontSize: 14 }} />
                    ) : targetStatus === 'RejectVerified' ? (
                      <i className='tabler-x' style={{ fontSize: 14 }} />
                    ) : (
                      <i className='tabler-circle-check' style={{ fontSize: 14 }} />
                    )
                  }
                />
              </Box>

              <Box sx={{ position: 'relative', pt: 1, pb: 2, px: 2 }}>
                <style>{`
                  @keyframes pulseNextStep {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); border-color: rgba(99, 102, 241, 0.8); }
                    70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); border-color: rgba(99, 102, 241, 0.3); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); border-color: rgba(99, 102, 241, 0.3); }
                  }
                `}</style>
                <Box
                  sx={{ position: 'absolute', top: 20, left: 32, right: 32, height: 2, bgcolor: 'divider', zIndex: 0 }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: 32,
                    right: 32,
                    height: 2,
                    bgcolor: 'primary.main',
                    zIndex: 1,
                    width: `${(Math.max(0, currentStatusIndex) / 3) * 100}%`,
                    transition: 'width 0.4s ease'
                  }}
                />

                <Stack direction='row' justifyContent='space-between' sx={{ position: 'relative', zIndex: 2 }}>
                  {flowSteps.map((step, idx) => {
                    const isActive = idx <= currentStatusIndex
                    const isCurrent = idx === currentStatusIndex

                    // Logic:
                    // Normal flow: Init(0) -> Pending(1) -> Verified(2)
                    // Reject(3): can be triggered from Init(0) or Pending(1)
                    const isNextValidStep =
                      (idx === currentStatusIndex + 1 && idx !== 3) || (idx === 3 && currentStatusIndex < 2)

                    const clickable = canManualStatusUpdate(targetStatus) && isNextValidStep

                    return (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: 48,
                          cursor: clickable ? 'pointer' : 'not-allowed',
                          opacity: isActive || clickable ? 1 : 0.4,
                          transition: 'all 0.3s ease',
                          '&:hover .step-icon': clickable
                            ? {
                                transform: 'scale(1.15)',
                                borderColor: 'primary.main',
                                boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.6)}`
                              }
                            : {}
                        }}
                        onClick={() => {
                          if (clickable && !updateCloneStatusMutation.isPending) {
                            void handleUpdateStatus(step.id)
                          }
                        }}
                      >
                        <Box
                          className='step-icon'
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isActive ? 'primary.main' : '#111827',
                            border: '2px solid',
                            borderColor: isActive ? 'primary.main' : clickable ? '#6366f1' : 'divider',
                            color: isActive ? '#fff' : clickable ? '#818cf8' : 'text.disabled',
                            boxShadow: isActive ? `0 0 12px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                            animation: clickable ? 'pulseNextStep 2s infinite' : 'none',
                            mb: 1.5,
                            transition: 'all 0.3s ease',
                            zIndex: 3
                          }}
                        >
                          <i className={step.icon} style={{ fontSize: 16 }} />
                        </Box>
                        <Typography
                          variant='caption'
                          sx={{
                            fontSize: '0.65rem',
                            fontWeight: isCurrent || clickable ? 700 : 600,
                            color: isActive ? 'text.primary' : clickable ? '#818cf8' : 'text.disabled',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                        >
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
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  Source Account
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={form.sourceAccountId ?? ''}
                  onChange={event => setForm(prev => ({ ...prev, sourceAccountId: event.target.value || null }))}
                >
                  <MenuItem value=''>— None —</MenuItem>
                  {sourceAccounts.map(sa => (
                    <MenuItem key={sa.id} value={sa.id}>
                      [{sa.accountType}] {sa.username}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  Username
                </Typography>
                <TextField
                  value={form.username || ''}
                  onChange={event => setForm(prev => ({ ...prev, username: event.target.value }))}
                  fullWidth
                />
              </Box>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  External Account ID
                </Typography>
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
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  Password
                </Typography>
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
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  2FA Secret Key
                </Typography>
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
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}>
                  Extra Information
                </Typography>
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
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 3,
            mt: { xs: 2, sm: 3 },
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Button
            onClick={handleClose}
            color='inherit'
            sx={{ fontWeight: 600, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            DISCARD
          </Button>
          <Button
            variant='contained'
            disabled={
              !editTarget?.id ||
              !form.username ||
              !form.password ||
              !form.externalAccountId ||
              updateCloneMutation.isPending
            }
            onClick={async () => {
              if (!editTarget?.id) return

              const current: UpdateAccountCloneRequest = {
                externalAccountId: form.externalAccountId,
                username: form.username,
                password: form.password,
                twoFaSecret: form.twoFaSecret ?? undefined,
                extraInfo: form.extraInfo ?? undefined,
                sourceAccountId: form.sourceAccountId
              }

              const original: UpdateAccountCloneRequest = {
                externalAccountId: editTarget.externalAccountId || '',
                username: editTarget.username || '',
                password: editTarget.password || '',
                twoFaSecret: editTarget.twoFaSecret || '',
                extraInfo: editTarget.extraInfo || '',
                sourceAccountId: editTarget.sourceAccount?.id ?? null
              }

              const changes = getChangedFields(original, current)

              if (!changes) {
                toast.info('No changes detected')
                handleClose()

                return
              }

              await updateCloneMutation.mutateAsync({
                accountCloneId: editTarget.id,
                data: changes
              })
            }}
            startIcon={
              updateCloneMutation.isPending ? (
                <i className='tabler-loader animate-spin' />
              ) : (
                <i className='tabler-checks' />
              )
            }
            color='primary'
            sx={{
              px: { xs: 3, sm: 4 },
              py: 1.2,
              borderRadius: 2,
              fontWeight: 700,
              boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.4)}`,
              letterSpacing: '0.5px'
            }}
          >
            Save
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
