'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Pagination,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme
} from '@mui/material'
import { toast } from 'react-toastify'

import {
  useDeleteApiV1AccessControlUsersIdRoles,
  useGetApiV1AccessControlRoles,
  useGetApiV1AccessControlUsers,
  usePostApiV1AccessControlUsersIdRoles
} from '@/generated/core-api'
import type { AccessRoleDto, AccessUserDto, ApiErrorResponse } from '@/generated/core-api'
import { dsl } from '@/utils/dslQueryBuilder'

const PAGE_SIZE = 12

type RoleLike = string | { id?: string; name?: string | null; normalizedName?: string | null }

const getRoleLabel = (role: RoleLike) => {
  if (typeof role === 'string') {
    return role
  }

  return role.name || role.normalizedName || role.id || 'Role'
}

const getApiEnvelopeErrorMessage = (response: unknown, fallback: string) => {
  if (!response || typeof response !== 'object') {
    return fallback
  }

  const candidate = response as { errors?: Array<{ message?: string }> }

  return candidate.errors?.[0]?.message || fallback
}

const AccessUsersPage = () => {
  const theme = useTheme()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<AccessUserDto | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false)

  const filter = useMemo(() => {
    let builder = dsl()
    const value = submittedKeyword.trim()

    if (value) {
      builder = builder.group(g => {
        g.string('fullName')
          .contains(value)
          .or()
          .string('userName')
          .contains(value)
          .or()
          .string('email')
          .contains(value)
      })
    }

    const compiled = builder.build()

    return compiled === '' ? undefined : compiled
  }, [submittedKeyword])

  const usersQuery = useGetApiV1AccessControlUsers({
    page,
    pageSize: PAGE_SIZE,
    sort: '-createdAt',
    filter
  })

  const users = useMemo(() => {
    const data = usersQuery.data

    if (!data?.success || !data.result?.items) {
      return []
    }

    return data.result.items
  }, [usersQuery.data])

  const rolesQuery = useGetApiV1AccessControlRoles({
    page: 1,
    pageSize: 100,
    sort: 'name'
  })

  const roles = useMemo(() => {
    if (!rolesQuery.data?.success || !rolesQuery.data.result?.items) {
      return []
    }

    return rolesQuery.data.result.items
  }, [rolesQuery.data])

  const { mutateAsync: addRolesToUser } = usePostApiV1AccessControlUsersIdRoles()
  const { mutateAsync: removeRolesFromUser } = useDeleteApiV1AccessControlUsersIdRoles()

  const total = usersQuery.data?.success ? (usersQuery.data.result?.total ?? 0) : 0
  const totalPages = usersQuery.data?.success ? (usersQuery.data.result?.totalPages ?? 1) : 1

  const apiErrorMessage = useMemo(() => {
    if (!usersQuery.error) {
      return null
    }

    if (usersQuery.error instanceof Error) {
      return usersQuery.error.message
    }

    const apiError = usersQuery.error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load users from core service.'
  }, [usersQuery.error])

  useEffect(() => {
    if (usersQuery.isError) {
      toast.error(apiErrorMessage || 'Failed to load users from core service.')
    }
  }, [usersQuery.isError, apiErrorMessage])

  const handleOpenRoleDialog = (user: AccessUserDto) => {
    setSelectedUserForRoles(user)
    setSelectedRoleIds((user.roles || []).map(role => role.id).filter((id): id is string => Boolean(id)))
    setIsRoleDialogOpen(true)
  }

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds(prev => (prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]))
  }

  const handleSaveUserRoles = async () => {
    if (!selectedUserForRoles?.id) {
      return
    }

    setIsUpdatingRoles(true)

    try {
      const initialRoleIds = (selectedUserForRoles.roles || [])
        .map(role => role.id)
        .filter((id): id is string => Boolean(id))

      const roleIdsToAdd = selectedRoleIds.filter(roleId => !initialRoleIds.includes(roleId))
      const roleIdsToRemove = initialRoleIds.filter(roleId => !selectedRoleIds.includes(roleId))

      const pendingRequests: Promise<unknown>[] = []

      if (roleIdsToAdd.length > 0) {
        pendingRequests.push(addRolesToUser({ id: selectedUserForRoles.id, data: roleIdsToAdd }))
      }

      if (roleIdsToRemove.length > 0) {
        pendingRequests.push(removeRolesFromUser({ id: selectedUserForRoles.id, data: roleIdsToRemove }))
      }

      const mutationResults = await Promise.all(pendingRequests)

      const firstFailure = mutationResults.find(result => {
        if (!result || typeof result !== 'object') {
          return true
        }

        const response = result as { success?: boolean }

        return response.success !== true
      })

      if (firstFailure) {
        throw new Error(getApiEnvelopeErrorMessage(firstFailure, 'Failed to update user roles.'))
      }

      toast.success('User roles updated successfully.')
      setIsRoleDialogOpen(false)
      setSelectedUserForRoles(null)
      await usersQuery.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user roles.'

      toast.error(message)
    } finally {
      setIsUpdatingRoles(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 3 }}>
        <Typography variant='h5' fontWeight={700}>
          User Management
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          View identity users and their roles in one place.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2.5 }} alignItems={{ md: 'center' }}>
          <TextField
            size='small'
            fullWidth
            label='Search user'
            placeholder='Name, username, or email'
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setSubmittedKeyword(keyword)
                setPage(1)
              }
            }}
          />

          <Button
            variant='contained'
            onClick={() => {
              setSubmittedKeyword(keyword)
              setPage(1)
            }}
            sx={{ height: 40, minWidth: 100 }}
          >
            Search
          </Button>
        </Stack>
      </Card>

      <Card sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Roles</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user: AccessUserDto) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant='body2' fontWeight={700}>
                        {user.fullName || user.userName || 'Unknown user'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        @{user.userName || 'unknown'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.5} useFlexGap flexWrap='wrap'>
                      {(user.roles && user.roles.length > 0 ? (user.roles as RoleLike[]) : ['No role' as const]).map(
                        role => {
                          const label = getRoleLabel(role)

                          return <Chip key={`${user.id}-${label}`} size='small' label={label} variant='outlined' />
                        }
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{user.createdAt ? user.createdAt.slice(0, 10) : '-'}</TableCell>
                  <TableCell>
                    <IconButton color='primary' onClick={() => handleOpenRoleDialog(user)} title='Manage roles'>
                      <i className='tabler-shield-lock' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && !usersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                      No users found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 3, py: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing {users.length} of {total} users
          </Typography>
          <Pagination
            page={page}
            count={Math.max(1, totalPages)}
            onChange={(_, value) => setPage(value)}
            color='primary'
          />
        </Stack>
      </Card>

      <Dialog
        open={isRoleDialogOpen}
        onClose={isUpdatingRoles ? undefined : () => setIsRoleDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle component='div'>
          <Typography variant='h5'>Assign Roles</Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage roles for {selectedUserForRoles?.fullName || selectedUserForRoles?.userName || 'this user'}.
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {rolesQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {roles.map((role: AccessRoleDto) => {
                const roleId = role.id

                if (!roleId) {
                  return null
                }

                const isSelected = selectedRoleIds.includes(roleId)

                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={roleId}>
                    <Card
                      onClick={() => handleToggleRole(roleId)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected
                          ? alpha(theme.palette.primary.main, 0.08)
                          : alpha(theme.palette.background.default, 0.35),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <Stack direction='row' spacing={1.5} alignItems='center'>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.secondary.main, 0.06)
                          }}
                        >
                          <i className={role.icon || 'tabler-shield'} style={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                          <Typography variant='subtitle2' fontWeight={600}>
                            {role.name || 'Unknown role'}
                          </Typography>
                          {role.isSystem && (
                            <Typography variant='caption' color='info.main'>
                              System Core
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Switch
                        checked={isSelected}
                        onChange={() => handleToggleRole(roleId)}
                        onClick={event => event.stopPropagation()}
                        size='small'
                      />
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, mt: 2 }}>
          <Button
            variant='outlined'
            color='secondary'
            disabled={isUpdatingRoles}
            onClick={() => setIsRoleDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={isUpdatingRoles || rolesQuery.isLoading}
            onClick={handleSaveUserRoles}
            startIcon={
              isUpdatingRoles ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-device-floppy' />
            }
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccessUsersPage
