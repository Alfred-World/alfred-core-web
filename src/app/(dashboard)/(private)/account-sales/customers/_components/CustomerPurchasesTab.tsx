'use client'

import { alpha } from '@mui/material/styles'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { AccountOrderDto } from '@/generated/core-api'
import { AccountOrderStatus } from '@/generated/core-api'

export type PurchasesTabProps = {
  orders: AccountOrderDto[]
  totalOrders: number
  totalSpend: number
  page: number
  totalPages: number
  setPage: (p: number) => void
}

const CustomerPurchasesTab = ({ orders, totalOrders, totalSpend, page, totalPages, setPage }: PurchasesTabProps) => {
  const lastPurchaseDate = orders[0]?.purchaseDate?.slice(0, 10) || 'N/A'

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography
                variant='caption'
                sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}
              >
                Total Spend
              </Typography>
              <Typography variant='h4' sx={{ mt: 1, mb: 0.5, fontWeight: 800 }}>
                {totalSpend.toLocaleString('vi-VN')}₫
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center' }}
              >
                <i className='tabler-trending-up' style={{ marginRight: 4 }} />
                +18.4% YoY
              </Typography>
            </Box>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: t => alpha(t.palette.text.primary, 0.05),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='tabler-wallet' style={{ fontSize: 20 }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography
                variant='caption'
                sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}
              >
                Last Purchase Date
              </Typography>
              <Typography variant='h4' sx={{ mt: 1, mb: 0.5, fontWeight: 800 }}>
                {lastPurchaseDate}
              </Typography>
              <Typography variant='caption' sx={{ color: '#94a3b8' }}>
                Web Store
              </Typography>
            </Box>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: t => alpha(t.palette.text.primary, 0.05),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='tabler-calendar' style={{ fontSize: 20 }} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='subtitle1' fontWeight={700}>
          Transaction History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size='small' variant='outlined' startIcon={<i className='tabler-download' />}>
            Export
          </Button>
          <Button size='small' variant='outlined' startIcon={<i className='tabler-filter' />}>
            Filter
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                '& th': { color: 'text.secondary', fontWeight: 700, borderColor: 'divider', borderBottomWidth: 2 }
              }}
            >
              <TableCell>ORDER ID</TableCell>
              <TableCell>PRODUCT NAME</TableCell>
              <TableCell>DATE</TableCell>
              <TableCell>AMOUNT</TableCell>
              <TableCell>STATUS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(order => {
              const statusColor =
                order.status === AccountOrderStatus.Active
                  ? 'success'
                  : order.status === AccountOrderStatus.Refunded
                    ? 'warning'
                    : 'default'

              const statusHex =
                statusColor === 'success' ? '#10b981' : statusColor === 'warning' ? '#f59e0b' : '#94a3b8'

              return (
                <TableRow key={order.id} hover sx={{ '& td': { borderColor: 'divider' } }}>
                  <TableCell sx={{ fontWeight: 700 }}>#{order.orderCode}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i
                          className={order.productName?.includes('Bundle') ? 'tabler-packages' : 'tabler-box'}
                          style={{ color: 'text.secondary', fontSize: 16 }}
                        />
                      </Box>
                      <Box>
                        <Typography variant='body2' fontWeight={700}>
                          {order.productName}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {order.productVariantNameSnapshot}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{order.purchaseDate?.slice(0, 10)}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {(order.unitPriceSnapshot ?? 0).toLocaleString('vi-VN')}₫
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={order.status === 'Active' ? 'COMPLETED' : order.status?.toUpperCase() || 'COMPLETED'}
                      sx={{
                        bgcolor: `rgba(${statusColor === 'success' ? '16,185,129' : statusColor === 'warning' ? '245,158,11' : '148,163,184'}, 0.1)`,
                        color: statusHex,
                        fontWeight: 800,
                        fontSize: 10,
                        borderRadius: 1
                      }}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align='center' sx={{ py: 4, borderColor: 'divider', color: 'text.secondary' }}>
                  No transaction history available for this member.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size='small' color='primary' />
        </Box>
      )}

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', textAlign: 'right', mt: 0.5 }}>
        {totalOrders} total orders
      </Typography>
    </Box>
  )
}

export default CustomerPurchasesTab
