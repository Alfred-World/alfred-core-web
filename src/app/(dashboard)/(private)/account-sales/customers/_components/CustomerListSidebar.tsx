'use client'

import { alpha } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { MemberDto } from '@/generated/core-api'

import { getInitials } from '@/utils/getInitials'

export const channelColor: Record<string, string> = {
  Zalo: '#10b981', // green / Zalo blue-green
  Facebook: '#2563eb', // fb blue
  Tiktok: '#f97316', // TikTok orange/black equivalent
  Other: '#64748b' // gray
}

export type SidebarProps = {
  members: MemberDto[]
  totalMembers: number
  totalPages: number
  page: number
  setPage: (p: number) => void
  search: string
  setSearch: (s: string) => void
  selectedMemberId: string | null
  setSelectedMemberId: (id: string | null) => void
  isSearching: boolean
  setOpenCreate: (open: boolean) => void
}

const CustomerListSidebar = (props: SidebarProps) => {
  const {
    members,
    totalMembers,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    selectedMemberId,
    setSelectedMemberId,
    isSearching,
    setOpenCreate
  } = props

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='h6' fontWeight={700}>
            Members
          </Typography>
          <Box sx={{ px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant='caption' fontWeight={800}>
              {totalMembers.toLocaleString()}
            </Typography>
          </Box>
        </Box>
        <IconButton size='small' sx={{ bgcolor: 'action.hover' }} onClick={() => setOpenCreate(true)}>
          <i className='tabler-plus' style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <TextField
        fullWidth
        size='small'
        placeholder='Filter list...'
        value={search}
        onChange={event => {
          setSearch(event.target.value)
          setPage(1)
        }}
        sx={{ mb: 2.5 }}
        slotProps={{
          input: {
            startAdornment: <i className='tabler-filter' style={{ fontSize: 16, marginInlineEnd: 8, opacity: 0.55 }} />,
            sx: { borderRadius: 1.5, bgcolor: 'action.hover', '& fieldset': { display: 'none' } }
          }
        }}
      />

      <Stack spacing={0.5} sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {members.map(member => {
          const isSelected = member.id === selectedMemberId
          const source = (member.source as string) ?? 'Other'
          const sourceHex = channelColor[source] || channelColor.Other

          // Randomize active status for visual flair since API doesn't provide it yet
          const isActive = parseInt(member.id?.slice(0, 2) || '0', 16) % 2 === 0

          return (
            <Box
              key={member.id}
              onClick={() => setSelectedMemberId(member.id ?? null)}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: isSelected ? alpha('#8a2be2', 0.1) : 'transparent', // Light purple shade for selection mimicking the design
                border: isSelected ? `1px solid ${alpha('#8a2be2', 0.3)}` : '1px solid transparent',
                '&:hover': {
                  bgcolor: isSelected ? alpha('#8a2be2', 0.15) : 'action.hover'
                }
              }}
            >
              <Badge
                overlap='circular'
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant='dot'
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: isActive ? '#10b981' : '#64748b',
                    color: isActive ? '#10b981' : '#64748b',
                    boxShadow: t => `0 0 0 2px ${t.palette.background.paper}`,
                    '&::after': isActive
                      ? {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          animation: 'ripple 1.2s infinite ease-in-out',
                          border: '1px solid currentColor',
                          content: '""'
                        }
                      : {}
                  },
                  '@keyframes ripple': {
                    '0%': { transform: 'scale(.8)', opacity: 1 },
                    '100%': { transform: 'scale(2.4)', opacity: 0 }
                  }
                }}
              >
                <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                  {getInitials(member.displayName || 'U')}
                </Avatar>
              </Badge>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant='body2'
                  fontWeight={700}
                  noWrap
                  sx={{ color: isSelected ? 'primary.main' : 'text.primary' }}
                >
                  {member.displayName || 'Unnamed member'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: alpha(sourceHex, 0.15),
                      color: sourceHex,
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}
                  >
                    {source}
                  </Box>
                  <Typography variant='caption' sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {isActive ? 'Active now' : 'Idle 15m ago'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )
        })}
        {members.length === 0 && (
          <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
            No members found.
          </Typography>
        )}
      </Stack>

      {!isSearching && totalPages > 1 && (
        <Box sx={{ pt: 2, mt: 1, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            size='small'
            color='primary'
            page={page}
            count={totalPages}
            onChange={(_, value) => setPage(value)}
            siblingCount={0}
          />
        </Box>
      )}
    </Box>
  )
}

export default CustomerListSidebar
