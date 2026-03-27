'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { alpha } from '@mui/material/styles'

import type { AccountOrderDto } from '@/generated/core-api'

export type ReferralsTabProps = {
  referralOrders: AccountOrderDto[]
  totalCommission: number
  totalReferrals: number
  page: number
  totalPages: number
  setPage: (p: number) => void
}

const CustomerReferralsTab = ({ referralOrders, totalCommission, totalReferrals, page, totalPages, setPage }: ReferralsTabProps) => {
  const lastReferralDate = referralOrders[0]?.purchaseDate?.slice(0, 10) || 'N/A'

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Total Commission Earned
              </Typography>
              <Typography variant='h4' sx={{ mt: 1, mb: 0.5, fontWeight: 800 }}>
                {totalCommission.toLocaleString('vi-VN')}₫
              </Typography>
              <Typography variant='caption' sx={{ color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                <i className='tabler-trending-up' style={{ marginRight: 4 }} />
                +24.5% from last month
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: t => alpha(t.palette.text.primary, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-businessplan' style={{ fontSize: 20, color: 'text.secondary' }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Recent Referral
              </Typography>
              <Typography variant='h4' sx={{ mt: 1, mb: 0.5, fontWeight: 800 }}>
                {lastReferralDate}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                Direct Link
              </Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: t => alpha(t.palette.text.primary, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-link' style={{ fontSize: 20, color: 'text.secondary' }} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='subtitle1' fontWeight={700}>Referral History</Typography>
      </Box>

      <TableContainer sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { color: 'text.secondary', fontWeight: 700, borderColor: 'divider', borderBottomWidth: 2 } }}>
              <TableCell>ORDER ID</TableCell>
              <TableCell>PRODUCT</TableCell>
              <TableCell>BUYER</TableCell>
              <TableCell>DATE</TableCell>
              <TableCell align='right'>COMMISSION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {referralOrders.map(order => (
              <TableRow key={order.id} hover sx={{ '& td': { borderColor: 'divider' } }}>
                <TableCell sx={{ fontWeight: 700 }}>#{order.orderCode}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant='body2' fontWeight={700}>{order.productName}</Typography>
                    <Typography variant='caption' sx={{ color: 'success.main', fontWeight: 700 }}>{order.referralCommissionPercentSnapshot ?? 0}% rate</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>{order.memberDisplayName || 'Unknown buyer'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{order.purchaseDate?.slice(0, 10)}</TableCell>
                <TableCell align='right'>
                  <Chip
                    size='small'
                    color='success'
                    label={`+${(order.referralCommissionAmountSnapshot ?? 0).toLocaleString('vi-VN')}₫`}
                    sx={{ fontWeight: 800, px: 0.5, borderRadius: 1.5 }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {referralOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 4, borderColor: 'divider', color: 'text.secondary' }}>
                  No referral orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            size='small'
            color='primary'
          />
        </Box>
      )}

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', textAlign: 'right', mt: 0.5 }}>
        {totalReferrals} total referrals
      </Typography>
    </Box>
  )
}

export default CustomerReferralsTab
