import React, { useState, useEffect } from 'react'

import { createGuardrails, generateSync } from 'otplib'

const OTP_STEP_SECONDS = 30
const OTP_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 1 })

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
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
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Avatar from '@mui/material/Avatar'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { alpha } from '@mui/material/styles'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { dsl } from '@/utils/dslQueryBuilder'

import {
  AccountProductType,
  getGetApiV1AccountSalesSourceAccountsQueryKey,
  useDeleteApiV1AccountSalesSourceAccountsId,
  useGetApiV1AccountSalesSourceAccounts,
  usePatchApiV1AccountSalesSourceAccountsIdActive,
  usePostApiV1AccountSalesSourceAccounts,
  usePutApiV1AccountSalesSourceAccountsId
} from '@/generated/core-api'
import type {
  CreateSourceAccountRequest,
  SourceAccountDto,
  UpdateSourceAccountRequest
} from '@/generated/core-api'

const ACCOUNT_TYPE_COLOR: Record<AccountProductType, string> = {
  Google: '#4285F4',
  Github: '#333333',
  Cursor: '#5FC3E8',
  Canva: '#7D2AE8',
  OpenAi: '#10a37f',
  Microsoft: '#00a4ef',
  Apple: '#A2AAAD',
  Facebook: '#1877F2',
  Amazon: '#FF9900',
  Other: '#94a3b8'
}

const getIconForAccountType = (type?: AccountProductType | null) => {
  switch (type) {
    case AccountProductType.Google: return 'tabler-brand-google'
    case AccountProductType.Github: return 'tabler-brand-github'
    case AccountProductType.Facebook: return 'tabler-brand-facebook'
    case AccountProductType.Apple: return 'tabler-brand-apple'
    case AccountProductType.Amazon: return 'tabler-brand-amazon'
    case AccountProductType.OpenAi: return 'tabler-brand-openai'
    case AccountProductType.Microsoft: return 'tabler-brand-windows'
    default: return 'tabler-server'
  }
}

const PAGE_SIZE = 10

const defaultCreateForm = (): CreateSourceAccountRequest => ({
  accountType: AccountProductType.Other,
  username: '',
  password: '',
  twoFaSecret: null,
  recoveryEmail: null,
  recoveryPhone: null,
  notes: null
})

// Using standard MUI Switch which automatically inherits the theme's primary color and global styling

const PasswordField = ({
  label,
  value,
  onChange,
  required,
  placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}) => {
  const [show, setShow] = useState(false)

  return (
    <Stack spacing={0.75}>
      <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && '*'}
      </Typography>
      <TextField
        value={value}
        onChange={e => onChange(e.target.value)}
        fullWidth
        variant='outlined'
        placeholder={placeholder}
        type={show ? 'text' : 'password'}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton size='small' edge='end' onClick={() => setShow(s => !s)}>
                  <i className={show ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            ),
            sx: { borderRadius: 1.5, '& fieldset': { borderColor: 'divider' } }
          }
        }}
      />
    </Stack>
  )
}

const CustomTextField = ({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = 'text',
  multiline,
  minRows,
  select,
  children
}: {
  label: string
  value?: unknown
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  required?: boolean
  placeholder?: string
  type?: string
  multiline?: boolean
  minRows?: number
  select?: boolean
  children?: React.ReactNode
}) => {
  return (
    <Stack spacing={0.75}>
      <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && '*'}
      </Typography>
      <TextField
        value={value}
        onChange={onChange}
        fullWidth
        variant='outlined'
        placeholder={placeholder}
        type={type}
        multiline={multiline}
        minRows={minRows}
        select={select}
        slotProps={{
          input: {
            sx: { borderRadius: 1.5, '& fieldset': { borderColor: 'divider' } }
          }
        }}
      >
        {children}
      </TextField>
    </Stack>
  )
}

const CopyableRow = ({ label, value, secret }: { label: string, value?: string | null, secret?: boolean }) => {
  const [show, setShow] = useState(false)

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    }
  }

  return (
    <ListItem sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <ListItemText
        primary={<Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '0.5px' }}>{label}</Typography>}
        secondary={
          <Typography variant='body2' fontWeight={600} fontFamily='monospace' mt={0.5} sx={{ wordBreak: 'break-all' }}>
            {value ? (secret && !show ? '••••••••••••••••' : value) : '-'}
          </Typography>
        }
      />
      <Stack direction='row'>
        {secret && value && (
          <IconButton onClick={() => setShow(!show)} size='small' sx={{ ml: 1 }}>
            <i className={show ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 18 }} />
          </IconButton>
        )}
        <IconButton onClick={handleCopy} size='small' sx={{ ml: 1 }} disabled={!value}>
          <i className={secret ? 'tabler-qrcode' : 'tabler-copy'} style={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </ListItem>
  )
}

const TotpCodeRow = ({ secret }: { secret?: string | null }) => {
  const [code, setCode] = useState<string>('-')
  const [countdown, setCountdown] = useState<number>(30)

  useEffect(() => {
    if (!secret) return

    const generate = () => {
      const secretClean = secret.replace(/\s+/g, '')
      const epochSeconds = Math.floor(Date.now() / 1000)

      try {
        setCode(generateSync({
          secret: secretClean,
          period: OTP_STEP_SECONDS,
          epoch: epochSeconds,
          guardrails: OTP_GUARDRAILS
        }))
      } catch {
        setCode('Error')
      }

      setCountdown(OTP_STEP_SECONDS - (epochSeconds % OTP_STEP_SECONDS))
    }

    generate()
    const interval = setInterval(generate, 1000)


    return () => clearInterval(interval)
  }, [secret])

  if (!secret) return null

  const handleCopy = () => {
    if (code !== '-' && code !== 'Error') {
      navigator.clipboard.writeText(code)
      toast.success('2FA Code copied to clipboard')
    }
  }

  return (
    <ListItem sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <ListItemText
        primary={
          <Stack direction='row' alignItems='center' spacing={1}>
            <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '0.5px' }}>CURRENT 2FA CODE</Typography>
            {code !== '-' && code !== 'Error' && (
              <CircularProgress variant="determinate" value={(countdown / 30) * 100} size={14} thickness={4} sx={{ color: countdown <= 5 ? 'error.main' : 'primary.main' }} />
            )}
          </Stack>
        }
        secondary={
          <Typography
            variant='body1'
            fontWeight={800}
            fontFamily='monospace'
            mt={0.5}
            sx={{ color: code === 'Error' ? 'error.main' : 'primary.main', letterSpacing: '2px' }}
          >
            {code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
          </Typography>
        }
      />
      <IconButton onClick={handleCopy} size='small' sx={{ ml: 1 }} disabled={code === '-' || code === 'Error'}>
        <i className='tabler-copy' style={{ fontSize: 18 }} />
      </IconButton>
    </ListItem>
  )
}

// Extracted to prevent the full list from re-rendering on every keystroke
const CreateSourceAccountDialog = ({ open, onClose, isPending, onSubmit }: { open: boolean, onClose: () => void, isPending: boolean, onSubmit: (data: CreateSourceAccountRequest) => void }) => {
  const [createForm, setCreateForm] = useState<CreateSourceAccountRequest>(defaultCreateForm())

  useEffect(() => {
    if (open) setCreateForm(defaultCreateForm())
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 4, pb: 2 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography variant='h5' fontWeight={800}>Create Source Account</Typography>
          <IconButton onClick={onClose} size='small'><i className='tabler-x' /></IconButton>
        </Stack>
        <Typography variant='body2' color='text.secondary'>Initialize credentials and security protocols for a new source node.</Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, pb: 4 }}>
        <Grid container spacing={3} pt={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              select
              label='ACCOUNT TYPE'
              value={createForm.accountType ?? AccountProductType.Other}
              onChange={e => setCreateForm(prev => ({ ...prev, accountType: e.target.value as AccountProductType }))}
            >
              {Object.values(AccountProductType).map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='USERNAME'
              value={createForm.username ?? ''}
              onChange={e => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PasswordField
              label='PASSWORD'
              value={createForm.password ?? ''}
              onChange={v => setCreateForm(prev => ({ ...prev, password: v }))}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PasswordField
              label='2FA SECRET KEY'
              value={createForm.twoFaSecret ?? ''}
              onChange={v => setCreateForm(prev => ({ ...prev, twoFaSecret: v || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='RECOVERY EMAIL'
              type='email'
              value={createForm.recoveryEmail ?? ''}
              onChange={e => setCreateForm(prev => ({ ...prev, recoveryEmail: e.target.value || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='RECOVERY PHONE'
              value={createForm.recoveryPhone ?? ''}
              onChange={e => setCreateForm(prev => ({ ...prev, recoveryPhone: e.target.value || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              label='NOTES'
              value={createForm.notes ?? ''}
              onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value || null }))}
              multiline
              minRows={3}
              placeholder="Include details such as primary user, rotation schedule, etc."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, px: 4 }}>
        <Button onClick={onClose} color='inherit' sx={{ fontWeight: 600 }}>Cancel</Button>
        <Button
          variant='contained'
          color='primary'
          disabled={!createForm.username || !createForm.password || isPending}
          onClick={() => onSubmit(createForm)}
          sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 700 }}
        >
          Create Source Account
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const EditSourceAccountDialog = ({ target, onClose, isPending, onSubmit }: { target: SourceAccountDto | null, onClose: () => void, isPending: boolean, onSubmit: (data: UpdateSourceAccountRequest) => void }) => {
  const [editForm, setEditForm] = useState<UpdateSourceAccountRequest>({})

  useEffect(() => {
    if (target) {
      setEditForm({
        accountType: target.accountType,
        username: target.username ?? undefined,
        password: target.password ?? undefined,
        twoFaSecret: target.twoFaSecret ?? undefined,
        recoveryEmail: target.recoveryEmail ?? undefined,
        recoveryPhone: target.recoveryPhone ?? undefined,
        notes: target.notes ?? undefined
      })
    }
  }, [target])

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth='md' fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 4, pb: 2 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography variant='h5' fontWeight={800}>Edit Source Account</Typography>
          <IconButton onClick={onClose} size='small'><i className='tabler-x' /></IconButton>
        </Stack>
        <Typography variant='body2' color='text.secondary'>Update credential details and security protocols</Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, pb: 4 }}>
        <Grid container spacing={3} pt={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              select
              label='ACCOUNT TYPE'
              value={editForm.accountType ?? AccountProductType.Other}
              onChange={e => setEditForm(prev => ({ ...prev, accountType: e.target.value as AccountProductType }))}
            >
              {Object.values(AccountProductType).map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='USERNAME'
              value={editForm.username ?? ''}
              onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PasswordField
              label='PASSWORD'
              value={editForm.password ?? ''}
              onChange={v => setEditForm(prev => ({ ...prev, password: v }))}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PasswordField
              label='2FA SECRET'
              value={editForm.twoFaSecret ?? ''}
              onChange={v => setEditForm(prev => ({ ...prev, twoFaSecret: v || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='RECOVERY EMAIL'
              type='email'
              value={editForm.recoveryEmail ?? ''}
              onChange={e => setEditForm(prev => ({ ...prev, recoveryEmail: e.target.value || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              label='RECOVERY PHONE'
              value={editForm.recoveryPhone ?? ''}
              onChange={e => setEditForm(prev => ({ ...prev, recoveryPhone: e.target.value || null }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              label='NOTES'
              value={editForm.notes ?? ''}
              onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value || null }))}
              multiline
              minRows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, px: 4 }}>
        <Button onClick={onClose} color='inherit' sx={{ fontWeight: 600 }}>Cancel</Button>
        <Button
          variant='contained'
          color='primary'
          disabled={!editForm.username || !editForm.password || isPending}
          onClick={() => onSubmit(editForm)}
          sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 700 }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function AccountSalesSourceAccounts() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)

  const [editTarget, setEditTarget] = useState<SourceAccountDto | null>(null)

  const [viewTarget, setViewTarget] = useState<SourceAccountDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SourceAccountDto | null>(null)

  const [tabValue, setTabValue] = useState('All Accounts')

  useEffect(() => {
    setPage(1)
  }, [tabValue])

  const filter = React.useMemo(() => {
    let builder = dsl()

    if (tabValue === 'Active') {
      builder = builder.bool('isActive').eq(true)
    } else if (tabValue === 'Pending') {
      builder = builder.bool('isActive').eq(false)
    }

    return builder.build()
  }, [tabValue])

  const listQuery = useGetApiV1AccountSalesSourceAccounts(
    { page, pageSize: PAGE_SIZE, sort: '-createdAt', filter: filter ? filter : undefined },
    { query: { refetchOnWindowFocus: false } }
  )

  const createMutation = usePostApiV1AccountSalesSourceAccounts({
    mutation: {
      onSuccess: async data => {
        if (!data.success) {
          toast.error(data.message || 'Failed to create source account')

          return
        }

        toast.success('Source account created successfully')
        setOpenCreate(false)
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesSourceAccountsQueryKey() })
      },
      onError: () => toast.error('Failed to create source account')
    }
  })

  const updateMutation = usePutApiV1AccountSalesSourceAccountsId({
    mutation: {
      onSuccess: async data => {
        if (!data.success) {
          toast.error(data.message || 'Failed to update source account')

          return
        }

        toast.success('Source account updated')
        setEditTarget(null)
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesSourceAccountsQueryKey() })
      },
      onError: () => toast.error('Failed to update source account')
    }
  })

  const toggleActiveMutation = usePatchApiV1AccountSalesSourceAccountsIdActive({
    mutation: {
      onSuccess: async data => {
        if (!data.success) {
          toast.error(data.message || 'Failed to toggle status')

          return
        }

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesSourceAccountsQueryKey() })
      },
      onError: () => toast.error('Failed to toggle status')
    }
  })

  const deleteMutation = useDeleteApiV1AccountSalesSourceAccountsId({
    mutation: {
      onSuccess: async data => {
        if (!data.success) {
          toast.error(data.message || 'Failed to delete source account')

          return
        }

        toast.success('Source account deleted')
        setDeleteTarget(null)
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesSourceAccountsQueryKey() })
      },
      onError: () => toast.error('Failed to delete source account')
    }
  })

  const items = listQuery.data?.result?.items ?? []
  const totalPages = listQuery.data?.result?.totalPages ?? 1
  const totalCount = listQuery.data?.result?.total ?? 0 
  const activeCount = items.filter(i => i.isActive).length

  const openEdit = (account: SourceAccountDto) => {
    setEditTarget(account)
  }

  return (
    <Box>
      {/* Header Section */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' mb={3} spacing={2}>
        <Box>
          <Typography variant='h4' fontWeight={800} gutterBottom>Source Accounts</Typography>
          <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 600 }}>
            Manage your enterprise-wide data sources. Configure recovery protocols and monitor account synchronization across the cluster.
          </Typography>
        </Box>
        <Button
          variant='contained'
          color='primary'
          startIcon={<i className='tabler-plus' />}
          onClick={() => setOpenCreate(true)}
          sx={{ px: 3, py: 1.2, borderRadius: 2, fontWeight: 600, flexShrink: 0 }}
        >
          New Source Account
        </Button>
      </Stack>

      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: alpha('#64748B', 0.16), color: '#64748B' }}>
              <i className='tabler-building-bank' style={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ letterSpacing: '0.5px' }}>TOTAL ACCOUNTS</Typography>
              <Typography variant='h5' fontWeight={800}>{totalCount.toLocaleString()}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: alpha('#F59E0B', 0.16), color: '#F59E0B' }}>
              <i className='tabler-refresh' style={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ letterSpacing: '0.5px' }}>ACTIVE SYNCS</Typography>
              <Typography variant='h5' fontWeight={800}>{activeCount.toLocaleString()}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: alpha('#7C3AED', 0.16), color: '#7C3AED' }}>
              <i className='tabler-shield-check' style={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ letterSpacing: '0.5px' }}>VERIFIED STATUS</Typography>
              <Typography variant='h5' fontWeight={800}>98.2%</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
            <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: alpha('#EF4444', 0.16), color: '#EF4444' }}>
              <i className='tabler-alert-circle' style={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ letterSpacing: '0.5px' }}>ALERTS</Typography>
              <Typography variant='h5' fontWeight={800}>12</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' px={3} pt={2} pb={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ minHeight: 48 }} indicatorColor='primary' textColor='primary'>
            <Tab value='All Accounts' label='All Accounts' sx={{ minHeight: 48, fontWeight: 600, textTransform: 'none' }} />
            <Tab value='Active' label='Active' sx={{ minHeight: 48, fontWeight: 600, textTransform: 'none' }} />
            <Tab value='Pending' label='Pending' sx={{ minHeight: 48, fontWeight: 600, textTransform: 'none' }} />
          </Tabs>
          <Stack direction='row' alignItems='center' spacing={2}>
            <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' } }}>
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </Typography>
            <Button variant='outlined' startIcon={<i className='tabler-filter' style={{ fontSize: 16 }} />} size='small' sx={{ borderRadius: 1.5, textTransform: 'none', color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}>
              Filters
            </Button>
          </Stack>
        </Stack>

        <TableContainer>
          <Table size='medium' sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>PROVIDER</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>USERNAME</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>RECOVERY EMAIL</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>CLONE COUNT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>CREATED DATE</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align='center'>
                    <Typography variant='body2' color='text.secondary' py={5}>Loading accounts...</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!listQuery.isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align='center'>
                    <Typography variant='body2' color='text.secondary' py={5}>No accounts found in this filter.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(account => {
                const color = ACCOUNT_TYPE_COLOR[account.accountType ?? AccountProductType.Other] ?? ACCOUNT_TYPE_COLOR.Other

                return (
                  <TableRow key={account.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Stack direction='row' alignItems='center' spacing={2}>
                        <Avatar variant='rounded' sx={{ width: 36, height: 36, bgcolor: alpha(color, 0.1), color: color, borderRadius: 1.5 }}>
                          <i className={getIconForAccountType(account.accountType)} style={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight={700} color='text.primary'>
                            {account.accountType || 'Unknown'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {account.accountType === AccountProductType.Google || account.accountType === AccountProductType.Amazon ? 'Global Gateway' : 'Primary Cluster'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.username}
                        size='small'
                        sx={{
                          bgcolor: 'action.hover',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'text.secondary',
                          borderRadius: 1
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {account.recoveryEmail || <span style={{ opacity: 0.5 }}>Not configured</span>}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2' fontWeight={700} color='text.primary'>
                        {account.cloneCount ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={account.isActive ? 'Deactivate sync' : 'Activate sync'}>
                        <Switch
                          color='primary'
                          checked={account.isActive ?? false}
                          disabled={toggleActiveMutation.isPending}
                          onChange={() => toggleActiveMutation.mutate({ id: account.id!, data: { isActive: !account.isActive } })}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.primary' fontWeight={500}>
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack direction='row' spacing={1} justifyContent='flex-end'>
                        <Tooltip title='View Profile'>
                          <IconButton size='small' onClick={() => setViewTarget(account)} sx={{ color: 'text.secondary', bgcolor: 'action.hover', borderRadius: 1.5 }}>
                            <i className='tabler-eye' style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit Config'>
                          <IconButton size='small' onClick={() => openEdit(account)} sx={{ color: 'text.secondary', bgcolor: 'action.hover', borderRadius: 1.5 }}>
                            <i className='tabler-pencil' style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete Asset'>
                          <IconButton size='small' onClick={() => setDeleteTarget(account)} sx={{ color: 'error.main', bgcolor: alpha('#EF4444', 0.1), borderRadius: 1.5 }}>
                            <i className='tabler-trash' style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction='row' alignItems='center' justifyContent='space-between' p={2} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction='row' alignItems='center' spacing={1}>
            <Typography variant='body2' color='text.secondary'>Rows per page:</Typography>
            <TextField select size='small' value={PAGE_SIZE} variant='outlined' sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32 } }}>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </TextField>
          </Stack>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size='medium' shape='rounded' color='primary' />
        </Stack>
      </Card>

      {/* Bottom Information Cards */}
      <Grid container spacing={3} mt={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2.5, borderRadius: 3, display: 'flex', gap: 2, bgcolor: alpha('#7C3AED', 0.04), border: '1px solid', borderColor: alpha('#7C3AED', 0.1) }}>
            <Avatar sx={{ bgcolor: alpha('#7C3AED', 0.16), color: '#7C3AED', mt: 0.5 }}><i className='tabler-bulb' /></Avatar>
            <Box>
              <Typography variant='subtitle1' fontWeight={700} color='text.primary' gutterBottom>Security Recommendation</Typography>
              <Typography variant='body2' color='text.secondary'>
                It is recommended to rotate recovery emails for accounts older than 180 days. 12 accounts currently meet this criteria. <span style={{ color: '#7C3AED', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>View list</span>
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2.5, borderRadius: 3, display: 'flex', gap: 2, bgcolor: alpha('#F59E0B', 0.04), border: '1px solid', borderColor: alpha('#F59E0B', 0.1) }}>
            <Avatar sx={{ bgcolor: alpha('#F59E0B', 0.16), color: '#F59E0B', mt: 0.5 }}><i className='tabler-info-circle' /></Avatar>
            <Box>
              <Typography variant='subtitle1' fontWeight={700} color='text.primary' gutterBottom>New Feature: Clone Clusters</Typography>
              <Typography variant='body2' color='text.secondary'>
                You can now group source accounts into &quot;Cloning Clusters&quot; for easier bulk management of data mirroring. <span style={{ color: '#F59E0B', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Learn more</span>
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>


      {/* Create Dialog */}
      <CreateSourceAccountDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        isPending={createMutation.isPending}
        onSubmit={(data) => createMutation.mutate({ data })}
      />

      {/* Edit Dialog */}
      <EditSourceAccountDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        isPending={updateMutation.isPending}
        onSubmit={(data) => {
          if (editTarget?.id) updateMutation.mutate({ id: editTarget.id, data })
        }}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ pb: 1 }}><Typography variant='h6' fontWeight={700}>Delete Asset</Typography></DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete <strong>{deleteTarget?.username}</strong>? This action will sever
            all active connections and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color='inherit' sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (!deleteTarget?.id) return
              deleteMutation.mutate({ id: deleteTarget.id })
            }}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Confirm Deletion
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Drawer */}
      <Drawer
        anchor='right'
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, bgcolor: 'background.default', borderLeft: '1px solid', borderColor: 'divider' } } }}
      >
        {viewTarget && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 4, pb: 3, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction='row' alignItems='center' justifyContent='space-between' mb={3}>
                <Stack direction='row' spacing={1.5}>
                  <Chip label='NODE PROFILE' size='small' sx={{ bgcolor: alpha('#7C3AED', 0.16), color: '#7C3AED', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1 }} />
                  <Chip icon={<i className='tabler-copy' style={{ fontSize: 13 }} />} label={`CLONES: ${viewTarget.cloneCount ?? 0}`} size='small' sx={{ bgcolor: alpha('#D97706', 0.16), color: '#D97706', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1, '& .MuiChip-icon': { color: '#D97706' } }} />
                </Stack>
                <IconButton onClick={() => setViewTarget(null)} size='small' sx={{ bgcolor: 'action.hover' }}>
                  <i className='tabler-x' style={{ fontSize: 18 }} />
                </IconButton>
              </Stack>

              <Typography variant='h4' fontWeight={800} gutterBottom sx={{ wordBreak: 'break-all' }}>
                {viewTarget.username}
              </Typography>

              <Stack direction='row' alignItems='center' spacing={0.5} color='text.secondary'>
                <i className='tabler-history' style={{ fontSize: 16 }} />
                <Typography variant='body2'>Last synced {viewTarget.updatedAt ? new Date(viewTarget.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</Typography>
              </Stack>
            </Box>

            <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
              <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
                <Typography variant='caption' color='text.secondary' fontWeight={800} sx={{ letterSpacing: '1px' }}>
                  <Stack direction='row' alignItems='center' spacing={0.5}><i className='tabler-lock-square' style={{ fontSize: 16 }} /> SECURITY CREDENTIALS</Stack>
                </Typography>
              </Stack>

              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, mb: 4, bgcolor: 'background.paper' }}>
                <List disablePadding>
                  <CopyableRow label='USERNAME' value={viewTarget.username} />
                  <CopyableRow label='PASSWORD' value={viewTarget.password} secret />
                  <CopyableRow label='2FA SECRET KEY' value={viewTarget.twoFaSecret} secret />
                  <TotpCodeRow secret={viewTarget.twoFaSecret} />
                </List>
              </Card>

              <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
                <Typography variant='caption' color='text.secondary' fontWeight={800} sx={{ letterSpacing: '1px' }}>
                  <Stack direction='row' alignItems='center' spacing={0.5}><i className='tabler-history-toggle' style={{ fontSize: 16 }} />  RECOVERY CONFIG</Stack>
                </Typography>
              </Stack>

              <Stack spacing={2} mb={4}>
                <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Avatar variant='rounded' sx={{ width: 42, height: 42, bgcolor: 'action.hover', color: 'text.secondary', borderRadius: 1.5 }}>
                    <i className='tabler-at' style={{ fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>EMERGENCY EMAIL</Typography>
                    <Typography variant='body2' fontWeight={600} fontFamily={!viewTarget.recoveryEmail ? 'inherit' : 'monospace'} color={!viewTarget.recoveryEmail ? 'text.secondary' : 'text.primary'}>
                      {viewTarget.recoveryEmail || 'Not configured'}
                    </Typography>
                  </Box>
                </Card>
                <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Avatar variant='rounded' sx={{ width: 42, height: 42, bgcolor: 'action.hover', color: 'text.secondary', borderRadius: 1.5 }}>
                    <i className='tabler-message-circle' style={{ fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>EMERGENCY SMS</Typography>
                    <Typography variant='body2' fontWeight={600} fontFamily={!viewTarget.recoveryPhone ? 'inherit' : 'monospace'} color={!viewTarget.recoveryPhone ? 'text.secondary' : 'text.primary'}>
                      {viewTarget.recoveryPhone || 'Not configured'}
                    </Typography>
                  </Box>
                </Card>
              </Stack>

              {viewTarget.notes && (
                <>
                  <Typography variant='caption' color='text.secondary' fontWeight={800} sx={{ letterSpacing: '1px', display: 'block', mb: 2 }}>
                    <Stack direction='row' alignItems='center' spacing={0.5}><i className='tabler-note' style={{ fontSize: 16 }} /> NOTES</Stack>
                  </Typography>
                  <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, bgcolor: 'background.paper', mb: 4 }}>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'text.secondary' }}>
                      {viewTarget.notes}
                    </Typography>
                  </Card>
                </>
              )}

              <Box sx={{ mt: 'auto', pt: 2, pb: 1 }}>
                <Stack direction='row' spacing={2}>
                  <Button
                    variant='outlined'
                    fullWidth
                    startIcon={<i className='tabler-pencil' />}
                    onClick={() => { setViewTarget(null); openEdit(viewTarget) }}
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, borderColor: 'divider', color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    Edit Config
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    fullWidth
                    startIcon={<i className='tabler-trash' />}
                    onClick={() => { setViewTarget(null); setDeleteTarget(viewTarget) }}
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, borderColor: alpha('#EF4444', 0.5), '&:hover': { bgcolor: alpha('#EF4444', 0.05) } }}
                  >
                    Delete Asset
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
