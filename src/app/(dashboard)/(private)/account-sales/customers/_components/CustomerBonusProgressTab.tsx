'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import type { BonusTierProgressDto, SalesBonusTransactionDto, SellerBonusProgressDto } from '@/generated/core-api'

type PayNoteDialogOpts = {
  open: boolean
  transactionId: string | null
  soldByMemberId?: string
  tierId?: string
  note: string
} | null

export type BonusProgressTabProps = {
  bonusProgress: SellerBonusProgressDto | null | undefined
  txHistory: SalesBonusTransactionDto[]
  selectedMemberId: string | null
  setPayNoteDialog: (opts: PayNoteDialogOpts) => void
  isPayingBonus: boolean
  cancelTx: (id: string) => Promise<void>
  isCanceling: boolean
}

const CustomerBonusProgressTab = (props: BonusProgressTabProps) => {
  const { bonusProgress, txHistory, selectedMemberId, setPayNoteDialog, isPayingBonus, cancelTx, isCanceling } = props
  
  const tiers: BonusTierProgressDto[] = bonusProgress?.tiers ?? []
  const orderCount = bonusProgress?.currentOrderCount ?? 0

  const reachedTierIndices = tiers.reduce<number[]>((acc, t, i) => (t.isReached ? [...acc, i] : acc), [])
  const activeIndex = reachedTierIndices.length > 0 ? reachedTierIndices[reachedTierIndices.length - 1] : -1
  const progressPct = tiers.length <= 1 || activeIndex < 0 ? 0 : (activeIndex / (tiers.length - 1)) * 100

  const nextTier = tiers.find(t => !t.isReached)
  const ordersNeeded = nextTier?.ordersNeeded ?? 0

  return (
    <Box>
      <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 5 }}>
          <Box>
            <Typography variant='h6' fontWeight={800}>Tier Milestones</Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {ordersNeeded > 0 ? `Next tier unlock in ${ordersNeeded} orders` : 'Max tier reached!'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant='h5' fontWeight={800}>{orderCount}</Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>CURRENT ORDERS</Typography>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', mt: 3, px: 2 }}>
          {/* Progress track */}
          <Box sx={{ position: 'absolute', top: 12, left: '10%', right: '10%', height: 4, bgcolor: 'divider', borderRadius: 2, zIndex: 0 }} />
          {/* Fill track */}
          {activeIndex >= 0 && (
            <Box sx={{ 
              position: 'absolute', top: 12, left: '10%', 
              width: `${progressPct * 0.8}%`, 
              height: 4, bgcolor: 'primary.main', borderRadius: 2, zIndex: 1,
              transition: 'width 0.5s ease-in-out'
            }} />
          )}

          {tiers.map((tier, idx) => {
            const isReached = tier.isReached ?? false
            const isCurrent = idx === activeIndex

            
return (
              <Box key={tier.tierId ?? idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: 80 }}>
                <Box sx={{ 
                  width: 24, height: 24, borderRadius: '50%', 
                  bgcolor: 'background.paper', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mb: 1.5,
                  ...(isReached 
                    ? { border: '3px solid', borderColor: 'primary.main', boxShadow: t => `0 0 10px ${alpha(t.palette.primary.main, 0.5)}` } 
                    : { border: '3px solid', borderColor: 'divider' })
                }}>
                  {isReached && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                </Box>
                <Typography variant='body2' fontWeight={700} sx={{ color: isReached ? 'text.primary' : 'text.secondary' }}>
                  {tier.orderThreshold} orders
                </Typography>
                <Typography variant='caption' sx={{ color: isCurrent ? 'primary.main' : 'text.disabled', fontWeight: isCurrent ? 700 : 400 }}>
                  {isReached ? 'Reached' : `${tier.ordersNeeded ?? ''} more`}
                </Typography>
                {tier.bonusAmount != null && (
                  <Typography variant='caption' sx={{ color: 'success.main', mt: 0.5, fontWeight: 700 }}>
                    +{tier.bonusAmount.toLocaleString()}₫
                  </Typography>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='subtitle1' fontWeight={700}>Payment History</Typography>
        <Button size='small' variant='outlined' sx={{ textTransform: 'uppercase' }}>View All</Button>
      </Box>

      <TableContainer sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { color: 'text.secondary', fontWeight: 700, borderColor: 'divider', borderBottomWidth: 2 } }}>
              <TableCell>PERIOD</TableCell>
              <TableCell>ORDERS TRIGGERED</TableCell>
              <TableCell>AMOUNT</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell align='right'>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txHistory.map(tx => {
              const chipColor = tx.status === 'Paid' ? 'success' : tx.status === 'Pending' ? 'warning' : 'default'

              return (
                <TableRow key={tx.id} hover sx={{ '& td': { borderColor: 'divider' } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{tx.year}/{String(tx.month).padStart(2, '0')}</TableCell>
                  <TableCell sx={{ color: 'text.primary' }}>{tx.orderCountAtTrigger} orders {tx.note ? `· ${tx.note}` : ''}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{(tx.bonusAmountSnapshot ?? 0).toLocaleString('vi-VN')}₫</TableCell>
                  <TableCell>
                    <Chip 
                      size='small' 
                      label={tx.status} 
                      color={chipColor as 'success' | 'warning' | 'default'}
                      sx={{ 
                        fontWeight: 800,
                        fontSize: 10,
                        borderRadius: 1
                      }} 
                    />
                  </TableCell>
                  <TableCell align='right'>
                    {tx.status === 'Pending' && (
                      <Stack direction='row' spacing={1} justifyContent='flex-end'>
                        <Button
                          size='small'
                          variant='contained'
                          color='success'
                          sx={{ minWidth: 0, px: 1.5, py: 0.5, fontSize: 11, borderRadius: 1.5 }}
                          disabled={isPayingBonus}
                          onClick={() => setPayNoteDialog({ open: true, transactionId: tx.id!, note: '' })}
                        >
                          Pay
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          color='error'
                          sx={{ minWidth: 0, px: 1.5, py: 0.5, fontSize: 11, borderRadius: 1.5 }}
                          disabled={isCanceling}
                          onClick={() => cancelTx(tx.id!)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {txHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 4, borderColor: 'divider', color: 'text.secondary' }}>
                  No payment history.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual Tier Payments if any tier reached but not paid */}
      <Box sx={{ mt: 3 }}>
        <Typography variant='caption' sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>MANUAL TIER PAYMENTS</Typography>
        <Stack spacing={1} direction='row' flexWrap='wrap'>
          {tiers.map((tier: BonusTierProgressDto) => {
            const isReached = tier.isReached ?? false
            const isPaid = tier.transactionStatus === 'Paid'
            
            if (!isReached || isPaid) return null
            
            return (
              <Chip
                key={tier.tierId}
                label={`Pay ${tier.orderThreshold} orders tier: ${(tier.bonusAmount ?? 0).toLocaleString()}₫`}
                color='primary'
                onClick={() => setPayNoteDialog({
                  open: true,
                  transactionId: tier.transactionId ?? null,
                  soldByMemberId: selectedMemberId ?? undefined,
                  tierId: tier.tierId ?? undefined,
                  note: ''
                })}
                disabled={isPayingBonus}
                sx={{ borderRadius: 1.5 }}
                icon={<i className='tabler-cash' style={{ marginLeft: 8 }} />}
              />
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}

export default CustomerBonusProgressTab
