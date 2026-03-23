'use client'

import { useEffect, useMemo, useState } from 'react'

import { alpha } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  getGetApiV1AccountSalesMembersQueryKey,
  useGetApiV1AccountSalesMembers,
  useGetApiV1AccountSalesOrders,
  useGetApiV1AccountSalesMembersSearch,
  usePostApiV1AccountSalesMembers
} from '@/generated/core-api'
import type { ApiErrorResponse, CreateMemberRequest, MemberSource } from '@/generated/core-api'
import { dsl } from '@/utils/dslQueryBuilder'
import { getInitials } from '@/utils/getInitials'

const channelColor: Record<string, string> = {
  Zalo: '#10b981',
  Facebook: '#2563eb',
  Tiktok: '#f97316',
  Other: '#64748b'
}

type OrderCodeAware = {
  orderCode?: string | null
  id?: string
}

const getOrderCodeDisplay = (order: OrderCodeAware) => {
  return order.orderCode || order.id?.slice(0, 10)
}

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

const AccountSalesCustomers = () => {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState<CreateMemberRequest>({ source: 'Zalo' })
  const [detailTab, setDetailTab] = useState<'purchased' | 'referrals'>('purchased')

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

  const members = useMemo(() => {
    if (search.trim().length >= 2) {
      return searchQuery.data?.result ?? []
    }

    return membersQuery.data?.result?.items ?? []
  }, [membersQuery.data?.result?.items, searchQuery.data?.result, search])

  useEffect(() => {
    if (!selectedMemberId && members.length > 0 && members[0].id) {
      setSelectedMemberId(members[0].id)
    }
  }, [members, selectedMemberId])

  const selectedMember = useMemo(
    () => members.find(x => x.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  )

  const ordersQuery = useGetApiV1AccountSalesOrders(
    {
      page: 1,
      pageSize: 12,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('memberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId } }
  )

  const referralOrdersQuery = useGetApiV1AccountSalesOrders(
    {
      page: 1,
      pageSize: 20,
      sort: '-purchaseDate',
      filter: selectedMemberId ? dsl().string('referrerMemberId').eq(selectedMemberId).build() : undefined,
      view: 'list'
    },
    { query: { enabled: !!selectedMemberId } }
  )

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

  const referralOrders = useMemo(
    () => referralOrdersQuery.data?.result?.items ?? [],
    [referralOrdersQuery.data?.result?.items]
  )

  const totalReferralCommission = useMemo(
    () => referralOrders.reduce((sum, o) => sum + (o.referralCommissionAmountSnapshot ?? 0), 0),
    [referralOrders]
  )

  const customersApiErrorMessage = useMemo(() => {
    const error = membersQuery.error || searchQuery.error || ordersQuery.error || referralOrdersQuery.error

    return getApiErrorMessage(error, 'Unable to load customer data from API.')
  }, [membersQuery.error, searchQuery.error, ordersQuery.error, referralOrdersQuery.error])

  useEffect(() => {
    if (membersQuery.isError || searchQuery.isError || ordersQuery.isError || referralOrdersQuery.isError) {
      toast.error(customersApiErrorMessage)
    }
  }, [membersQuery.isError, searchQuery.isError, ordersQuery.isError, referralOrdersQuery.isError, customersApiErrorMessage])

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.9fr 1fr' }, gap: 2.5 }}>
      <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, gap: 2 }}>
          <Box>
            <Typography variant='h4' fontWeight={800}>Customer Directory</Typography>
            <Typography variant='body2' color='text.secondary'>Search and track members from Zalo, Facebook and TikTok.</Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-user-plus' />} onClick={() => setOpenCreate(true)}>
            Add New Member
          </Button>
        </Box>

        <TextField
          fullWidth
          size='small'
          placeholder='Quick find members by name, phone, or ID...'
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            setPage(1)
          }}
          sx={{ mb: 2.5 }}
          slotProps={{
            input: {
              startAdornment: <i className='tabler-search' style={{ fontSize: 16, marginInlineEnd: 8, opacity: 0.55 }} />
            }
          }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map(member => {
                const isSelected = member.id === selectedMemberId
                const source = member.source ?? 'Other'
                const sourceHex = channelColor[source] ?? channelColor.Other

                return (
                  <TableRow
                    key={member.id}
                    hover
                    onClick={() => setSelectedMemberId(member.id ?? null)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? alpha('#2563eb', 0.06) : 'transparent'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
                          {getInitials(member.displayName || 'U')}
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight={700}>{member.displayName || 'Unnamed member'}</Typography>
                          <Typography variant='caption' color='text.secondary'>ID: {member.id?.slice(0, 8)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={source}
                        sx={{
                          bgcolor: alpha(sourceHex, 0.16),
                          color: sourceHex,
                          fontWeight: 700,
                          border: `1px solid ${alpha(sourceHex, 0.25)}`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{member.sourceId || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>{member.createdAt?.slice(0, 10)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size='small' color='primary' label='Active' />
                    </TableCell>
                  </TableRow>
                )
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>No members found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {search.trim().length < 2 && (
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mt: 2 }}>
            <Typography variant='body2' color='text.secondary'>
              Showing {members.length} of {membersQuery.data?.result?.total ?? 0} members
            </Typography>
            <Pagination
              color='primary'
              page={page}
              count={membersQuery.data?.result?.totalPages ?? 1}
              onChange={(_, value) => setPage(value)}
            />
          </Stack>
        )}
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'common.white' }}>
            <Typography variant='h5' fontWeight={800}>{selectedMember?.displayName || 'Select member'}</Typography>
            <Typography variant='body2' sx={{ color: alpha('#fff', 0.85) }}>{selectedMember?.sourceId || 'No source ID'}</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2, mb: 2 }}>
              <Card sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary'>Orders</Typography>
                <Typography variant='h6' fontWeight={800}>{ordersQuery.data?.result?.total ?? selectedOrders.length}</Typography>
              </Card>
              <Card sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary'>Source</Typography>
                <Typography variant='h6' fontWeight={800}>{selectedMember?.source || '-'}</Typography>
              </Card>
              <Card sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary'>Referrals</Typography>
                <Typography variant='h6' fontWeight={800}>{referralOrdersQuery.data?.result?.total ?? referralOrders.length}</Typography>
              </Card>
              <Card sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary'>Total Commission</Typography>
                <Typography variant='h6' fontWeight={800} sx={{ fontSize: '0.95rem' }}>
                  {totalReferralCommission.toLocaleString('vi-VN')} ₫
                </Typography>
              </Card>
            </Box>

            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: 13 } }}
            >
              <Tab value='purchased' label='Purchases' />
              <Tab value='referrals' label={`Referrals (${referralOrders.length})`} />
            </Tabs>

            {detailTab === 'purchased' && (
              <Stack spacing={1}>
                {selectedOrders.slice(0, 8).map(order => (
                  <Box key={order.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant='body2' fontWeight={700}>{order.productName}</Typography>
                      <Chip size='small' label={order.status} color={order.status === 'Active' ? 'primary' : 'default'} />
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      {getOrderCodeDisplay(order)} · {order.productVariantNameSnapshot} · {order.unitPriceSnapshot?.toLocaleString('vi-VN')} ₫
                    </Typography>
                    <br />
                    <Typography variant='caption' color='text.secondary'>
                      Warranty: {order.warrantyExpiry?.slice(0, 10)}
                    </Typography>
                  </Box>
                ))}
                {selectedOrders.length === 0 && (
                  <Typography variant='body2' color='text.secondary'>No orders for selected member.</Typography>
                )}
              </Stack>
            )}

            {detailTab === 'referrals' && (
              <Stack spacing={1}>
                {referralOrders.map(order => (
                  <Box key={order.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant='body2' fontWeight={700}>{order.productName}</Typography>
                      <Tooltip title='Referral commission'>
                        <Chip
                          size='small'
                          color='success'
                          variant='outlined'
                          label={`+${(order.referralCommissionAmountSnapshot ?? 0).toLocaleString('vi-VN')} ₫`}
                        />
                      </Tooltip>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      {getOrderCodeDisplay(order)} · {order.memberDisplayName || 'Unknown buyer'}
                    </Typography>
                    <br />
                    <Typography variant='caption' color='text.secondary'>
                      {(order.referralCommissionPercentSnapshot ?? 0)}% · {order.purchaseDate?.slice(0, 10)}
                    </Typography>
                  </Box>
                ))}
                {referralOrders.length === 0 && (
                  <Typography variant='body2' color='text.secondary'>No referral orders yet.</Typography>
                )}
              </Stack>
            )}
            <Box sx={{ mt: 2 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 0.6 }}>Staff Notes</Typography>
              <Typography variant='body2' color='text.secondary'>
                {selectedMember?.customerNote || 'No private notes for this member.'}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

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
    </Box>
  )
}

export default AccountSalesCustomers
