'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { customFetch } from '@/libs/custom-instance'

import {
  getGetApiV1AccountSalesMembersQueryKey,
  useGetApiV1AccountSalesMembers,
  useGetApiV1AccountSalesOrders,
  useGetApiV1AccountSalesMembersSearch,
  usePostApiV1AccountSalesMembers,
  useGetApiV1AccountSalesBonusProgressSoldByMemberId,
  useGetApiV1AccountSalesBonusTransactionsSoldByMemberId,
  usePostApiV1AccountSalesBonusTransactionsTransactionIdPay,
  usePostApiV1AccountSalesBonusTransactionsTransactionIdCancel,
  usePostApiV1AccountSalesBonusTransactionsSettleTier
} from '@/generated/core-api'
import type {
  ApiErrorResponse,
  CreateMemberRequest,
  MemberDto,
  MemberSource
} from '@/generated/core-api'
import { dsl } from '@/utils/dslQueryBuilder'

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  const apiError = error as ApiErrorResponse

  return apiError.errors?.[0]?.message || fallback
}

import CustomerListSidebar from './CustomerListSidebar'
import CustomerDetailPanel from './CustomerDetailPanel'

type DetailTab = 'purchased' | 'referrals' | 'bonus-progress' | 'commission' | 'staff-notes'
const VALID_TABS: DetailTab[] = ['purchased', 'referrals', 'bonus-progress', 'commission', 'staff-notes']

