'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import { useQueryClient } from '@tanstack/react-query'

import {
  getApiV1CategoriesParentIdChildren,
  useGetApiV1CategoriesCountsByType,
  useGetApiV1CategoriesTree
} from '@generated/api'
import type { CategoryTreeNodeDto } from '@generated/api'
import { CATEGORY_TYPE_TABS, TYPE_DOT_COLORS } from '@/constants/categoryType'
import type { CategoryTypeValue } from '@/constants/categoryType'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CategoryTreeProps {
  selectedId?: string
  onSelect: (id: string | null) => void
  onCreateNew: () => void
}

interface TreeNode {
  id: string
  label: string
  icon?: string | null
  type?: string | null
  hasChildren: boolean
  childrenLoaded: boolean
  children: TreeNode[]
}

// ─── Convert API nodes to tree nodes ───────────────────────────────────────────
const toTreeNodes = (nodes: CategoryTreeNodeDto[]): TreeNode[] =>
  nodes.map(n => ({
    id: n.id!,
    label: n.name ?? '',
    icon: n.icon,
    type: n.type,
    hasChildren: n.hasChildren ?? false,
    childrenLoaded: false,
    children: []
  }))

// ─── Filter tree by search (recursive) ────────────────────────────────────────
const filterTree = (nodes: TreeNode[], term: string): TreeNode[] =>
  nodes.reduce<TreeNode[]>((acc, node) => {
    const childMatches = node.children.length ? filterTree(node.children, term) : []
    const selfMatches = node.label.toLowerCase().includes(term)

    if (selfMatches || childMatches.length > 0) {
      acc.push({ ...node, children: childMatches.length > 0 ? childMatches : node.children })
    }

    return acc
  }, [])

// ─── Collect all IDs for expand-all on search ──────────────────────────────────
const collectAllIds = (nodes: TreeNode[]): string[] =>
  nodes.flatMap(n => [n.id, ...(n.children.length ? collectAllIds(n.children) : [])])

// ─── Main Component ────────────────────────────────────────────────────────────
const TREE_PAGE_SIZE = 20

const CategoryTree = ({ selectedId, onSelect, onCreateNew }: CategoryTreeProps) => {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<CategoryTypeValue | ''>('')
  const [search, setSearch] = useState('')
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [accumulatedRoots, setAccumulatedRoots] = useState<CategoryTreeNodeDto[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  // Category counts by type
  const { data: countsData } = useGetApiV1CategoriesCountsByType()

  const countsByType = useMemo(() => {
    const map: Record<string, number> = {}
    let total = 0

    for (const item of countsData?.result ?? []) {
      if (item.type) {
        map[item.type] = item.count ?? 0
        total += item.count ?? 0
      }
    }

    map[''] = total

    return map
  }, [countsData])

  // Paginated root nodes
  const { data, isLoading } = useGetApiV1CategoriesTree(
    { ...(typeFilter ? { type: typeFilter } : {}), page, pageSize: TREE_PAGE_SIZE }
  )

  const totalCount = data?.result?.total ?? 0
  const hasMore = (data?.result?.items?.length ?? 0) > 0 && accumulatedRoots.length < totalCount

  // Accumulate pages
  useEffect(() => {
    if (!data?.result?.items) return

    if (page === 1) {
      setAccumulatedRoots(data.result.items)
    } else {
      setAccumulatedRoots(prev => {
        const existingIds = new Set(prev.map(n => n.id))
        const newItems = data.result!.items!.filter(n => !existingIds.has(n.id))

        return [...prev, ...newItems]
      })
    }

    setLoadingMore(false)
  }, [data, page])

  // Maintain a local tree state with lazily loaded children
  const [childrenMap, setChildrenMap] = useState<Record<string, TreeNode[]>>({})

  // Build combined tree from roots + loaded children
  const rootNodes: TreeNode[] = useMemo(() => {
    const roots = toTreeNodes(accumulatedRoots)

    // Hydrate loaded children recursively
    const hydrate = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map(n => {
        const loaded = childrenMap[n.id]

        if (loaded) {
          return { ...n, childrenLoaded: true, children: hydrate(loaded) }
        }

        return n
      })

    return hydrate(roots)
  }, [accumulatedRoots, childrenMap])

  // Filtered tree + expanded items for search
  const { displayTree, searchExpandedIds } = useMemo(() => {
    if (!search) return { displayTree: rootNodes, searchExpandedIds: null }
    const filtered = filterTree(rootNodes, search.toLowerCase())

    return { displayTree: filtered, searchExpandedIds: collectAllIds(filtered) }
  }, [rootNodes, search])

  // Load children on expand
  const handleExpandedItemsChange = useCallback(
    async (_event: React.SyntheticEvent | null, itemIds: string[]) => {
      // Find newly expanded ids
      const newIds = itemIds.filter(id => !expandedItems.includes(id))

      setExpandedItems(itemIds)

      // Load children for newly expanded nodes
      for (const nodeId of newIds) {
        // Find the node in tree
        const findNode = (nodes: TreeNode[]): TreeNode | null => {
          for (const n of nodes) {
            if (n.id === nodeId) return n
            const found = findNode(n.children)

            if (found) return found
          }

          return null
        }

        const node = findNode(rootNodes)

        if (node && node.hasChildren && !node.childrenLoaded && !childrenMap[nodeId]) {
          setLoadingIds(prev => new Set(prev).add(nodeId))

          try {
            const response = await queryClient.fetchQuery({
              queryKey: ['categories', 'children', nodeId],
              queryFn: () => getApiV1CategoriesParentIdChildren(nodeId),
              staleTime: 30_000
            })

            const children = toTreeNodes(response?.result ?? [])

            setChildrenMap(prev => ({ ...prev, [nodeId]: children }))
          } finally {
            setLoadingIds(prev => {
              const next = new Set(prev)

              next.delete(nodeId)

              return next
            })
          }
        }
      }
    },
    [expandedItems, rootNodes, childrenMap, queryClient]
  )

  // Reset state when type filter changes
  const handleTypeChange = useCallback((_e: React.SyntheticEvent, v: string) => {
    setTypeFilter(v as CategoryTypeValue | '')
    setSearch('')
    setExpandedItems([])
    setChildrenMap({})
    setPage(1)
    setAccumulatedRoots([])
  }, [])

  // Render tree items recursively
  const renderTreeItems = useCallback(
    (nodes: TreeNode[]) =>
      nodes.map(node => (
        <TreeItem
          key={node.id}
          itemId={node.id}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25, minWidth: 0 }}>
              {node.icon && (
                <i className={node.icon} style={{ fontSize: 15, opacity: 0.7, flexShrink: 0 }} />
              )}
              <Typography variant='body2' noWrap sx={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                {node.label}
              </Typography>
              {loadingIds.has(node.id) && (
                <CircularProgress size={12} sx={{ flexShrink: 0 }} />
              )}
              {node.type && (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: TYPE_DOT_COLORS[node.type] ?? 'text.disabled',
                    flexShrink: 0
                  }}
                />
              )}
            </Box>
          }
        >
          {/* If has children but not loaded yet, render a placeholder so the expand icon shows */}
          {node.hasChildren && !node.childrenLoaded && !node.children.length ? (
            <TreeItem
              itemId={`${node.id}__placeholder`}
              label={
                <Typography variant='caption' color='text.disabled' sx={{ fontSize: 11 }}>
                  Loading...
                </Typography>
              }
              disabled
            />
          ) : (
            renderTreeItems(node.children)
          )}
        </TreeItem>
      )),
    [loadingIds]
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='overline' fontWeight={700} color='text.secondary' sx={{ letterSpacing: 1.2 }}>
            CATEGORIES
          </Typography>
          <Chip
            label={countsByType[''] ?? totalCount}
            size='small'
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              minWidth: 24,
              bgcolor: 'action.selected',
              color: 'text.secondary'
            }}
          />
        </Box>
        <Tooltip title='New category' arrow>
          <IconButton size='small' onClick={onCreateNew}>
            <i className='tabler-plus' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Type Tabs */}
      <Tabs
        value={typeFilter}
        onChange={handleTypeChange}
        variant='fullWidth'
        sx={{
          minHeight: 36,
          flexShrink: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: 36,
            py: 0,
            px: 1,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'none',
            minWidth: 0
          },
          '& .MuiTabs-indicator': {
            height: 2
          }
        }}
      >
        {CATEGORY_TYPE_TABS.map(tab => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <i className={tab.icon} style={{ fontSize: 13 }} />
                <span>{tab.label}</span>
                {(countsByType[tab.value] ?? 0) > 0 && (
                  <Chip
                    label={countsByType[tab.value]}
                    size='small'
                    sx={{
                      height: 16,
                      fontSize: 9,
                      fontWeight: 700,
                      minWidth: 20,
                      '& .MuiChip-label': { px: 0.5 },
                      bgcolor: typeFilter === tab.value ? 'primary.main' : 'action.selected',
                      color: typeFilter === tab.value ? 'primary.contrastText' : 'text.secondary'
                    }}
                  />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Search */}
      <Box sx={{ px: 1.5, py: 1.5, flexShrink: 0 }}>
        <TextField
          size='small'
          placeholder='Search...'
          fullWidth
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search' style={{ fontSize: 15, opacity: 0.4 }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment
                  position='end'
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSearch('')}
                >
                  <i className='tabler-x' style={{ fontSize: 14 }} />
                </InputAdornment>
              ) : undefined,
              sx: { fontSize: 13 }
            }
          }}
        />
      </Box>

      {/* Tree */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5, pb: 2 }}>
        {isLoading && page === 1 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant='caption' color='text.secondary'>
              Loading...
            </Typography>
          </Box>
        ) : displayTree.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant='caption' color='text.secondary'>
              {search ? 'No matches found' : 'No categories yet'}
            </Typography>
          </Box>
        ) : (
          <>
            <SimpleTreeView
              selectedItems={selectedId ?? null}
              onSelectedItemsChange={(_e, id) => onSelect(id)}
              expandedItems={searchExpandedIds ?? expandedItems}
              onExpandedItemsChange={search ? undefined : handleExpandedItemsChange}
              sx={{
                '& .MuiTreeItem-content': {
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  gap: 0.5
                },
                '& .MuiTreeItem-groupTransition': {
                  ml: 2,
                  pl: 1.5,
                  borderLeft: '1px dashed',
                  borderColor: 'divider'
                },
                '& .Mui-selected > .MuiTreeItem-content': {
                  bgcolor: 'primary.main !important',
                  color: 'primary.contrastText'
                },
                '& .Mui-selected > .MuiTreeItem-content .MuiTreeItem-iconContainer': {
                  color: 'primary.contrastText'
                }
              }}
            >
              {renderTreeItems(displayTree)}
            </SimpleTreeView>

            {/* Load more indicator */}
            {hasMore && !search && (
              <Box ref={observerRef} sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                <Button
                  size='small'
                  variant='text'
                  onClick={() => {
                    setLoadingMore(true)
                    setPage(prev => prev + 1)
                  }}
                  disabled={loadingMore}
                  startIcon={loadingMore ? <CircularProgress size={14} /> : undefined}
                  sx={{ fontSize: 12, textTransform: 'none' }}
                >
                  {loadingMore ? 'Loading...' : `Load more (${accumulatedRoots.length}/${totalCount})`}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default CategoryTree
