'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import {
  Box,
  Card,
  CardHeader,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  Chip,
  Skeleton,
  alpha,
  useTheme,
  IconButton,
  CircularProgress
} from '@mui/material'

import type { AccessRoleDto } from '@/generated/core-api'

interface RoleListProps {
  roles: AccessRoleDto[]
  selectedRoleId: string | null
  onSelectRole: (id: string | null) => void
  onAddClick: () => void
  onEditRole: (role: AccessRoleDto) => void
  onDeleteRole: (role: AccessRoleDto) => void
  isLoading?: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

const RoleList = ({
  roles,
  selectedRoleId,
  onSelectRole,
  onAddClick,
  onEditRole,
  onDeleteRole,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: RoleListProps) => {
  const [search, setSearch] = useState('')
  const theme = useTheme()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]

      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: scrollContainerRef.current,
      rootMargin: '50px',
      threshold: 0.1
    })

    const currentRef = loadMoreRef.current

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [handleObserver])

  const filteredRoles = roles.filter(role => role.name?.toLowerCase().includes(search.toLowerCase()))

  const getRoleIcon = (role: AccessRoleDto) => {
    if (role.icon) {
      return role.icon
    }

    return 'tabler-user'
  }

  const getAccessDescription = (roleName = '') => {
    const name = roleName.toLowerCase()

    if (name.includes('admin')) {
      return 'Full Access'
    }

    if (name.includes('editor')) {
      return 'Limited Access'
    }

    if (name.includes('support')) {
      return 'User Management'
    }

    return 'Read-only'
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex'
              }}
            >
              <i className='tabler-users' style={{ fontSize: '1.5rem' }} />
            </Box>
            <Typography variant='h5' fontWeight={600}>
              Roles
            </Typography>
          </Box>
        }
        action={<Chip label={`${roles.length} Total`} size='small' variant='tonal' color='secondary' sx={{ fontWeight: 500 }} />}
        sx={{
          p: 4,
          pb: 2,
          minHeight: 92,
          display: 'flex',
          alignItems: 'center',
          '& .MuiCardHeader-content': { overflow: 'hidden' },
          '& .MuiCardHeader-action': { mt: 0, alignSelf: 'center' }
        }}
      />

      <Divider />

      <Box sx={{ p: 4, pb: 2 }}>

        <TextField
          fullWidth
          size='small'
          placeholder='Search roles...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search text-secondary' />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position='end'>
                  <IconButton size='small' edge='end' onClick={() => setSearch('')} sx={{ color: 'text.secondary' }}>
                    <i className='tabler-x' style={{ fontSize: '1.1rem' }} />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <Divider />

      <Box
        ref={scrollContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 2,
          '&::-webkit-scrollbar': {
            width: 6
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.secondary.main, 0.2)
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: alpha(theme.palette.secondary.main, 0.4)
          }
        }}
      >
        {isLoading ? (
          <List>
            {[1, 2, 3, 4].map(i => (
              <Box key={i} sx={{ mb: 2 }}>
                <Skeleton variant='rounded' height={70} />
              </Box>
            ))}
          </List>
        ) : (
          <List component='nav' sx={{ p: 0 }}>
            {filteredRoles.map(role => {
              const isSelected = role.id === selectedRoleId
              const icon = getRoleIcon(role)
              const accessType = getAccessDescription(role.name || '')

              return (
                <ListItemButton
                  key={role.id}
                  selected={isSelected}
                  onClick={() => onSelectRole(role.id || null)}
                  sx={{
                    mb: 2,
                    borderRadius: 1,
                    p: 2,
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.16)
                      }
                    },
                    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow']),
                    '&:hover .actions': { opacity: 1 }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isSelected ? 'primary.main' : 'text.secondary',
                      bgcolor: isSelected
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.secondary.main, 0.05),
                      p: 1.5,
                      borderRadius: 1,
                      mr: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <i className={icon} style={{ fontSize: '1.25rem' }} />
                  </ListItemIcon>

                  <ListItemText
                    slotProps={{
                      primary: { component: 'div' },
                      secondary: { component: 'div' }
                    }}
                    primary={
                      <Typography
                        variant='body1'
                        fontWeight={isSelected ? 600 : 500}
                        color={isSelected ? 'primary.main' : 'text.primary'}
                      >
                        {role.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        <Typography variant='caption' color='text.secondary'>
                          {accessType}
                        </Typography>
                        {role.isSystem && (
                          <Chip label='System' size='small' variant='tonal' color='info' sx={{ height: 18, fontSize: '0.625rem' }} />
                        )}
                        {role.isImmutable && (
                          <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                            <i className='tabler-lock' style={{ fontSize: '0.875rem' }} />
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  <Box
                    className='actions'
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      opacity: isSelected ? 1 : 0,
                      transition: 'opacity 0.2s'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <IconButton size='small' color='primary' onClick={() => onEditRole(role)} disabled={!!role.isImmutable}>
                      <i className='tabler-edit' />
                    </IconButton>
                    <IconButton size='small' color='error' onClick={() => onDeleteRole(role)} disabled={!!role.isImmutable}>
                      <i className='tabler-trash' />
                    </IconButton>
                  </Box>
                </ListItemButton>
              )
            })}
          </List>
        )}

        <Box
          ref={loadMoreRef}
          sx={{
            py: 2,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            opacity: hasNextPage ? 1 : 0
          }}
        >
          {isFetchingNextPage && <CircularProgress size={24} />}
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 4 }}>
        <Button fullWidth variant='outlined' startIcon={<i className='tabler-plus' />} sx={{ py: 2, borderRadius: 1 }} onClick={onAddClick}>
          Add New Role
        </Button>
      </Box>
    </Card>
  )
}

export default RoleList
