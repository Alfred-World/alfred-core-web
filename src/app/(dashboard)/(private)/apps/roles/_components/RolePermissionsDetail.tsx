'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

import { useInfiniteQuery, useMutation } from '@tanstack/react-query'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import { alpha, useTheme } from '@mui/material/styles'

import { toast } from 'react-toastify'

import {
  deleteApiV1AccessControlRolesIdPermissions,
  getApiV1AccessControlPermissions,
  postApiV1AccessControlRolesIdPermissions
} from '@/generated/core-api'
import type { AccessPermissionDto, AccessPermissionDtoApiPagedResponse, AccessRoleDto } from '@/generated/core-api'

interface RolePermissionsDetailProps {
  role: AccessRoleDto | null
  isLoading?: boolean
  onPermissionsUpdated?: () => void
}

const getItemsFromPage = (page: AccessPermissionDtoApiPagedResponse) => {
  if (page.success && page.result?.items) {
    return page.result.items
  }

  return []
}

const RolePermissionsDetail = ({ role, isLoading, onPermissionsUpdated }: RolePermissionsDetailProps) => {
  const theme = useTheme()
  const themeColor = theme.palette.primary.main
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAll
  } = useInfiniteQuery({
    queryKey: ['access-control', 'permissions'],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      return getApiV1AccessControlPermissions({
        page: pageParam as number,
        pageSize: 30,
        sort: 'resource,action'
      })
    },
    getNextPageParam: lastPage => {
      if (lastPage.success && lastPage.result?.hasNextPage) {
        return (lastPage.result.page || 0) + 1
      }

      return undefined
    }
  })

  const allPermissions = useMemo(() => {
    return infiniteData?.pages.flatMap(getItemsFromPage) || []
  }, [infiniteData])

  const [permissionSearch, setPermissionSearch] = useState('')

  const filteredPermissions = useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase()

    if (!keyword) {
      return allPermissions
    }

    return allPermissions.filter(permission => {
      const searchableFields = [
        permission.name,
        permission.description,
        permission.resource,
        permission.action,
        permission.code
      ]

      return searchableFields.some(field => (field || '').toLowerCase().includes(keyword))
    })
  }, [allPermissions, permissionSearch])

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [initialPermissionIds, setInitialPermissionIds] = useState<string[]>([])

  useEffect(() => {
    const ids = (role?.permissions || [])
      .map(p => p.id)
      .filter((id): id is string => !!id)

    setSelectedPermissionIds(ids)
    setInitialPermissionIds(ids)
  }, [role?.permissions, role?.id])

  const [isFakeLoading, setIsFakeLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFakeLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [role?.id])

  const { mutate: syncPermissions, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!role?.id) {
        return
      }

      const toAdd = selectedPermissionIds.filter(id => !initialPermissionIds.includes(id))
      const toRemove = initialPermissionIds.filter(id => !selectedPermissionIds.includes(id))

      if (toAdd.length > 0) {
        const addResult = await postApiV1AccessControlRolesIdPermissions(role.id, toAdd)

        if (!addResult.success) {
          throw new Error(addResult.errors?.[0]?.message || addResult.message || 'Failed to add permissions')
        }
      }

      if (toRemove.length > 0) {
        const removeResult = await deleteApiV1AccessControlRolesIdPermissions(role.id, toRemove)

        if (!removeResult.success) {
          throw new Error(removeResult.errors?.[0]?.message || removeResult.message || 'Failed to remove permissions')
        }
      }
    },
    onSuccess: () => {
      toast.success('Permissions updated successfully')
      setInitialPermissionIds(selectedPermissionIds)
      onPermissionsUpdated?.()
    },
    onError: error => {
      toast.error(error.message || 'Failed to update permissions')
    }
  })

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]

      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasNextPage || isFetchingNextPage) {
        return
      }

      const element = event.currentTarget
      const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight

      if (distanceToBottom < 160) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: scrollContainerRef.current,
      rootMargin: '100px',
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

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, AccessPermissionDto[]> = {}

    filteredPermissions.forEach(p => {
      const resource = p.resource || 'Other'

      if (!groups[resource]) {
        groups[resource] = []
      }

      groups[resource].push(p)
    })

    return groups
  }, [filteredPermissions])

  const handleToggle = (id: string) => {
    setSelectedPermissionIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleSelectAllGroup = (permsInGroup: AccessPermissionDto[]) => {
    const idsToSelect = permsInGroup.map(p => p.id).filter((id): id is string => !!id)

    setSelectedPermissionIds(prev => {
      const newIds = idsToSelect.filter(id => !prev.includes(id))

      return [...prev, ...newIds]
    })
  }

  const handleRevokeAllGroup = (permsInGroup: AccessPermissionDto[]) => {
    const idsToRevoke = permsInGroup.map(p => p.id).filter((id): id is string => !!id)

    setSelectedPermissionIds(prev => prev.filter(id => !idsToRevoke.includes(id)))
  }

  const handleSave = () => {
    if (!role?.id) {
      return
    }

    syncPermissions()
  }

  const handleReset = () => {
    setSelectedPermissionIds(initialPermissionIds)
  }

  if (isLoading || isLoadingAll || isFakeLoading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    )
  }

  if (!role) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 10 }}>
        <Typography color='text.secondary'>Select a role to manage permissions</Typography>
      </Card>
    )
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              <i className='tabler-shield-check' style={{ fontSize: '1.5rem' }} />
            </Box>
            <Box>
              <Typography variant='h5' fontWeight={600}>
                {role.name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Manage access and system module permissions for this role.
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', height: 24 }}>
            <Typography variant='caption' color='text.secondary'>
              {selectedPermissionIds.length} selected
            </Typography>
            <Button
              variant='text'
              color='secondary'
              onClick={handleReset}
              disabled={isUpdating || !!role.isImmutable}
              sx={{ minWidth: 'auto', p: 0 }}
            >
              Reset
            </Button>
            <Button
              variant='contained'
              size='small'
              startIcon={isUpdating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              onClick={handleSave}
              disabled={isUpdating || !!role.isImmutable}
              sx={{
                bgcolor: role.isImmutable ? 'action.disabledBackground' : 'info.main',
                '&:hover': { bgcolor: role.isImmutable ? 'action.disabledBackground' : 'info.dark' },
                boxShadow: role.isImmutable ? 'none' : `0 0 10px ${alpha(theme.palette.info.main, 0.3)}`
              }}
            >
              Save
            </Button>
          </Box>
        }
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
          placeholder='Search permissions...'
          value={permissionSearch}
          onChange={event => setPermissionSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search text-secondary' />
                </InputAdornment>
              ),
              endAdornment: permissionSearch && (
                <InputAdornment position='end'>
                  <IconButton size='small' edge='end' onClick={() => setPermissionSearch('')} sx={{ color: 'text.secondary' }}>
                    <i className='tabler-x' style={{ fontSize: '1.1rem' }} />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <Divider />

      <CardContent
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
          p: 4,
          height: '100%'
        }}
      >
        {Object.keys(groupedPermissions).length === 0 ? (
          <Box sx={{ py: 12, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography color='text.secondary'>No permissions found for this search.</Typography>
          </Box>
        ) : (
          <Grid container spacing={6}>
            {Object.entries(groupedPermissions).map(([resource, perms]) => {
              return (
                <Grid size={{ xs: 12 }} key={resource}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 3,
                      position: 'sticky',
                      top: -24,
                      zIndex: 10,
                      bgcolor: 'background.paper',
                      py: 2,
                      borderBottom: '1px dashed',
                      borderColor: 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <i className='tabler-lock-open' style={{ color: theme.palette.info.main }} />
                      <Typography variant='subtitle1' fontWeight={600} color='text.primary'>
                        {resource} Management
                      </Typography>
                    </Box>

                    {!role.isImmutable && (
                      <Box sx={{ display: 'flex', gap: 4 }}>
                        <Typography
                          variant='caption'
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            fontWeight: 600,
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleSelectAllGroup(perms)}
                        >
                          Select All
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{
                            cursor: 'pointer',
                            color: 'error.main',
                            fontWeight: 600,
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleRevokeAllGroup(perms)}
                        >
                          Revoke All
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Grid container spacing={3}>
                    {perms.map(perm => {
                      if (!perm.id) {
                        return null
                      }

                      const permissionId = perm.id

                      const isSelected = selectedPermissionIds.includes(permissionId)

                      return (
                        <Grid size={{ xs: 12 }} key={permissionId}>
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 1,
                              bgcolor: isSelected ? alpha(themeColor, 0.04) : alpha(theme.palette.background.default, 0.4),
                              border: '1px solid',
                              borderColor: isSelected ? alpha(themeColor, 0.5) : 'divider',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: alpha(themeColor, 0.8),
                                bgcolor: alpha(themeColor, 0.08)
                              }
                            }}
                          >
                            <Box>
                              <Typography variant='body2' fontWeight={600}>
                                {perm.name}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {perm.description || 'Allow access to this permission'}
                              </Typography>
                            </Box>
                            <Switch checked={isSelected} onChange={() => handleToggle(permissionId)} size='small' disabled={!!role.isImmutable} />
                          </Box>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Grid>
              )
            })}
          </Grid>
        )}

        <Box
          ref={loadMoreRef}
          sx={{
            mt: 4,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: '40px',
            py: 2,
            opacity: hasNextPage ? 1 : 0
          }}
        >
          {isFetchingNextPage && <CircularProgress size={24} />}
        </Box>
      </CardContent>
    </Card>
  )
}

export default RolePermissionsDetail