const AccountSalesCustomers = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedMemberId = searchParams.get('member')

  const detailTab = (VALID_TABS.includes(searchParams.get('tab') as DetailTab)
    ? (searchParams.get('tab') as DetailTab)
    : 'purchased')

  const setSelectedMemberId = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (id) {
      params.set('member', id)
    } else {
      params.delete('member')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const setDetailTab = useCallback((tab: DetailTab) => {
    const params = new URLSearchParams(searchParams.toString())

    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState<CreateMemberRequest>({ source: 'Zalo' })
  const [openEdit, setOpenEdit] = useState(false)
  const [editForm, setEditForm] = useState<CreateMemberRequest>({ source: 'Zalo' })
  const [ordersPage, setOrdersPage] = useState(1)
  const [referralsPage, setReferralsPage] = useState(1)

  const [payNoteDialog, setPayNoteDialog] = useState<{
    open: boolean

    /** null = use settle-tier flow (no prior transaction) */
    transactionId: string | null
    soldByMemberId?: string
    tierId?: string
    note: string
  } | null>(null)

  const filter = useMemo(() => {
    if (!search.trim()) {
      return undefined
    }

    return dsl().group(g => {
      g.string('displayName').contains(search.trim()).or().string('sourceId').contains(search.trim())
    }).build()
  }, [search])

  const membersQuery = useGetApiV1AccountSalesMembers({ page, pageSize: 12, filter, sort: '-createdAt' })

  const searchQuery = useGetApiV1AccountSalesMembersSearch(
    { keyword: search, take: 20 },
    { query: { enabled: search.trim().length >= 2 } }
  )

  const isSearching = search.trim().length >= 2

  const members = useMemo(() => {
    if (isSearching) {
      return searchQuery.data?.result ?? []
    }

    
return membersQuery.data?.result?.items ?? []
  }, [membersQuery.data?.result?.items, searchQuery.data?.result, isSearching])

  useEffect(() => {
    if (!selectedMemberId && members.length > 0 && members[0].id) {
      setSelectedMemberId(members[0].id)
    }

  // setSelectedMemberId is stable (useCallback), safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, selectedMemberId])

  // Reset tab pagination when selected member changes
  useEffect(() => {
    setOrdersPage(1)
    setReferralsPage(1)
  }, [selectedMemberId])

  const memberInList = members.find(x => x.id === selectedMemberId) ?? null

  type MemberDetailResult = {
    success: boolean
    result?: {
      member: MemberDto
      stats: { totalSpend: number; totalReferralCommission: number }
    }
  }

  const memberDetailQuery = useQuery<MemberDetailResult>({
    queryKey: ['account-sales', 'members', selectedMemberId, 'detail'],
    queryFn: () => customFetch<MemberDetailResult>(`/api/v1/account-sales/members/${selectedMemberId}/detail`),
    enabled: !!selectedMemberId
  })

  const selectedMember = memberInList ?? memberDetailQuery.data?.result?.member ?? null
  const memberTotalSpend = memberDetailQuery.data?.result?.stats.totalSpend ?? 0
  const totalReferralCommission = memberDetailQuery.data?.result?.stats.totalReferralCommission ?? 0

  // Always-enabled count queries — load stats when member is opened, regardless of active tab
  const orderCountQuery = useGetApiV1AccountSalesOrders(
    {
      page: 1,
      pageSize: 1,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('memberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId } }
  )

  const referralCountQuery = useGetApiV1AccountSalesOrders(
    {
      page: 1,
      pageSize: 1,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('referrerMemberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId } }
  )

  // Tab-gated full list queries — only load when on the respective tab
  const ordersQuery = useGetApiV1AccountSalesOrders(
    {
      page: ordersPage,
      pageSize: 10,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('memberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId && detailTab === 'purchased' } }
  )

  const referralOrdersQuery = useGetApiV1AccountSalesOrders(
    {
      page: referralsPage,
      pageSize: 10,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('referrerMemberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId && detailTab === 'referrals' } }
  )

  const bonusProgressQuery = useGetApiV1AccountSalesBonusProgressSoldByMemberId(
    selectedMemberId!,
    { query: { enabled: !!selectedMemberId && detailTab === 'bonus-progress' } }
  )

  const bonusTxQuery = useGetApiV1AccountSalesBonusTransactionsSoldByMemberId(
    selectedMemberId!,
    { query: { enabled: !!selectedMemberId && detailTab === 'bonus-progress' } }
  )

  const payBonus = usePostApiV1AccountSalesBonusTransactionsTransactionIdPay()
  const cancelBonus = usePostApiV1AccountSalesBonusTransactionsTransactionIdCancel()
  const settleTier = usePostApiV1AccountSalesBonusTransactionsSettleTier()

  const createMember = usePostApiV1AccountSalesMembers({
    mutation: {
      onSuccess: async response => {
        if (!response.success) {
          toast.error(response.errors?.[0]?.message || 'Failed to create member')
          
return
        }

        setOpenCreate(false)
        setForm({ source: 'Zalo' })
        await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesMembersQueryKey() })
      }
    }
  })

  const selectedOrders = ordersQuery.data?.result?.items ?? []
  const totalOrders = orderCountQuery.data?.result?.total ?? 0
  const ordersTotalPages = ordersQuery.data?.result?.totalPages ?? 1

  const referralOrders = useMemo(
    () => referralOrdersQuery.data?.result?.items ?? [],
    [referralOrdersQuery.data?.result?.items]
  )

  const totalReferrals = referralCountQuery.data?.result?.total ?? 0
  const referralsTotalPages = referralOrdersQuery.data?.result?.totalPages ?? 1

  const customersApiErrorMessage = useMemo(() => {
    const error = membersQuery.error || searchQuery.error || ordersQuery.error || referralOrdersQuery.error

    
return getApiErrorMessage(error, 'Unable to load customer data from API.')
  }, [membersQuery.error, searchQuery.error, ordersQuery.error, referralOrdersQuery.error])

  useEffect(() => {
    if (membersQuery.isError || searchQuery.isError || ordersQuery.isError || referralOrdersQuery.isError) {
      toast.error(customersApiErrorMessage)
    }
  }, [membersQuery.isError, searchQuery.isError, ordersQuery.isError, referralOrdersQuery.isError, customersApiErrorMessage])

  const cancelTx = async (txId: string) => {
    try {
      await cancelBonus.mutateAsync({ transactionId: txId, data: {} })
      await bonusTxQuery.refetch()
      toast.success('Bonus transaction cancelled')
    } catch {
      toast.error('Failed to cancel bonus transaction')
    }
  }

  const handleEditMember = () => {
    if (!selectedMember) return
    setEditForm({
      displayName: selectedMember.displayName ?? '',
      source: selectedMember.source ?? 'Zalo',
      sourceId: selectedMember.sourceId ?? '',
      customerNote: selectedMember.customerNote ?? ''
    })
    setOpenEdit(true)
  }

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', lg: '350px 1fr' }, 
      gap: { xs: 3, lg: 4 }, 
      minHeight: '80vh' 
    }}>
      {/* Sidebar List */}
      <Card sx={{ height: { xs: '60vh', lg: 'auto' }, overflowY: 'hidden', p: { xs: 2.5, md: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <CustomerListSidebar
          members={members}
          totalMembers={membersQuery.data?.result?.total ?? 0}
          totalPages={membersQuery.data?.result?.totalPages ?? 1}
          page={page}
          setPage={setPage}
          search={search}
          setSearch={setSearch}
          selectedMemberId={selectedMemberId}
          setSelectedMemberId={setSelectedMemberId}
          isSearching={isSearching}
          setOpenCreate={setOpenCreate}
        />
      </Card>

      {/* Detail Panel */}
      <Card sx={{ overflowX: 'hidden', p: { xs: 2.5, md: 3 }, height: '100%', borderRadius: 3 }}>
        <CustomerDetailPanel
          selectedMember={selectedMember}
          orders={selectedOrders}
          totalOrders={totalOrders}
          ordersPage={ordersPage}
          ordersTotalPages={ordersTotalPages}
          setOrdersPage={setOrdersPage}
          referralOrders={referralOrders}
          totalReferrals={totalReferrals}
          referralsPage={referralsPage}
          referralsTotalPages={referralsTotalPages}
          setReferralsPage={setReferralsPage}
          totalSpend={memberTotalSpend}
          totalReferralCommission={totalReferralCommission}
          bonusProgress={bonusProgressQuery.data?.result}
          txHistory={bonusTxQuery.data?.result ?? []}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          setPayNoteDialog={setPayNoteDialog}
          isPayingBonus={payBonus.isPending || settleTier.isPending}
          cancelTx={cancelTx}
          isCanceling={cancelBonus.isPending}
          onEditMember={handleEditMember}
        />
      </Card>

      <Dialog open={!!payNoteDialog?.open} onClose={() => setPayNoteDialog(null)} fullWidth maxWidth='xs'>
        <DialogTitle>Pay Bonus</DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            label='Note (optional)'
            multiline
            minRows={2}
            value={payNoteDialog?.note ?? ''}
            onChange={e => setPayNoteDialog(prev => prev ? { ...prev, note: e.target.value } : null)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setPayNoteDialog(null)}>Cancel</Button>
          <Button
            variant='contained'
            color='success'
            disabled={payBonus.isPending || settleTier.isPending}
            onClick={async () => {
              if (!payNoteDialog) return

              try {
                if (payNoteDialog.transactionId) {
                  await payBonus.mutateAsync({ transactionId: payNoteDialog.transactionId, data: { note: payNoteDialog.note || null } })
                } else {
                  await settleTier.mutateAsync({
                    data: {
                      soldByMemberId: payNoteDialog.soldByMemberId!,
                      tierId: payNoteDialog.tierId!,
                      note: payNoteDialog.note || null
                    }
                  })
                }

                await Promise.all([bonusProgressQuery.refetch(), bonusTxQuery.refetch()])
                toast.success('Bonus marked as paid')
                setPayNoteDialog(null)
              } catch {
                toast.error('Failed to mark bonus as paid')
              }
            }}
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Create Member</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <TextField
              label='Display name'
              value={form.displayName || ''}
              onChange={event => setForm(prev => ({ ...prev, displayName: event.target.value }))}
            />
            <TextField
              select
              label='Source'
              value={form.source || 'Zalo'}
              onChange={event => setForm(prev => ({ ...prev, source: event.target.value as MemberSource }))}
            >
              <MenuItem value='Zalo'>Zalo</MenuItem>
              <MenuItem value='Facebook'>Facebook</MenuItem>
              <MenuItem value='Tiktok'>TikTok</MenuItem>
              <MenuItem value='Other'>Other</MenuItem>
            </TextField>
            <TextField
              label='Source ID (phone/link)'
              value={form.sourceId || ''}
              onChange={event => setForm(prev => ({ ...prev, sourceId: event.target.value }))}
            />
            <TextField
              label='Customer note'
              multiline
              minRows={3}
              value={form.customerNote || ''}
              onChange={event => setForm(prev => ({ ...prev, customerNote: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={createMember.isPending}
            onClick={async () => {
              await createMember.mutateAsync({ data: form })
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog — mutation usePutApiV1AccountSalesMembersId available after: restart alfred-core + pnpm generate */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            <TextField
              label='Display name'
              value={editForm.displayName || ''}
              onChange={event => setEditForm(prev => ({ ...prev, displayName: event.target.value }))}
            />
            <TextField
              select
              label='Source'
              value={editForm.source || 'Zalo'}
              onChange={event => setEditForm(prev => ({ ...prev, source: event.target.value as MemberSource }))}
            >
              <MenuItem value='Zalo'>Zalo</MenuItem>
              <MenuItem value='Facebook'>Facebook</MenuItem>
              <MenuItem value='Tiktok'>TikTok</MenuItem>
              <MenuItem value='Other'>Other</MenuItem>
            </TextField>
            <TextField
              label='Source ID (phone/link)'
              value={editForm.sourceId || ''}
              onChange={event => setEditForm(prev => ({ ...prev, sourceId: event.target.value }))}
            />
            <TextField
              label='Customer note'
              multiline
              minRows={3}
              value={editForm.customerNote || ''}
              onChange={event => setEditForm(prev => ({ ...prev, customerNote: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 1.5 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={async () => {
              // TODO: wire after restart alfred-core + pnpm generate:
              // const updateMember = usePutApiV1AccountSalesMembersId()
              // await updateMember.mutateAsync({ id: selectedMemberId!, data: editForm })
              // await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesMembersQueryKey() })
              toast.info('Restart alfred-core service then run pnpm generate to activate edit.')
              setOpenEdit(false)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccountSalesCustomers

