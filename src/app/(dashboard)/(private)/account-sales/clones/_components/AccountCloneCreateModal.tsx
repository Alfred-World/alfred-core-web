'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
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
import { toast } from 'react-toastify'

import {
  AccountProductType,
  getApiV1AccountSalesWarrantyGithubUsersUsername,
  usePostApiV1AccountSalesAccountClones
} from '@/generated/core-api'
import type {
  ApiErrorResponse,
  CreateAccountCloneRequest,
  GithubUserProfileDto,
  ProductDto,
  SourceAccountDto
} from '@/generated/core-api'

const defaultCloneForm: CreateAccountCloneRequest = {
  productId: '',
  externalAccountId: '',
  username: '',
  password: '',
  twoFaSecret: '',
  extraInfo: ''
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  products: ProductDto[]
  sourceAccounts: SourceAccountDto[]
}

export const AccountCloneCreateModal = ({ open, onClose, onSuccess, products, sourceAccounts }: Props) => {
  const [form, setForm] = useState<CreateAccountCloneRequest>(defaultCloneForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [githubProfile, setGithubProfile] = useState<GithubUserProfileDto | null>(null)
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [openGithubModal, setOpenGithubModal] = useState(false)
  const [githubUsernameInput, setGithubUsernameInput] = useState('')

  const selectedProduct = useMemo(() => products.find(p => p.id === form.productId), [form.productId, products])
  const isGithubProduct = selectedProduct?.productType === AccountProductType.Github

  useEffect(() => {
    if (open) {
      if (!form.productId && products.length > 0 && products[0].id) {
        setForm(prev => ({ ...prev, productId: products[0].id }))
      }
    }
  }, [open, form.productId, products])

  const createCloneMutation = usePostApiV1AccountSalesAccountClones({
    mutation: {
      onSuccess: response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create account clone')

          return
        }

        toast.success('Account clone created')
        setForm({ ...defaultCloneForm, productId: form.productId })
        setShowPassword(false)
        setShowSecret(false)
        setGithubProfile(null)
        onSuccess()
        onClose()
      }
    }
  })

  const fetchGithubProfile = async () => {
    const username = githubUsernameInput.trim()

    if (!username) return

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

  const handleClose = () => {
    setForm(prev => ({ ...prev, password: '', externalAccountId: '', username: '', twoFaSecret: '', extraInfo: '' }))
    setGithubProfile(null)
    onClose()
  }

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
        <DialogTitle sx={{ pb: 1, pt: 3, px: { xs: 2.5, sm: 4 } }}>
          <Typography component='span' variant='h5' fontWeight={800} sx={{ display: 'block' }}>
            Create Account Clone
          </Typography>
          <Typography component='span' variant='body2' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            Initialize a new account clone. Moves through Init → Pending → Verified.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2.5, sm: 4 }, pt: 3, pb: 4, borderColor: 'divider' }}>
          <Stack spacing={4}>
            <Card variant='outlined' sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography
                variant='caption'
                fontWeight={700}
                sx={{
                  textTransform: 'uppercase',
                  color: 'primary.main',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <i className='tabler-server-cog' style={{ fontSize: 16 }} />
                System Configuration
              </Typography>
              <Stack spacing={3}>
                <TextField
                  select
                  fullWidth
                  label='Product Template'
                  required
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
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label='Source Parent Node (optional)'
                  value={form.sourceAccountId ?? ''}
                  onChange={event => setForm(prev => ({ ...prev, sourceAccountId: event.target.value || null }))}
                >
                  <MenuItem value=''>— Independent Node —</MenuItem>
                  {sourceAccounts.map(sa => (
                    <MenuItem key={sa.id} value={sa.id}>
                      [{sa.accountType}] {sa.username}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Card>

            <Card variant='outlined' sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography
                variant='caption'
                fontWeight={700}
                sx={{
                  textTransform: 'uppercase',
                  color: 'primary.main',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <i className='tabler-key' style={{ fontSize: 16 }} />
                Access Credentials
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: { xs: 2.5, sm: 3 },
                  rowGap: { xs: 2.5, sm: 3 }
                }}
              >
                <TextField
                  label='Username'
                  required
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
                            variant='contained'
                            color='primary'
                            onClick={() => setOpenGithubModal(true)}
                            sx={{ textTransform: 'none', borderRadius: 1.5, py: 0.25, boxShadow: 'none' }}
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
                  <Alert severity='warning' sx={{ gridColumn: '1 / -1', borderRadius: 2 }}>
                    You must fetch GitHub profile before creating a GitHub clone.
                  </Alert>
                )}
                {isGithubProduct && githubProfile && (
                  <Alert
                    severity='info'
                    icon={<i className='tabler-brand-github' style={{ fontSize: 24 }} />}
                    sx={{ gridColumn: '1 / -1', borderRadius: 2 }}
                  >
                    <Typography variant='subtitle2' fontWeight={700}>
                      {githubProfile.login}
                    </Typography>
                    <Typography variant='body2'>
                      ID: {githubProfile.id} &bull; Followers: {githubProfile.followers} &bull; Repos:{' '}
                      {githubProfile.publicRepos}
                    </Typography>
                  </Alert>
                )}

                <TextField
                  label='Initial Password'
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password || ''}
                  onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
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
                <TextField
                  label='2FA Secret Key (optional)'
                  type={showSecret ? 'text' : 'password'}
                  value={form.twoFaSecret || ''}
                  onChange={event => setForm(prev => ({ ...prev, twoFaSecret: event.target.value }))}
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
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

                <TextField
                  label='Node Metadata / Extra Info (optional)'
                  multiline
                  minRows={3}
                  value={form.extraInfo || ''}
                  onChange={event => setForm(prev => ({ ...prev, extraInfo: event.target.value }))}
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
                />
              </Box>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 3, mt: 2 }}>
          <Button onClick={handleClose} color='inherit'>
            Cancel
          </Button>
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
            onClick={() => createCloneMutation.mutate({ data: form })}
            startIcon={
              createCloneMutation.isPending ? (
                <i className='tabler-loader animate-spin' />
              ) : (
                <i className='tabler-device-floppy' />
              )
            }
            color='primary'
            sx={{ px: 3 }}
          >
            Create Account Clone
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openGithubModal} onClose={() => setOpenGithubModal(false)} fullWidth maxWidth='xs'>
        <DialogTitle>Fetch GitHub Profile</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: 2, pb: 1 }}>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Enter the GitHub Username to fetch the External ID (it will be auto-filled into the External Account ID
            field).
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
