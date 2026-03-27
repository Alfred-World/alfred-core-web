'use client'

import { useState } from 'react'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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
  getGetApiV1AccountSalesCommissionsMemberIdQueryKey,
  useGetApiV1AccountSalesCommissionsMemberId,
  useGetApiV1AccountSalesCommissionsMemberIdTransactions,
  usePostApiV1AccountSalesCommissionsPayout,
  CommissionTransactionType
} from '@/generated/core-api'
import type { CommissionTransactionDto, PayoutCommissionRequest } from '@/generated/core-api'

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

export type CustomerCommissionTabProps = {
  memberId: string | null
}

const CustomerCommissionTab = ({ memberId }: CustomerCommissionTabProps) => {
  const queryClient = useQueryClient()
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [payoutNote, setPayoutNote] = useState('')
  const [payoutEvidenceKey, setPayoutEvidenceKey] = useState('')

  const commissionQuery = useGetApiV1AccountSalesCommissionsMemberId(memberId ?? '', {
    query: { enabled: !!memberId, retry: false, throwOnError: false }
  })

  const txQuery = useGetApiV1AccountSalesCommissionsMemberIdTransactions(memberId ?? '', {
    query: { enabled: !!memberId }
  })

  const payoutMutation = usePostApiV1AccountSalesCommissionsPayout({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to process payout')
          
return
        }

        const result = response.result

        if (memberId) {
          await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesCommissionsMemberIdQueryKey(memberId) })
        }

        await txQuery.refetch()
        toast.success(`Paid out ${result?.amountPaid?.toLocaleString('en-US')} ₫ to ${result?.memberDisplayName}`)
        setPayoutOpen(false)
        setPayoutNote('')
        setPayoutEvidenceKey('')
      },
      onError: () => {
        toast.error('Failed to process payout')
      }
    }
  })

  const commission = commissionQuery.data?.result ?? null
  const transactions: CommissionTransactionDto[] = txQuery.data?.result ?? []

  if (!memberId) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color='text.secondary'>Select a member to view commission details.</Typography>
      </Box>
    )
  }

  if (commissionQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (commissionQuery.isError || !commission) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color='text.secondary'>No commission record found for this member.</Typography>
      </Box>
    )
  }

  const availableBalance = commission.availableBalance ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Available Balance
          </Typography>
          <Typography
            variant='h5'
            fontWeight={800}
            sx={{ mt: 1, color: availableBalance > 0 ? 'success.main' : 'text.primary' }}
          >
            {availableBalance.toLocaleString('en-US')} ₫
          </Typography>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Total Earned
          </Typography>
          <Typography variant='h5' fontWeight={800} sx={{ mt: 1 }}>
            {(commission.totalEarned ?? 0).toLocaleString('en-US')} ₫
          </Typography>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Total Paid Out
          </Typography>
          <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'text.secondary' }}>
            {(commission.totalPaidOut ?? 0).toLocaleString('en-US')} ₫
          </Typography>
        </Box>
      </Box>

      {/* Payout Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='contained'
          color='primary'
          disabled={availableBalance <= 0}
          startIcon={<i className='tabler-cash' />}
          onClick={() => {
            setPayoutNote('')
            setPayoutEvidenceKey('')
            setPayoutOpen(true)
          }}
        >
          Pay Out {availableBalance > 0 ? `${availableBalance.toLocaleString('en-US')} ₫` : ''}
        </Button>
      </Box>

      {/* Transaction History */}
      <Box>
        <Typography variant='subtitle1' fontWeight={700} sx={{ mb: 1.5 }}>
          Commission Transactions
        </Typography>
        <TableContainer sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ '& th': { color: 'text.secondary', fontWeight: 700, borderColor: 'divider', borderBottomWidth: 2 } }}>
                <TableCell>TYPE</TableCell>
                <TableCell>ORDER</TableCell>
                <TableCell>NOTE</TableCell>
                <TableCell>DATE</TableCell>
                <TableCell align='right'>AMOUNT</TableCell>
                <TableCell align='right'>BALANCE AFTER</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {txQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 3 }}>
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              )}
              {!txQuery.isLoading && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 3 }}>
                    <Typography variant='body2' color='text.secondary'>No transactions yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((tx, idx) => {
                const txType = tx.transactionType
                const tone = txType ? (transactionTypeTone[txType] ?? '#64748b') : '#64748b'
                const isCredit = txType === CommissionTransactionType.OrderCommission

                return (
                  <TableRow key={tx.id ?? idx} hover sx={{ '& td': { borderColor: 'divider' } }}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {tx.orderCode ? `#${tx.orderCode}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {tx.note || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {tx.createdAt?.slice(0, 16).replace('T', ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={700} color={isCredit ? 'success.main' : 'error.main'}>
                        {isCredit ? '+' : ''}{tx.amount?.toLocaleString('en-US')} ₫
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='caption' color='text.secondary'>
                        {tx.balanceAfter?.toLocaleString('en-US')} ₫
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Payout Dialog */}
      <Dialog open={payoutOpen} onClose={() => setPayoutOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Pay Out Commission</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant='body2' color='primary.main' fontWeight={800}>
                Balance: {availableBalance.toLocaleString('en-US')} ₫
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                The full available balance will be paid out and reset to 0.
              </Typography>
            </Box>
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
          <Button onClick={() => setPayoutOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={payoutMutation.isPending || !memberId}
            onClick={async () => {
              if (!memberId) return

              const payload: PayoutCommissionRequest = {
                memberId,
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

export default CustomerCommissionTab
