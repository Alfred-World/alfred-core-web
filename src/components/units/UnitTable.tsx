'use client'

import { useCallback, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { useQueryClient } from '@tanstack/react-query'

import {
  getGetApiV1UnitsCountsByCategoryQueryKey,
  getGetApiV1UnitsCountsByStatusQueryKey,
  getGetApiV1UnitsQueryKey,
  useDeleteApiV1UnitsId,
  useGetApiV1Units
} from '@generated/api'
import type { UnitDto } from '@generated/api'
import { UNIT_CATEGORY_META, UNIT_CATEGORY_TABS, UNIT_STATUS_META } from '@/constants/unitType'
import type { UnitCategoryValue } from '@/constants/unitType'
import { dsl } from '@/utils/dslQueryBuilder'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UnitTableProps {
  categoryFilter: UnitCategoryValue | ''
  onCategoryFilterChange: (cat: UnitCategoryValue | '') => void
  onCreateNew: () => void
  onEdit: (id: string) => void
}

// ─── Component ─────────────────────────────────────────────────────────────────
const UnitTable = ({ categoryFilter, onCategoryFilterChange, onCreateNew, onEdit }: UnitTableProps) => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [menuUnitId, setMenuUnitId] = useState<string | null>(null)

  // Build DSL filter
  const filter = useMemo(() => {
    const builder = dsl()

    if (categoryFilter) {
      builder.string('category').eq(categoryFilter)
    }

    if (search.trim()) {
      if (builder.parts.length > 0) builder.and()
      builder.group(g => {
        g.string('name').contains(search.trim())
        g.or()
        g.string('code').contains(search.trim())
      })
    }

    return builder.build() || undefined
  }, [categoryFilter, search])

  // Fetch units
  const { data, isLoading } = useGetApiV1Units({
    page: page + 1,
    pageSize: rowsPerPage,
    filter,
    sort: '-createdAt'
  })

  const units = data?.result?.items ?? []
  const totalCount = data?.result?.total ?? 0

  // Delete mutation
  const { mutate: deleteUnit } = useDeleteApiV1UnitsId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsCountsByStatusQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetApiV1UnitsCountsByCategoryQueryKey() })
      }
    }
  })

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, unitId: string) => {
    setAnchorEl(event.currentTarget)
    setMenuUnitId(unitId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setMenuUnitId(null)
  }

  const handleDelete = useCallback(() => {
    if (menuUnitId) {
      deleteUnit({ id: menuUnitId })
    }

    handleMenuClose()
  }, [menuUnitId, deleteUnit])

  const handleEdit = useCallback(() => {
    if (menuUnitId) {
      onEdit(menuUnitId)
    }

    handleMenuClose()
  }, [menuUnitId, onEdit])

  // Category tab counts from data is done via the parent's countsData
  // We keep it simple here — tabs switch the filter

  return (
    <Card>
      {/* Category Tabs */}
      <Tabs
        value={categoryFilter}
        onChange={(_, v) => {
          onCategoryFilterChange(v)
          setPage(0)
        }}
        variant='scrollable'
        scrollButtons='auto'
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        {UNIT_CATEGORY_TABS.map(tab => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className={tab.icon} style={{ fontSize: 18 }} />
                {tab.label}
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
        <TextField
          size='small'
          placeholder='Search units...'
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(0)
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search' style={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              ...(search && {
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton size='small' onClick={() => setSearch('')}>
                      <i className='tabler-x' style={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                )
              })
            }
          }}
          sx={{ width: 280 }}
        />
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={onCreateNew}>
          Add Unit
        </Button>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Unit Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Base Unit</TableCell>
              <TableCell align='right'>Rate</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align='center' width={60}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton variant='text' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : units.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} align='center' sx={{ py: 8 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-ruler-off' style={{ fontSize: 40, opacity: 0.3 }} />
                          <Typography color='text.secondary'>No units found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                : units.map((unit: UnitDto) => (
                    <UnitRow
                      key={unit.id}
                      unit={unit}
                      onMenuOpen={handleMenuOpen}
                    />
                  ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component='div'
        count={totalCount}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <i className='tabler-edit' style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <i className='tabler-trash' style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  )
}

// ─── Unit Row ──────────────────────────────────────────────────────────────────
interface UnitRowProps {
  unit: UnitDto
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, unitId: string) => void
}

const UnitRow = ({ unit, onMenuOpen }: UnitRowProps) => {
  const catMeta = unit.category ? UNIT_CATEGORY_META[unit.category] : null
  const statusMeta = unit.status ? UNIT_STATUS_META[unit.status] : null

  return (
    <TableRow hover sx={{ cursor: 'pointer' }}>
      {/* Unit Name + Category */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {catMeta && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: `${catMeta.color}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <i className={catMeta.icon} style={{ fontSize: 18, color: catMeta.color }} />
            </Box>
          )}
          <Box>
            <Typography variant='body2' fontWeight={600}>
              {unit.name}
              {unit.symbol && (
                <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 0.5 }}>
                  ({unit.symbol})
                </Typography>
              )}
            </Typography>
            {catMeta && (
              <Typography variant='caption' color='text.disabled'>
                {catMeta.label}
              </Typography>
            )}
          </Box>
        </Box>
      </TableCell>

      {/* Code */}
      <TableCell>
        <Typography variant='body2' fontFamily='monospace' fontWeight={500}>
          {unit.code}
        </Typography>
      </TableCell>

      {/* Base Unit */}
      <TableCell>
        {unit.baseUnitName ? (
          <Chip label={unit.baseUnitName} size='small' variant='outlined' />
        ) : (
          <Chip label='BASE' size='small' color='primary' variant='filled' />
        )}
      </TableCell>

      {/* Rate */}
      <TableCell align='right'>
        <Typography variant='body2' fontFamily='monospace'>
          {unit.baseUnitId ? (unit.conversionRate ?? 1).toFixed(2) : '—'}
        </Typography>
      </TableCell>

      {/* Status */}
      <TableCell>
        {statusMeta && (
          <Chip
            label={statusMeta.label}
            size='small'
            color={statusMeta.color}
            variant='tonal'
          />
        )}
      </TableCell>

      {/* Actions */}
      <TableCell align='center'>
        <Tooltip title='Actions'>
          <IconButton size='small' onClick={e => onMenuOpen(e, unit.id!)}>
            <i className='tabler-dots-vertical' style={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}

export default UnitTable
