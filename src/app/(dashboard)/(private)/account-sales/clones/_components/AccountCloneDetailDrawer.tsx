'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { createGuardrails, generateSync } from 'otplib'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'

import type { AccountCloneDto } from '@/generated/core-api'

const OTP_STEP_SECONDS = 30
const OTP_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 1 })

interface Props {
  selectedClone: AccountCloneDto | null
  onClose: () => void
  onEdit: (clone: AccountCloneDto) => void
  nowEpochMs: number
}

const maskSensitiveValue = (value?: string | null) => {
  if (!value) return '-'

  return '•'.repeat(Math.max(8, Math.min(value.length, 16)))
}

export const AccountCloneDetailDrawer = ({ selectedClone, onClose, onEdit, nowEpochMs }: Props) => {
  const theme = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const otpView = useMemo(() => {
    const secret = selectedClone?.twoFaSecret?.replace(/\s+/g, '')

    if (!secret) return { code: '-', remainingSeconds: OTP_STEP_SECONDS, valid: false }

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

  const handleCopy = (text?: string | null) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleClose = () => {
    setShowPassword(false)
    setShowSecret(false)
    onClose()
  }

  return (
    <Drawer
      anchor='right'
      open={!!selectedClone}
      onClose={handleClose}
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      PaperProps={{
        sx: {
          width: { xs: 320, sm: 460 },
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Header */}
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={handleClose} sx={{ position: 'absolute', top: -8, right: -8, color: 'text.secondary' }}>
            <i className='tabler-x' />
          </IconButton>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
            <Chip
              size='small'
              label='CLONE DETAIL'
              color='primary'
              variant='outlined'
              sx={{
                fontWeight: 800,
                fontSize: '0.65rem',
                height: 20
              }}
            />
            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.5px' }}>
              ID: {selectedClone?.externalAccountId || selectedClone?.id?.substring(0, 8)}
            </Typography>
          </Stack>
          <Typography variant='h4' fontWeight={800} sx={{ mb: 0.5 }}>
            {selectedClone?.product?.name || 'Unknown Product'}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {selectedClone?.extraInfo || 'Active instance synchronization in progress.'}
          </Typography>
        </Box>

        {/* Source & External ID Row */}
        <Stack direction='row' spacing={2}>
          <Card variant='outlined' sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Typography
              variant='caption'
              sx={{ color: 'primary.main', fontWeight: 700, mb: 1, display: 'block', letterSpacing: '1px' }}
            >
              SOURCE ACCOUNT
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center'>
              <i className='tabler-user-share' style={{ color: 'var(--mui-palette-text-secondary)', fontSize: 18 }} />
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {selectedClone?.sourceAccount?.username || 'Independent Node'}
              </Typography>
            </Stack>
          </Card>
          <Card variant='outlined' sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Typography
              variant='caption'
              sx={{ color: 'primary.main', fontWeight: 700, mb: 1, display: 'block', letterSpacing: '1px' }}
            >
              EXTERNAL ID
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center'>
              <i className='tabler-database' style={{ color: 'var(--mui-palette-text-secondary)', fontSize: 18 }} />
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {selectedClone?.externalAccountId || 'Not assigned'}
              </Typography>
            </Stack>
          </Card>
        </Stack>

        {/* Access Credentials */}
        <Box>
          <Typography
            variant='caption'
            sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, mb: 2, letterSpacing: '1px' }}
          >
            <Box component='span' sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            ACCESS CREDENTIALS
          </Typography>
          <Stack spacing={2}>
            {/* Username Box */}
            <Box
              sx={{
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  USERNAME
                </Typography>
                <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '14px' }}>
                  {selectedClone?.username}
                </Typography>
              </Box>
              <IconButton
                size='small'
                onClick={() => handleCopy(selectedClone?.username)}
                sx={{ color: 'text.secondary' }}
              >
                <i className='tabler-copy' style={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Password Box */}
            <Box
              sx={{
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  PASSWORD
                </Typography>
                <Typography variant='body2' sx={{ fontWeight: 600, letterSpacing: '2px', mt: 0.5 }}>
                  {showPassword ? selectedClone?.password : maskSensitiveValue(selectedClone?.password)}
                </Typography>
              </Box>
              <Stack direction='row' spacing={1}>
                <IconButton
                  size='small'
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ color: 'text.secondary' }}
                >
                  <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 18 }} />
                </IconButton>
                <IconButton
                  size='small'
                  onClick={() => handleCopy(selectedClone?.password)}
                  sx={{ color: 'text.secondary' }}
                >
                  <i className='tabler-copy' style={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Security Token */}
        <Box>
          <Typography
            variant='caption'
            sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, mb: 2, letterSpacing: '1px' }}
          >
            <Box component='span' sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'secondary.main' }} />
            SECURITY TOKEN
          </Typography>
          <Card
            variant='outlined'
            sx={{
              p: 3,
              borderColor: otpView.valid ? alpha(theme.palette.primary.main, 0.5) : 'divider',
              borderRadius: 3,
              boxShadow: otpView.valid ? `inset 0 0 20px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Ambient background glow */}
            {otpView.valid && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 70%)`,
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}
              />
            )}

            <Stack direction='row' spacing={3} alignItems='center'>
              {/* QR Code pseudo box */}
              {otpauthUri ? (
                <Box
                  sx={{
                    p: 1,
                    bgcolor: '#fff',
                    borderRadius: 2,
                    width: 96,
                    height: 96,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <QRCodeSVG value={otpauthUri} size={84} style={{ display: 'block' }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    bgcolor: 'background.default',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <i className='tabler-lock' style={{ color: 'var(--mui-palette-text-secondary)', fontSize: 32 }} />
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  LIVE OTP CODE
                  {otpView.valid && (
                    <Box
                      component='span'
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        boxShadow: theme => `0 0 8px ${alpha(theme.palette.success.main, 0.8)}`
                      }}
                    />
                  )}
                </Typography>
                <Stack direction='row' alignItems='center' spacing={2}>
                  <Typography
                    variant='h3'
                    fontWeight={800}
                    fontFamily='monospace'
                    sx={{
                      letterSpacing: '6px',
                      my: 0.5,
                      textShadow: otpView.valid ? `0 0 16px ${alpha(theme.palette.primary.main, 0.5)}` : 'none',
                      fontSize: '2rem'
                    }}
                  >
                    {otpView.code.length === 6 ? `${otpView.code.slice(0, 3)} ${otpView.code.slice(3)}` : otpView.code}
                  </Typography>
                  {otpView.valid && (
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(otpView.code)}
                      sx={{
                        color: 'text.secondary',
                        bgcolor: 'background.default',
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0
                      }}
                    >
                      <i className='tabler-copy' style={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Stack>

                <Box sx={{ mt: 1.5 }}>
                  <Typography variant='caption' sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    2FA SECRET
                  </Typography>
                  <Stack direction='row' alignItems='center' spacing={1}>
                    <Box
                      sx={{
                        bgcolor: 'background.default',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                        {showSecret ? selectedClone?.twoFaSecret : maskSensitiveValue(selectedClone?.twoFaSecret)}
                      </Typography>
                      <IconButton
                        size='small'
                        onClick={() => setShowSecret(!showSecret)}
                        sx={{ p: 0.25, color: 'text.secondary' }}
                      >
                        <i className={showSecret ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(selectedClone?.twoFaSecret)}
                      sx={{
                        color: 'text.secondary',
                        bgcolor: 'background.default',
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <i className='tabler-copy' style={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>
            </Stack>

            {otpView.valid && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 2,
                  bgcolor: 'primary.main',
                  width: `${((OTP_STEP_SECONDS - otpView.remainingSeconds) / OTP_STEP_SECONDS) * 100}%`,
                  transition: 'width 1s linear'
                }}
              />
            )}
          </Card>
        </Box>

        {/* Recent Activity Mock Bar */}
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, display: 'block', letterSpacing: '1px' }}
          >
            RECENT ACTIVITY
          </Typography>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'background.default', display: 'flex', overflow: 'hidden' }}>
            <Box sx={{ width: '40%', bgcolor: 'primary.main' }} />
            <Box sx={{ width: '20%', bgcolor: 'secondary.main' }} />
            <Box sx={{ width: '5%', bgcolor: 'success.main' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase' }}
            >
              LAST CLONED: 2H AGO
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              STABILITY: 99.8%
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2
        }}
      >
        <Button onClick={handleClose} color='inherit' sx={{ fontWeight: 600 }}>
          Close
        </Button>
        <Button
          variant='contained'
          color='primary'
          onClick={() => {
            if (selectedClone) onEdit(selectedClone)
          }}
          startIcon={<i className='tabler-pencil' />}
          sx={{
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Edit Account
        </Button>
      </Box>
    </Drawer>
  )
}
