'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import {
  Grid,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material'
import { toast } from 'react-toastify'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'

import RoleList from './RoleList'
import RolePermissionsDetail from './RolePermissionsDetail'
import RoleDialog from './RoleDialog'
import {
  deleteApiV1AccessControlRolesId,
  getApiV1AccessControlRoles
} from '@/generated/core-api'
import type { AccessRoleDto, ApiErrorResponse } from '@/generated/core-api'

const AccessRolesPage = () => {
  const panelMinHeight = 'calc(100vh - 220px)'

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const urlRoleId = searchParams.get('id')

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(urlRoleId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AccessRoleDto | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<AccessRoleDto | null>(null)

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([name, value]) => {
        if (value) {
          params.set(name, value)
        } else {
          params.delete(name)
        }
      })

      return params.toString()
    },
    [searchParams]
  )

  useEffect(() => {
    if (urlRoleId !== selectedRoleId) {
      setSelectedRoleId(urlRoleId)
    }
  }, [urlRoleId, selectedRoleId])

  const {
    data: infiniteRolesData,
    isLoading: isLoadingRoles,
    isError: isRolesError,
    error: rolesError,
    fetchNextPage: fetchNextRolesPage,
    hasNextPage: hasNextRolesPage,
    isFetchingNextPage: isFetchingNextRolesPage,
    refetch: refetchRoles
  } = useInfiniteQuery({
    queryKey: ['access-control', 'roles'],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      return getApiV1AccessControlRoles({
        page: pageParam as number,
        pageSize: 20,
        view: 'detail'
      })
    },
    getNextPageParam: lastPage => {
      if (lastPage.success && lastPage.result?.hasNextPage) {
        return (lastPage.result.page || 0) + 1
      }

      return undefined
    }
  })

  const apiErrorMessage = useMemo(() => {
    if (!rolesError) {
      return null
    }

    if (rolesError instanceof Error) {
      return rolesError.message
    }

    const apiError = rolesError as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load access roles'
  }, [rolesError])

  useEffect(() => {
    if (isRolesError) {
      toast.error(apiErrorMessage || 'Failed to load access roles')
    }
  }, [isRolesError, apiErrorMessage])

  const roles = useMemo(() => {
    return infiniteRolesData?.pages.flatMap(page => (page.success && page.result?.items ? page.result.items : [])) || []
  }, [infiniteRolesData])

  const selectedRole = useMemo(() => {
    return roles.find(role => role.id === selectedRoleId) || null
  }, [roles, selectedRoleId])

  const { mutate: deleteRole, isPending: isDeleting } = useMutation({
    mutationFn: async (roleId: string) => deleteApiV1AccessControlRolesId(roleId),
    onSuccess: data => {
      if (data.success) {
        toast.success('Role deleted successfully')
        refetchRoles()
        setIsDeleteDialogOpen(false)
        setRoleToDelete(null)

        if (selectedRoleId === roleToDelete?.id) {
          handleSelectRole(null)
        }
      } else if (data.errors) {
        data.errors.forEach(e => toast.error(e.message))
      } else {
        toast.error(data.message || 'Failed to delete role')
      }
    }
  })

  const handleSelectRole = (id: string | null) => {
    const queryString = createQueryString({ id })

    router.push(`${pathname}?${queryString}`, { scroll: false })
    setSelectedRoleId(id)
  }

  const handleAddClick = () => {
    setEditingRole(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = (role: AccessRoleDto) => {
    setEditingRole(role)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (role: AccessRoleDto) => {
    setRoleToDelete(role)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (roleToDelete?.id) {
      deleteRole(roleToDelete.id)
    }
  }

  const handleDialogSuccess = () => {
    refetchRoles()
  }

  return (
    <Box sx={{ p: { xs: 0, md: 2 }, height: '100%' }}>
      <Grid container spacing={4} sx={{ height: '100%', minHeight: panelMinHeight, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ height: { xs: 'auto', md: panelMinHeight } }}>
          <RoleList
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={id => handleSelectRole(id)}
            onAddClick={handleAddClick}
            onEditRole={handleEditClick}
            onDeleteRole={handleDeleteClick}
            isLoading={isLoadingRoles}
            fetchNextPage={fetchNextRolesPage}
            hasNextPage={!!hasNextRolesPage}
            isFetchingNextPage={isFetchingNextRolesPage}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{ height: { xs: 'auto', md: panelMinHeight } }}>
          <RolePermissionsDetail
            key={selectedRole?.id || 'empty-role'}
            role={selectedRole}
            isLoading={!selectedRole && isLoadingRoles}
            onPermissionsUpdated={refetchRoles}
          />
        </Grid>
      </Grid>

      <RoleDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        role={editingRole}
        onSuccess={handleDialogSuccess}
      />

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete role &quot;{roleToDelete?.name}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color='error' variant='contained' disabled={isDeleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccessRolesPage
