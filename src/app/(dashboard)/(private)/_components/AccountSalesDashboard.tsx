'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  getApiV1AccountSalesOrders,
  useGetApiV1AccountSalesMembers,
  useGetApiV1AccountSalesSettingsReferralCommission,
  useGetApiV1AccountSalesSettingsReferralCommissionHistory,
  useGetApiV1AccountSalesOrdersRevenueBySeller,
  useGetApiV1AccountSalesProducts,
  usePutApiV1AccountSalesSettingsReferralCommission
} from '@/generated/core-api'
import type { ApiErrorResponse, SellerRevenueDto, UpdateReferralCommissionSettingRequest } from '@/generated/core-api'

type RevenueBySource = {
  zalo: number
  facebook: number
  tiktok: number
  other: number
}

type SellerAwareRevenue = {
  sellerUserId?: string | null
  sellerEmail?: string | null
  sellerFullName?: string | null
}

type OrderCodeAware = {
  orderCode?: string | null
  id?: string
}

const sourceColor: Record<string, string> = {
  Zalo: '#10b981',
  Facebook: '#2563eb',
  Tiktok: '#f97316',
  Other: '#6b7280'
}

const StatCard = ({ title, value, icon, tone }: { title: string; value: string; icon: string; tone: string }) => {
  return (
    <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', right: -10, top: -10, opacity: 0.08, color: tone }}>
        <i className={icon} style={{ fontSize: 76 }} />
      </Box>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>{title}</Typography>
      <Typography variant='h4' fontWeight={800}>{value}</Typography>
    </Card>
  )
}

const getOrderCodeDisplay = (order: OrderCodeAware) => {
  return order.orderCode || order.id?.slice(0, 10)
}

const getRevenueSellerDisplay = (item: SellerAwareRevenue) => {
  if (item.sellerFullName) {
    return item.sellerUserId ? `${item.sellerFullName} (#${item.sellerUserId})` : item.sellerFullName
  }

  if (item.sellerEmail) {
    return item.sellerUserId ? `${item.sellerEmail} (#${item.sellerUserId})` : item.sellerEmail
  }

  return `Seller #${item.sellerUserId ?? '-'}`
}

const AccountSalesDashboard = () => {
  const [commissionPercentInput, setCommissionPercentInput] = useState('0')

  const { data: productData, isError: isProductsError, error: productsError } = useGetApiV1AccountSalesProducts({ page: 1, pageSize: 200, sort: 'name' })
  const { data: memberData, isError: isMembersError, error: membersError } = useGetApiV1AccountSalesMembers({ page: 1, pageSize: 40, sort: '-createdAt' })
  const commissionSettingQuery = useGetApiV1AccountSalesSettingsReferralCommission()
  const commissionHistoryQuery = useGetApiV1AccountSalesSettingsReferralCommissionHistory()

  const updateCommissionMutation = usePutApiV1AccountSalesSettingsReferralCommission({
    mutation: {
      onSuccess: response => {
        if (!response.success || !response.result) {
          toast.error(response.errors?.[0]?.message || 'Failed to update referral commission setting')

          return
        }

        toast.success('Referral commission updated')
        setCommissionPercentInput(String(response.result.commissionPercent ?? 0))
        void commissionSettingQuery.refetch()
        void commissionHistoryQuery.refetch()
      }
    }
  })

  const members = useMemo(() => memberData?.result?.items ?? [], [memberData?.result?.items])
  const products = useMemo(() => productData?.result?.items ?? [], [productData?.result?.items])

  const ordersQuery = useQuery({
    queryKey: ['account-sales', 'dashboard-orders', members.map(x => x.id).join(',')],
    enabled: members.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        members
          .filter(x => x.id)
          .slice(0, 20)
          .map(async member => {
            const res = await getApiV1AccountSalesOrders({ page: 1, pageSize: 20, sort: '-createdAt', filter: `memberId == '${member.id!}'`, view: 'list' })

            return {
              member,
              orders: res.result?.items ?? []
            }
          })
      )

      return responses
    }
  })

  const sellerRevenueQuery = useGetApiV1AccountSalesOrdersRevenueBySeller()

  const apiErrorMessage = useMemo(() => {
    const error =
      productsError ||
      membersError ||
      ordersQuery.error ||
      commissionSettingQuery.error ||
      commissionHistoryQuery.error

    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    const apiError = error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load account sales data'
  }, [productsError, membersError, ordersQuery.error, commissionSettingQuery.error, commissionHistoryQuery.error])

  // ─── Error handling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isProductsError || isMembersError || ordersQuery.isError || commissionSettingQuery.isError || commissionHistoryQuery.isError) {
      toast.error(apiErrorMessage || 'Failed to load account sales data')
    }
  }, [
    isProductsError,
    isMembersError,
    ordersQuery.isError,
    commissionSettingQuery.isError,
    commissionHistoryQuery.isError,
    apiErrorMessage
  ])

  useEffect(() => {
    if (commissionSettingQuery.data?.success && typeof commissionSettingQuery.data.result?.commissionPercent === 'number') {
      setCommissionPercentInput(String(commissionSettingQuery.data.result.commissionPercent))
    }
  }, [commissionSettingQuery.data])

  const dashboardData = useMemo(() => {
    const rows = (ordersQuery.data ?? []).flatMap(x => x.orders.map(order => ({ ...order, member: x.member })))

    const revenue = rows.reduce<RevenueBySource>(
      (acc, row) => {
        const price = row.unitPriceSnapshot ?? 0
        const source = row.member?.source ?? 'Other'

        if (source === 'Zalo') acc.zalo += price
        else if (source === 'Facebook') acc.facebook += price
        else if (source === 'Tiktok') acc.tiktok += price
        else acc.other += price

        return acc
      },
      { zalo: 0, facebook: 0, tiktok: 0, other: 0 }
    )

    return {
      rows,
      revenue,
      totalRevenue: rows.reduce((sum, row) => sum + (row.unitPriceSnapshot ?? 0), 0)
    }
  }, [ordersQuery.data])

  const accountHealth = useMemo(() => {
    const total = dashboardData.rows.length

    if (total === 0) {
      return 100
    }

    const active = dashboardData.rows.filter(x => x.status === 'Active').length

    return Math.round((active / total) * 100)
  }, [dashboardData.rows])

  const sellerRevenue = useMemo(() => {
    if (sellerRevenueQuery.data?.success && sellerRevenueQuery.data.result && sellerRevenueQuery.data.result.length > 0) {
      return sellerRevenueQuery.data.result
    }

    const grouped = new Map<string, SellerRevenueDto>()

    dashboardData.rows.forEach(order => {
      const sellerId = String(order.soldByUserId || '').trim()

      if (!sellerId) {
        return
      }

      const revenue = order.unitPriceSnapshot ?? 0
      const current = grouped.get(sellerId) ?? { sellerUserId: sellerId, soldOrders: 0, totalRevenue: 0 }

      current.soldOrders = (current.soldOrders ?? 0) + 1
      current.totalRevenue = (current.totalRevenue ?? 0) + revenue
      grouped.set(sellerId, current)
    })

    return Array.from(grouped.values()).sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))
  }, [dashboardData.rows, sellerRevenueQuery.data])

  const commissionHistory = useMemo(() => {
    if (!commissionHistoryQuery.data?.success || !commissionHistoryQuery.data.result) {
      return []
    }

    return commissionHistoryQuery.data.result
  }, [commissionHistoryQuery.data])

  const handleUpdateCommission = async () => {
    const parsedValue = Number(commissionPercentInput)

    if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
      toast.error('Commission percent must be a number between 0 and 100')

      return
    }

    const payload: UpdateReferralCommissionSettingRequest = {
      commissionPercent: Number(parsedValue.toFixed(2))
    }

    await updateCommissionMutation.mutateAsync({ data: payload })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant='h4' fontWeight={800}>System Overview</Typography>
        <Typography variant='body2' color='text.secondary'>Real-time metrics for account sales and warranty operations.</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        <StatCard title='Total Revenue' value={`${dashboardData.totalRevenue.toLocaleString('vi-VN')} VND`} icon='tabler-cash' tone='#2563eb' />
        <StatCard title='Total Sales' value={dashboardData.rows.length.toLocaleString('vi-VN')} icon='tabler-shopping-cart' tone='#0ea5e9' />
        <StatCard title='Ready Products' value={products.length.toLocaleString('vi-VN')} icon='tabler-package' tone='#16a34a' />
        <StatCard title='Members' value={members.length.toLocaleString('vi-VN')} icon='tabler-users' tone='#f97316' />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 2fr' }, gap: 2.5 }}>
        <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant='h6' fontWeight={700} sx={{ mb: 2 }}>Revenue By Source</Typography>

          {(['Zalo', 'Facebook', 'Tiktok', 'Other'] as const).map(source => {
            const key = source.toLowerCase() as keyof RevenueBySource
            const total = dashboardData.totalRevenue || 1
            const value = dashboardData.revenue[key]
            const pct = Math.round((value / total) * 100)

            return (
              <Box key={source} sx={{ mb: 2.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant='body2' sx={{ color: sourceColor[source], fontWeight: 700 }}>{source}</Typography>
                  <Typography variant='body2' color='text.secondary'>{value.toLocaleString('vi-VN')} VND</Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(sourceColor[source], 0.16),
                    '& .MuiLinearProgress-bar': { bgcolor: sourceColor[source] }
                  }}
                />
              </Box>
            )
          })}
        </Card>

        <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant='h6' fontWeight={700} sx={{ mb: 2 }}>Recent Orders</Typography>
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {dashboardData.rows.slice(0, 6).map(order => (
              <Box
                key={order.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 1fr 1fr auto auto',
                  gap: 1,
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: 'action.hover'
                }}
              >
                <Typography variant='body2' fontWeight={700}>{getOrderCodeDisplay(order)}</Typography>
                <Typography variant='body2' color='text.secondary'>{order.member?.displayName || 'Unknown member'}</Typography>
                <Typography variant='body2' color='text.secondary'>{order.productName}</Typography>
                <Typography variant='body2' color='text.secondary'>{`# ${order.soldByUser?.fullName}`}</Typography>
                <Chip size='small' label={order.status} color={order.status === 'Active' ? 'primary' : 'default'} />
              </Box>
            ))}
            {dashboardData.rows.length === 0 && (
              <Typography variant='body2' color='text.secondary'>No order data yet. Create the first order to populate dashboard metrics.</Typography>
            )}
          </Box>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5 }}>
        <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant='h6' fontWeight={700} sx={{ mb: 1 }}>System Health Status</Typography>
          <Typography variant='body2' color='text.secondary'>Active warranty and account replacement ratio based on current order records.</Typography>
          <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 72 }}>
              <Typography variant='h4' fontWeight={800}>{accountHealth}%</Typography>
              <Typography variant='caption' color='text.secondary'>Health</Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={accountHealth}
              sx={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                bgcolor: alpha('#2563eb', 0.15),
                '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' }
              }}
            />
          </Box>
        </Card>

        <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#1e3a8a', color: 'common.white' }}>
          <Typography variant='overline' sx={{ letterSpacing: 1.3 }}>Premium Insight</Typography>
          <Typography variant='h6' fontWeight={800} sx={{ mt: 0.8 }}>Optimization Suggestion</Typography>
          <Divider sx={{ borderColor: alpha('#fff', 0.2), my: 1.2 }} />
          <Typography variant='body2' sx={{ color: alpha('#fff', 0.9) }}>
            Source conversion is strongest on Zalo. Consider prioritizing quick replacement stock for Zalo-heavy products.
          </Typography>
        </Card>
      </Box>

      <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant='h6' fontWeight={700} sx={{ mb: 1.5 }}>Revenue By Seller</Typography>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {sellerRevenue.slice(0, 8).map((item, index) => (
            <Box
              key={`${item.sellerUserId ?? 'unknown'}-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 1,
                alignItems: 'center',
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'action.hover'
              }}
            >
              <Typography variant='body2' fontWeight={700}>{getRevenueSellerDisplay(item as SellerAwareRevenue)}</Typography>
              <Chip size='small' label={`${item.soldOrders ?? 0} orders`} color='primary' variant='outlined' />
              <Typography variant='body2' color='text.secondary'>{(item.totalRevenue ?? 0).toLocaleString('vi-VN')} VND</Typography>
            </Box>
          ))}
          {sellerRevenue.length === 0 && (
            <Typography variant='body2' color='text.secondary'>No seller revenue data yet.</Typography>
          )}
        </Box>
      </Card>

      <Card sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant='h6' fontWeight={700} sx={{ mb: 1.5 }}>Referral Commission Setting</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.6fr' }, gap: 2.5 }}>
          <Card variant='outlined' sx={{ p: 2 }}>
            <Typography variant='caption' color='text.secondary'>Current Percent</Typography>
            <Typography variant='h4' fontWeight={800} sx={{ mt: 0.5 }}>
              {(commissionSettingQuery.data?.result?.commissionPercent ?? 0).toFixed(2)}%
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Snapshot at sell-time ensures old orders keep historical commission values.
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
              <TextField
                size='small'
                label='Percent'
                value={commissionPercentInput}
                onChange={event => setCommissionPercentInput(event.target.value)}
                sx={{ maxWidth: 150 }}
              />
              <Button
                variant='contained'
                onClick={handleUpdateCommission}
                disabled={updateCommissionMutation.isPending}
              >
                Save
              </Button>
            </Box>
          </Card>

          <Card variant='outlined' sx={{ p: 2 }}>
            <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 1 }}>Change History</Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {commissionHistory.slice(0, 8).map(item => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto 1fr auto',
                    gap: 1,
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Chip size='small' variant='outlined' label={`${(item.previousCommissionPercent ?? 0).toFixed(2)}%`} />
                  <i className='tabler-arrow-right' style={{ fontSize: 14, opacity: 0.7 }} />
                  <Chip size='small' color='primary' variant='outlined' label={`${(item.newCommissionPercent ?? 0).toFixed(2)}%`} />
                  <Typography variant='caption' color='text.secondary'>
                    {item.changedByUser?.fullName || item.changedByUser?.email || (item.changedByUser?.id ? `User #${item.changedByUser.id.slice(0, 8)}` : 'System')} • {item.changedAt?.slice(0, 16).replace('T', ' ')}
                  </Typography>
                </Box>
              ))}
              {commissionHistory.length === 0 && (
                <Typography variant='body2' color='text.secondary'>No commission changes yet.</Typography>
              )}
            </Box>
          </Card>
        </Box>
      </Card>
    </Box>
  )
}

export default AccountSalesDashboard
