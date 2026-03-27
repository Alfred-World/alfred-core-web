'use client'

import { useMemo, useState } from 'react'

import { alpha } from '@mui/material/styles'
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
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  getGetApiV1AccountSalesCommissionsQueryKey,
  useGetApiV1AccountSalesCommissions,
  useGetApiV1AccountSalesCommissionsMemberIdTransactions,
  usePostApiV1AccountSalesCommissionsPayout,
  CommissionTransactionType
} from '@/generated/core-api'
import type { CommissionDto, CommissionTransactionDto, PayoutCommissionRequest } from '@/generated/core-api'

const transactionTypeTone: Record<CommissionTransactionType, string> = {
  OrderCommission: '#16a34a',
  Refund: '#ef4444',
  Payout: '#7c3aed'
}

const transactionTypeLabel: Record<CommissionTransactionType, string> = {
  OrderCommission: 'Commission',
  Refund: 'Refund',
  Payout: 'Payout'
}

const MemberTransactionsDrawer = ({
  commission,
  onClose
}: {
  commission: CommissionDto | null
  onClose: () => void
}) => {
  const txQuery = useGetApiV1AccountSalesCommissionsMemberIdTransactions(commission?.memberId ?? '', {
    query: { enabled: !!commission?.memberId }
  })

  const transactions: CommissionTransactionDto[] = useMemo(
    () => txQuery.data?.result ?? [],
    [txQuery.data?.result]
  )

  return (
    <Drawer
      anchor='right'
      open={!!commission}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, p: 0 } } }}
    >
      {commission && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <IconButton size='small' onClick={onClose}>
              <i className='tabler-x' style={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant='subtitle1' fontWeight={700}>
                {commission.memberDisplayName || commission.memberId}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Commission transaction history
              </Typography>
            </Box>
          </Box>

          {/* Summary */}
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction='row' spacing={3}>
              <Box>
                <Typography variant='caption' color='text.secondary'>Current Balance</Typography>
                <Typography variant='subtitle1' fontWeight={800} color='primary.main'>
                  {commission.availableBalance?.toLocaleString('en-US')} ₫
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Total Earned</Typography>
                <Typography variant='subtitle1' fontWeight={700}>
                  {commission.totalEarned?.toLocaleString('en-US')} ₫
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Total Paid Out</Typography>
                <Typography variant='subtitle1' fontWeight={700} color='text.secondary'>
                  {commission.totalPaidOut?.toLocaleString('en-US')} ₫
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {txQuery.isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {txQuery.isError && (
              <Box sx={{ px: 3, py: 2 }}>
                <Typography color='error'>Failed to load transaction history.</Typography>
              </Box>
            )}
            {!txQuery.isLoading && transactions.length === 0 && (
              <Box sx={{ px: 3, py: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  No transactions yet.
                </Typography>
              </Box>
            )}
            {transactions.map((tx, idx) => {
              const txType = tx.transactionType
              const tone = txType ? (transactionTypeTone[txType] ?? '#64748b') : '#64748b'
              const isCredit = txType === CommissionTransactionType.OrderCommission

              return (
                <Box
                  key={tx.id ?? idx}
                  sx={{
                    px: 3,
                    py: 1.8,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Chip
                          label={txType ? (transactionTypeLabel[txType] ?? txType) : '-'}
                          size='small'
                          sx={{
                            bgcolor: alpha(tone, 0.12),
                            color: tone,
                            fontWeight: 700,
                            border: `1px solid ${alpha(tone, 0.25)}`
                          }}
                        />
                        {tx.orderCode && (
                          <Typography variant='caption' color='text.secondary'>
                            #{tx.orderCode}
                          </Typography>
                        )}
                      </Stack>
                      {tx.note && (
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.4 }}>
                          {tx.note}
                        </Typography>
                      )}
                      <Typography variant='caption' color='text.secondary'>
                        {tx.createdAt?.slice(0, 16).replace('T', ' ')}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='subtitle2' fontWeight={800} color={isCredit ? 'success.main' : 'error.main'}>
                        {isCredit ? '+' : ''}{tx.amount?.toLocaleString('en-US')} ₫
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Balance after: {tx.balanceAfter?.toLocaleString('en-US')} ₫
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Drawer>
  )
}

const AccountSalesCommissions = () => {
  const queryClient = useQueryClient()
  const [selectedCommission, setSelectedCommission] = useState<CommissionDto | null>(null)
  const [payoutCommission, setPayoutCommission] = useState<CommissionDto | null>(null)
  const [payoutNote, setPayoutNote] = useState('')
  const [payoutEvidenceKey, setPayoutEvidenceKey] = useState('')

  const commissionsQuery = useGetApiV1AccountSalesCommissions()

  const commissions: CommissionDto[] = useMemo(
    () => commissionsQuery.data?.result ?? [],
    [commissionsQuery.data?.result]
  )

  const payoutMutation = usePostApiV1AccountSalesCommissionsPayout({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to process payout')

          return
        }

        const result = response.result

        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesCommissionsQueryKey() })
        toast.success(`Paid out ${result?.amountPaid?.toLocaleString('en-US')} ₫ to ${result?.memberDisplayName}`)
        setPayoutCommission(null)
        setPayoutNote('')
        setPayoutEvidenceKey('')
      }
    }
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant='h4' fontWeight={800}>
              Commissions
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage referral commission balances for members.
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mt: 2 }} />
        <Stack direction='row' spacing={2} sx={{ mt: 1.5 }}>
          <Box>
            <Typography variant='caption' color='text.secondary'>Members with commission</Typography>
            <Typography variant='h6' fontWeight={700}>
              {commissions.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' color='text.secondary'>Total pending balance</Typography>
            <Typography variant='h6' fontWeight={700} color='primary.main'>
              {commissions.reduce((sum, c) => sum + (c.availableBalance ?? 0), 0).toLocaleString('en-US')} ₫
            </Typography>
          </Box>
        </Stack>
      </Card>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align='right'>
                  Available Balance
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align='right'>
                  Total Earned
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align='right'>
                  Total Paid Out
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {commissionsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              )}
              {!commissionsQuery.isLoading && commissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                      No commission data available.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {commissions.map(commission => (
                <TableRow key={commission.id} hover>
                  <TableCell>
                    <Typography variant='body2' fontWeight={700}>
                      {commission.memberDisplayName || commission.memberId}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography
                      variant='body2'
                      fontWeight={700}
                      color={(commission.availableBalance ?? 0) > 0 ? 'success.main' : 'text.secondary'}
                    >
                      {commission.availableBalance?.toLocaleString('en-US')} ₫
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2'>{commission.totalEarned?.toLocaleString('en-US')} ₫</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' color='text.secondary'>
                      {commission.totalPaidOut?.toLocaleString('en-US')} ₫
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={1}>
                      <Button size='small' variant='outlined' onClick={() => setSelectedCommission(commission)}>
                        History
                      </Button>
                      <Button
                        size='small'
                        variant='contained'
                        color='primary'
                        disabled={(commission.availableBalance ?? 0) <= 0}
                        onClick={() => {
                          setPayoutCommission(commission)
                          setPayoutNote('')
                          setPayoutEvidenceKey('')
                        }}
                      >
                        Pay Out
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Transaction History Drawer */}
      <MemberTransactionsDrawer commission={selectedCommission} onClose={() => setSelectedCommission(null)} />

      {/* Payout Dialog */}
      <Dialog open={!!payoutCommission} onClose={() => setPayoutCommission(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Pay Out Commission</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            {payoutCommission && (
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant='body2' fontWeight={700}>
                  {payoutCommission.memberDisplayName}
                </Typography>
                <Typography variant='body2' color='primary.main' fontWeight={800}>
                  Balance: {payoutCommission.availableBalance?.toLocaleString('en-US')} ₫
                </Typography>
              </Box>
            )}
            <Typography variant='body2' color='text.secondary'>
              The full available balance will be paid out and reset to 0.
            </Typography>
            <TextField
              label='Evidence Object Key (optional)'
              value={payoutEvidenceKey}
              onChange={e => setPayoutEvidenceKey(e.target.value)}
              fullWidth
              placeholder='R2 object key of the payment evidence file'
              helperText='Enter the key of the file already uploaded to R2 storage'
            />
            <TextField
              label='Note (optional)'
              multiline
              minRows={2}
              value={payoutNote}
              onChange={e => setPayoutNote(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setPayoutCommission(null)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={payoutMutation.isPending}
            onClick={async () => {
              if (!payoutCommission?.memberId) return

              const payload: PayoutCommissionRequest = {
                memberId: payoutCommission.memberId,
                evidenceObjectKey: payoutEvidenceKey || null,
                note: payoutNote || null
              }

              await payoutMutation.mutateAsync({ data: payload })
            }}
          >
            Confirm Payout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccountSalesCommissions
