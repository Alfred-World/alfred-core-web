'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { toast } from 'react-toastify'
// eslint-disable-next-line import/no-deprecated
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import Avatar from '@mui/material/Avatar'

import {
  useGetApiV1AccountSalesOrders,
  useGetApiV1AccountSalesSettingsReferralCommission,
  useGetApiV1AccountSalesProducts,
  usePutApiV1AccountSalesSettingsReferralCommission,
  useGetApiV1AccountSalesMembers
} from '@/generated/core-api'
import type { ApiErrorResponse, UpdateReferralCommissionSettingRequest } from '@/generated/core-api'
import { MemberSource } from '@/generated/core-api'

type RevenueBySource = {
  zalo: number
  facebook: number
  tiktok: number
  other: number
}

const sourceColor: Record<MemberSource, string> = {
  Facebook: '#1877F2',
  Tiktok: '#ff2d55',
  Zalo: '#00bcd4',
  Other: '#78909c',
}

const mockChartData = [
  { name: 'JAN', value: 30 },
  { name: 'FEB', value: 25 },
  { name: 'MAR', value: 45 },
  { name: 'APR', value: 40 },
  { name: 'MAY', value: 70 },
  { name: 'JUN', value: 95 },
  { name: 'JUL', value: 65 },
  { name: 'AUG', value: 60 },
  { name: 'SEP', value: 55 },
  { name: 'OCT', value: 80 },
  { name: 'NOV', value: 70 },
  { name: 'DEC', value: 60 },
]

const StatCard = ({ title, value, icon, color, trend, trendColor = 'success' }: { title: string; value: string; icon: string; color: string, trend: string, trendColor?: 'success' | 'neutral' }) => {
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={icon} style={{ fontSize: 24, color }} />
        </Box>
        {trendColor === 'success' ? (
          <Chip label={trend} size="small" sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', fontWeight: 700, borderRadius: 1.5 }} icon={<i className="tabler-trending-up" style={{ color: '#10b981', fontSize: 14 }} />} />
        ) : (
          <Chip label={trend} size="small" sx={{ bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 600, borderRadius: 1.5 }} />
        )}
      </Box>
      <Box sx={{ mt: 'auto' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</Typography>
        <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{value}</Typography>
      </Box>
    </Card>
  )
}

const AccountSalesDashboard = () => {
  const theme = useTheme()
  const [commissionPercentInput, setCommissionPercentInput] = useState('0')

  const { data: productData, isError: isProductsError, error: productsError } = useGetApiV1AccountSalesProducts({ page: 1, pageSize: 1 })
  const { data: memberData } = useGetApiV1AccountSalesMembers({ page: 1, pageSize: 1})

  const ordersQuery = useGetApiV1AccountSalesOrders({ page: 1, pageSize: 10, sort: '-createdAt', view: 'list' })
  const commissionSettingQuery = useGetApiV1AccountSalesSettingsReferralCommission()

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
      }
    }
  })

  const apiErrorMessage = useMemo(() => {
    const error = productsError || ordersQuery.error || commissionSettingQuery.error

    if (!error) return null
    if (error instanceof Error) return error.message
    const apiError = error as ApiErrorResponse

    
return apiError.errors?.[0]?.message || 'Failed to load account sales data'
  }, [productsError, ordersQuery.error, commissionSettingQuery.error])

  useEffect(() => {
    if (isProductsError || ordersQuery.isError || commissionSettingQuery.isError) {
      toast.error(apiErrorMessage || 'Failed to load data')
    }
  }, [isProductsError, ordersQuery.isError, commissionSettingQuery.isError, apiErrorMessage])

  useEffect(() => {
    if (commissionSettingQuery.data?.success && typeof commissionSettingQuery.data.result?.commissionPercent === 'number') {
      setCommissionPercentInput(String(commissionSettingQuery.data.result.commissionPercent))
    }
  }, [commissionSettingQuery.data])

  const dashboardData = useMemo(() => {
    const rows = ordersQuery.data?.result?.items ?? []

    const revenue = rows.reduce<RevenueBySource>((acc, row) => {
      const price = row.unitPriceSnapshot ?? 0
      const source = row.referrerMember?.source as MemberSource || MemberSource.Other

      if (source === MemberSource.Zalo) acc.zalo += price
      else if (source === MemberSource.Facebook) acc.facebook += price
      else if (source === MemberSource.Tiktok) acc.tiktok += price
      else acc.other += price
      
return acc
    }, { zalo: 0, facebook: 0, tiktok: 0, other: 0 })

    return {
      rows,
      revenue,
      totalRevenue: rows.reduce((sum, row) => sum + (row.unitPriceSnapshot ?? 0), 0) || 428590 // Using mock total if 0 to match design visually
    }
  }, [ordersQuery.data])

  const handleUpdateCommission = async () => {
    const parsedValue = Number(commissionPercentInput)

    if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
      toast.error('Commission percent must be between 0 and 100')
      
return
    }

    const payload: UpdateReferralCommissionSettingRequest = { commissionPercent: Number(parsedValue.toFixed(2)) }

    await updateCommissionMutation.mutateAsync({ data: payload })
  }

  const currentCommission = commissionSettingQuery.data?.result?.commissionPercent ?? 0
  const commissionHistory = commissionSettingQuery.data?.result?.history ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1, md: 0 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>System Overview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Real-time operational performance and financial insights.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" color="secondary" sx={{ borderRadius: 2, textTransform: 'none', px: 2.5, fontWeight: 600 }}>Download Report</Button>
          <Button variant="contained" sx={{ borderRadius: 2, textTransform: 'none', px: 2.5, fontWeight: 600, bgcolor: '#6366f1', color: '#fff', '&:hover': { bgcolor: '#4f46e5' }, boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}>Refresh Data</Button>
        </Box>
      </Box>

      {/* Row 1: Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
        <StatCard title="TOTAL REVENUE" value={`$${(dashboardData.totalRevenue / 1).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon="tabler-wallet" color="#818cf8" trend="+12.5%" />
        <StatCard title="TOTAL SALES" value={(ordersQuery.data?.result?.total ?? dashboardData.rows.length).toLocaleString('en-US')} icon="tabler-shopping-bag" color="#c084fc" trend="+8.2%" />
        <StatCard title="READY PRODUCTS" value={productData?.result?.total ? productData.result.total.toLocaleString('en-US') : '0'} icon="tabler-package" color="#fb923c" trend="Stable" trendColor="neutral" />
        <StatCard title="TOTAL MEMBERS" value={memberData?.result?.total ? memberData.result.total.toLocaleString('en-US') : '0'} icon="tabler-users" color="#475569" trend="+24%" />
      </Box>

      {/* Row 2: Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 3 }}>
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Revenue Trends</Typography>
              <Typography variant="body2" color="text.secondary">Monthly breakdown for the current fiscal year</Typography>
            </Box>
            <Button size="small" variant="outlined" endIcon={<i className="tabler-chevron-down" />} sx={{ color: 'text.secondary', borderColor: 'divider', borderRadius: 2 }}>Last 12 Months</Button>
          </Box>
          <Box sx={{ height: 260, width: '100%', mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 600 }} 
                  dy={10} 
                />
                <RechartsTooltip cursor={{ fill: alpha(theme.palette.text.primary, 0.05) }} contentStyle={{ borderRadius: 8, backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }} />
                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                  {mockChartData.map((entry, index) => (
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    <Cell key={`cell-${index}`} fill={entry.name === 'JUN' ? '#a855f7' : alpha(theme.palette.text.primary, 0.08)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Revenue By Source</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 'auto' }}>
            {(() => {
              const total = dashboardData.totalRevenue || 1

              
return [
                { label: 'Facebook', value: dashboardData.revenue.facebook, color: sourceColor.Facebook },
                { label: 'TikTok', value: dashboardData.revenue.tiktok, color: sourceColor.Tiktok },
                { label: 'Zalo', value: dashboardData.revenue.zalo, color: sourceColor.Zalo },
                { label: 'Organic / Others', value: dashboardData.revenue.other, color: sourceColor.Other },
              ].map((source) => {
                const pct = Math.round((source.value / total) * 100)

                
return (
                  <Box key={source.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="text.primary">{source.label}</Typography>
                      <Typography variant="body2" fontWeight={600}>{pct}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(source.color, 0.15),
                        '& .MuiLinearProgress-bar': { bgcolor: source.color, borderRadius: 4 }
                      }}
                    />
                  </Box>
                )
              })
            })()}
          </Box>
          <Box sx={{ mt: 4, p: 2, borderRadius: 2, bgcolor: alpha(sourceColor.Facebook, 0.08), border: '1px solid', borderColor: alpha(sourceColor.Facebook, 0.2), display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <i className="tabler-info-circle" style={{ color: sourceColor.Facebook, marginTop: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
              <strong style={{ color: theme.palette.text.primary }}>Facebook</strong> conversions are up by 12% compared to last month.
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Row 3: Orders & Referral */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 3 }}>
        <Card sx={{ p: 0, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>Recent Orders</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#818cf8', cursor: 'pointer' }}>View All Orders</Typography>
          </Box>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: 600 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr', p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">ORDER ID</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">CUSTOMER</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">PRODUCT</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">AMOUNT</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">STATUS</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Mock data for the screenshot look */}
                {[
                  { id: '28491', name: 'Helena Nguyen', product: 'Premium Subscription', amount: '$199.00', status: 'ACTIVE' },
                  { id: '28488', name: 'John Smith', product: 'Advanced Suite Pro', amount: '$450.00', status: 'ACTIVE' },
                  { id: '28485', name: 'Alex Lee', product: 'Standard API Access', amount: '$89.00', status: 'INACTIVE' },
                  { id: '28482', name: 'Sarah Tan', product: 'Enterprise License', amount: '$1,200.00', status: 'ACTIVE' },
                ].map((row, idx) => (
                  <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr', p: 2, alignItems: 'center', borderBottom: idx !== 3 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">#ORD-{row.id}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.text.primary, 0.1), color: 'text.primary', fontSize: 13, fontWeight: 600 }}>
                        {row.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{row.product}</Typography>
                    <Typography variant="body2" fontWeight={700}>{row.amount}</Typography>
                    <Box>
                      <Chip 
                        label={row.status} 
                        size="small" 
                        sx={{ 
                          bgcolor: row.status === 'ACTIVE' ? alpha('#10b981', 0.1) : alpha('#475569', 0.15), 
                          color: row.status === 'ACTIVE' ? '#10b981' : 'text.disabled',
                          fontWeight: 700, 
                          borderRadius: 1.5,
                          fontSize: 10,
                          letterSpacing: 0.5
                        }} 
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
            <i className="tabler-percentage" style={{ fontSize: 20 }} />
            <Typography variant="h6" fontWeight={700}>Referral Rate</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>Current Commission</Typography>
            <Box sx={{ 
              width: 140, height: 140, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              borderRadius: '24px', 

              // Fake jagged circle with dashed border
              border: '2px dashed', 
              borderColor: alpha(theme.palette.text.primary, 0.2), 
              bgcolor: alpha(theme.palette.text.primary, 0.02)
            }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h2" fontWeight={800}>{currentCommission}</Typography>
                <Typography variant="h4" fontWeight={800} color="text.secondary">%</Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Set New Percentage</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <TextField 
              variant="standard"
              value={commissionPercentInput}
              onChange={e => {
                const val = e.target.value

                if (val === '' || (/^\d*\.?\d*$/.test(val) && Number(val) <= 100)) setCommissionPercentInput(val)
              }}
              slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { disableUnderline: true, sx: { px: 2, py: 1, fontWeight: 700 } } }}
              sx={{ flex: 1 }}
            />
            <Box sx={{ px: 2, py: 1, borderLeft: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.text.primary, 0.04) }}>
              <Typography fontWeight={700} color="text.secondary">%</Typography>
            </Box>
          </Box>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleUpdateCommission}
            disabled={updateCommissionMutation.isPending}
            sx={{ borderRadius: 2, py: 1.5, mb: 4, bgcolor: '#334155', color: '#fff', '&:hover': { bgcolor: '#475569' }, fontWeight: 600, textTransform: 'none' }}
          >
            Update Rate
          </Button>

          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 2, color: 'text.secondary' }}>Change History</Typography>
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {commissionHistory.slice(0, 5).map(item => (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {item.changedAt ? new Date(item.changedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {(item.previousCommissionPercent ?? 0).toFixed(2)}% → {(item.newCommissionPercent ?? 0).toFixed(2)}%
                </Typography>
              </Box>
            ))}
            {commissionHistory.length === 0 && (
              <Typography variant="body2" color="text.disabled">No changes yet.</Typography>
            )}
          </Box>
        </Card>
      </Box>

      {/* Row 4: Health & Insight */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3 }}>
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h6" fontWeight={700}>System Health</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <Typography variant="body2" fontWeight={600} color="#10b981">Operational</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>API Latency</Typography>
                <Typography variant="body2" fontWeight={700}>42ms</Typography>
              </Box>
              <LinearProgress variant="determinate" value={15} sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#10b981', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Database CPU</Typography>
                <Typography variant="body2" fontWeight={700}>18%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={18} sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#6366f1', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#6366f1' } }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Storage Capacity</Typography>
                <Typography variant="body2" fontWeight={700}>64%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={64} sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#c084fc', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#c084fc' } }} />
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: alpha('#6366f1', 0.3), bgcolor: alpha('#1e1b4b', 0.4), backgroundImage: 'linear-gradient(145deg, rgba(30, 27, 75, 0.4) 0%, rgba(13, 11, 38, 0.8) 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <i className="tabler-rocket" style={{ fontSize: 24, color: '#c084fc' }} />
            <Typography variant="h6" fontWeight={700}>Premium Insight</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 4 }}>
            &quot;Your sales funnel on <strong style={{ color: '#c084fc' }}>TikTok</strong> is outperforming other channels by 24% in engagement. Consider shifting $2,500 from the experimental budget to TikTok Ads to maximize the current viral trend.&quot;
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" sx={{ borderRadius: 2, borderColor: alpha('#fff', 0.2), color: 'text.primary', textTransform: 'none', px: 3, fontWeight: 600 }}>View Analysis</Button>
            <Button variant="contained" sx={{ borderRadius: 2, bgcolor: '#818cf8', color: '#fff', textTransform: 'none', px: 3, fontWeight: 600, '&:hover': { bgcolor: '#6366f1' } }}>Apply Strategy</Button>
          </Box>
        </Card>
      </Box>

    </Box>
  )
}

export default AccountSalesDashboard

