'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Box,
  Card,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { toast } from 'react-toastify'
import { useQuery } from '@tanstack/react-query'

import { getApiV1AccessControlPermissions } from '@/generated/core-api'
import type { ApiErrorResponse } from '@/generated/core-api'

const PAGE_SIZE = 20

const AccessPermissionsPage = () => {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const permissionsQuery = useQuery({
    queryKey: ['access-control', 'permissions', page, keyword],
    queryFn: () =>
      getApiV1AccessControlPermissions({
        page,
        pageSize: PAGE_SIZE,
        filter: keyword
          ? `code @contains('${keyword.replace(/'/g, "''")}') or name @contains('${keyword.replace(/'/g, "''")}') or resource @contains('${keyword.replace(/'/g, "''")}') or action @contains('${keyword.replace(/'/g, "''")}')`
          : undefined,
        sort: 'resource,action',
        view: 'detail'
      })
  })

  const permissions = permissionsQuery.data?.success ? (permissionsQuery.data.result?.items ?? []) : []
  const total = permissionsQuery.data?.success ? (permissionsQuery.data.result?.total ?? 0) : 0
  const totalPages = permissionsQuery.data?.success ? (permissionsQuery.data.result?.totalPages ?? 1) : 1

  const apiErrorMessage = useMemo(() => {
    if (!permissionsQuery.error) {
      return null
    }

    if (permissionsQuery.error instanceof Error) {
      return permissionsQuery.error.message
    }

    const apiError = permissionsQuery.error as ApiErrorResponse

    return apiError.errors?.[0]?.message || 'Failed to load permission catalog.'
  }, [permissionsQuery.error])

  useEffect(() => {
    if (permissionsQuery.isError) {
      toast.error(apiErrorMessage || 'Failed to load permission catalog.')
    }
  }, [permissionsQuery.isError, apiErrorMessage])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 3 }}>
        <Typography variant='h5' fontWeight={700}>
          Permission Catalog
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Browse all permission codes in core access control.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
          <TextField
            size='small'
            fullWidth
            label='Search permission'
            placeholder='Code, name, resource, action'
            value={keyword}
            onChange={e => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
        </Stack>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map(permission => (
                <TableRow key={permission.id} hover>
                  <TableCell>
                    <Typography variant='body2' fontWeight={700}>
                      {permission.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{permission.name}</TableCell>
                  <TableCell>{permission.resource}</TableCell>
                  <TableCell>{permission.action}</TableCell>
                  <TableCell>{permission.description || '-'}</TableCell>
                </TableRow>
              ))}

              {permissions.length === 0 && !permissionsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                      No permissions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 3, py: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing {permissions.length} of {total} permissions
          </Typography>
          <Pagination
            page={page}
            count={Math.max(1, totalPages)}
            onChange={(_, value) => setPage(value)}
            color='primary'
          />
        </Stack>
      </Card>
    </Box>
  )
}

export default AccessPermissionsPage
