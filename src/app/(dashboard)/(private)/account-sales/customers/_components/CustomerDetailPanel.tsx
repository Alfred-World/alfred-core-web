'use client'

import { alpha } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import type {
  AccountOrderDto,
  MemberDto,
  SellerBonusProgressDto,
  SalesBonusTransactionDto
} from '@/generated/core-api'

import { getInitials } from '@/utils/getInitials'

import CustomerPurchasesTab from './CustomerPurchasesTab'
import CustomerReferralsTab from './CustomerReferralsTab'
import CustomerBonusProgressTab from './CustomerBonusProgressTab'
import CustomerCommissionTab from './CustomerCommissionTab'

export type PayNoteDialogOpts = {
  open: boolean
  transactionId: string | null
  soldByMemberId?: string
  tierId?: string
  note: string
}

export type DetailPanelProps = {
  selectedMember: MemberDto | null
  orders: AccountOrderDto[]
  totalOrders: number
  totalSpend: number
  ordersPage: number
  ordersTotalPages: number
  setOrdersPage: (p: number) => void
  referralOrders: AccountOrderDto[]
  totalReferrals: number
  referralsPage: number
  referralsTotalPages: number
  setReferralsPage: (p: number) => void
  totalReferralCommission: number
  bonusProgress: SellerBonusProgressDto | null | undefined
  txHistory: SalesBonusTransactionDto[]
  detailTab: 'purchased' | 'referrals' | 'bonus-progress' | 'commission' | 'staff-notes'
  setDetailTab: (v: 'purchased' | 'referrals' | 'bonus-progress' | 'commission' | 'staff-notes') => void
  setPayNoteDialog: (opts: PayNoteDialogOpts | null) => void
  isPayingBonus: boolean
  cancelTx: (id: string) => Promise<void>
  isCanceling: boolean
  onEditMember: () => void
}

const CustomerDetailPanel = (props: DetailPanelProps) => {
  const {
    selectedMember, orders, totalOrders, totalSpend, ordersPage, ordersTotalPages, setOrdersPage,
    referralOrders, totalReferrals, referralsPage, referralsTotalPages, setReferralsPage,
    totalReferralCommission, bonusProgress, txHistory, detailTab, setDetailTab,
    setPayNoteDialog, isPayingBonus, cancelTx, isCanceling, onEditMember
  } = props

  if (!selectedMember) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
        <Typography variant='h6' color='text.secondary'>Select a member from the list to view details.</Typography>
      </Box>
    )
  }

  const sourceName = selectedMember.source || 'Other'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Profile Header Block */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{ width: 80, height: 80, fontSize: 32, fontWeight: 800, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              {getInitials(selectedMember.displayName || 'U')}
            </Avatar>
            <Box sx={{
              position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, borderRadius: 1.5,
              bgcolor: 'warning.main', color: 'warning.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)', border: '2px solid', borderColor: 'background.paper'
            }}>
              <i className='tabler-star-filled' style={{ fontSize: 16 }} />
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant='h4' fontWeight={800}>{selectedMember.displayName || 'Unnamed member'}</Typography>
              <Chip size='small' label='VIP MEMBER' sx={{ bgcolor: alpha('#f59e0b', 0.15), color: '#f59e0b', fontWeight: 800, borderRadius: 1.5, fontSize: 10 }} />
            </Box>
            <Typography variant='body2' sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <i className='tabler-map-pin' />
              Ho Chi Minh City, Vietnam
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant='outlined' startIcon={<i className='tabler-pencil' />} sx={{ borderRadius: 2 }} onClick={onEditMember}>
            Edit Profile
          </Button>
        </Box>
      </Box>

      {/* Top Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Orders</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
            <Typography variant='h5' fontWeight={800}>{totalOrders}</Typography>
            <i className='tabler-shopping-bag' style={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
          <Typography variant='caption' sx={{ color: 'success.main', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            <i className='tabler-trending-up' style={{ marginRight: 4 }} />
            +12% from last month
          </Typography>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Lead Source</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
            <Typography variant='h5' fontWeight={800}>{sourceName}</Typography>
            <i className='tabler-device-mobiles' style={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>Direct Referral Network</Typography>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Referrals</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
            <Typography variant='h5' fontWeight={800}>{totalReferrals}</Typography>
            <i className='tabler-share' style={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>Top 5% Influencer Tier</Typography>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Commission</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
            <Typography variant='h5' fontWeight={800} sx={{ color: 'text.primary' }}>{totalReferralCommission.toLocaleString('vi-VN')}₫</Typography>
            <i className='tabler-cash' style={{ color: 'text.secondary', fontSize: 20 }} />
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>Available for withdrawal</Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={detailTab}
        onChange={(_, v) => setDetailTab(v)}
        sx={{
          mb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: 'primary.main' },
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 14, minWidth: 100, color: 'text.secondary' },
          '& .Mui-selected': { color: 'text.primary' }
        }}
      >
        <Tab value='purchased' label='Purchases' disableRipple />
        <Tab value='referrals' label='Referrals' disableRipple />
        <Tab value='bonus-progress' label='Bonus Progress' disableRipple />
        <Tab value='commission' label='Commission' disableRipple />
        <Tab value='staff-notes' label='Staff Notes' disableRipple />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ minHeight: 400 }}>
        {detailTab === 'purchased' && (
          <CustomerPurchasesTab
            orders={orders}
            totalOrders={totalOrders}
            totalSpend={totalSpend}
            page={ordersPage}
            totalPages={ordersTotalPages}
            setPage={setOrdersPage}
          />
        )}

        {detailTab === 'referrals' && (
          <CustomerReferralsTab
            referralOrders={referralOrders}
            totalCommission={totalReferralCommission}
            totalReferrals={totalReferrals}
            page={referralsPage}
            totalPages={referralsTotalPages}
            setPage={setReferralsPage}
          />
        )}

        {detailTab === 'bonus-progress' && (
          <CustomerBonusProgressTab
            bonusProgress={bonusProgress}
            txHistory={txHistory}
            selectedMemberId={selectedMember.id ?? null}
            setPayNoteDialog={setPayNoteDialog}
            isPayingBonus={isPayingBonus}
            cancelTx={cancelTx}
            isCanceling={isCanceling}
          />
        )}

        {detailTab === 'commission' && (
          <CustomerCommissionTab memberId={selectedMember.id ?? null} />
        )}

        {detailTab === 'staff-notes' && (
          <Box sx={{ p: 4, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography variant='subtitle1' fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='tabler-note' /> Private Staff Notes
            </Typography>
            {selectedMember.customerNote ? (
              <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}>
                  {selectedMember.customerNote}
                </Typography>
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                No private notes recorded for this member.
              </Typography>
            )}
          </Box>
        )}
      </Box>

    </Box>
  )
}

export default CustomerDetailPanel
