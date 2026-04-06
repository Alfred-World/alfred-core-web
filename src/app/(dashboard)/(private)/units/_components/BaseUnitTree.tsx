'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { useGetApiV1UnitsTree } from '@generated/core-api'
import type { UnitTreeNodeDto, UnitCategory } from '@generated/core-api'
import { UNIT_CATEGORY_META } from '@/constants/unitType'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BaseUnitTreeProps {
  categoryFilter?: UnitCategory
}

// ─── Component ─────────────────────────────────────────────────────────────────
const BaseUnitTree = ({ categoryFilter }: BaseUnitTreeProps) => {
  const { data, isLoading } = useGetApiV1UnitsTree(categoryFilter ? { category: categoryFilter } : undefined)

  const trees = data?.result ?? []

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <i className='tabler-binary-tree' style={{ fontSize: 20, color: '#00BFA5' }} />
        <Typography variant='subtitle1' fontWeight={600}>
          Base Unit Tree
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : trees.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant='body2' color='text.disabled'>
            No base units found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trees.map(node => (
            <TreeGroup key={node.id} node={node} />
          ))}
        </Box>
      )}
    </Card>
  )
}

// ─── Tree Group (one base unit + its derived units) ────────────────────────────
const TreeGroup = ({ node }: { node: UnitTreeNodeDto }) => {
  const catMeta = node.category ? UNIT_CATEGORY_META[node.category] : null

  return (
    <Box>
      {/* Base unit header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          borderRadius: 1.5,
          bgcolor: 'action.hover'
        }}
      >
        {catMeta && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: `${catMeta.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className={catMeta.icon} style={{ fontSize: 14, color: catMeta.color }} />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='body2' fontWeight={600} noWrap>
            {node.name}
            {node.symbol && (
              <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
                ({node.symbol})
              </Typography>
            )}
          </Typography>
        </Box>
        <Chip label='BASE' size='small' color='primary' variant='filled' sx={{ height: 20, fontSize: 11 }} />
      </Box>

      {/* Derived units */}
      {node.derivedUnits && node.derivedUnits.length > 0 && (
        <Box sx={{ ml: 2, mt: 0.5, borderLeft: 2, borderColor: 'divider' }}>
          {node.derivedUnits.map(derived => (
            <DerivedUnitItem key={derived.id} node={derived} depth={1} />
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Derived Unit Item (recursive) ─────────────────────────────────────────────
const DerivedUnitItem = ({ node, depth }: { node: UnitTreeNodeDto; depth: number }) => (
  <>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pl: 2,
        py: 0.75,
        '&:hover': { bgcolor: 'action.hover', borderRadius: 1 }
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: 'text.disabled',
          flexShrink: 0
        }}
      />
      <Typography variant='body2' noWrap sx={{ flex: 1 }}>
        {node.name}
      </Typography>
      <Typography variant='caption' color='primary' fontFamily='monospace' fontWeight={600} sx={{ flexShrink: 0 }}>
        x{' '}
        {(node.conversionRate ?? 1)
          .toFixed(node.conversionRate && node.conversionRate % 1 !== 0 ? 4 : 0)
          .replace(/\.?0+$/, '')}
      </Typography>
    </Box>

    {/* Recursive children */}
    {node.derivedUnits && node.derivedUnits.length > 0 && (
      <Box sx={{ ml: 2, borderLeft: 2, borderColor: 'divider' }}>
        {node.derivedUnits.map(child => (
          <DerivedUnitItem key={child.id} node={child} depth={depth + 1} />
        ))}
      </Box>
    )}
  </>
)

export default BaseUnitTree
