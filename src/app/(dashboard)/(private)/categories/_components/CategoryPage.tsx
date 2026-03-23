'use client'

import { useCallback, useEffect, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'

import CategoryTree from './CategoryTree'
import CategoryEditor from './CategoryEditor'

// ─── Component ─────────────────────────────────────────────────────────────────
const CategoryPage = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read initial state from URL
  const urlId = searchParams.get('id')
  const [selectedId, setSelectedId] = useState<string | null>(urlId)
  const [mode, setMode] = useState<'empty' | 'new' | 'edit'>(urlId ? 'edit' : 'empty')

  // Sync URL → state when searchParams change externally
  useEffect(() => {
    const id = searchParams.get('id')

    if (id && id !== selectedId) {
      setSelectedId(id)
      setMode('edit')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Helper to update URL without full navigation
  const updateUrl = useCallback(
    (id?: string | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (id) {
        params.set('id', id)
      } else {
        params.delete('id')
      }

      const qs = params.toString()

      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id) {
        setSelectedId(id)
        setMode('edit')
        updateUrl(id)
      }
    },
    [updateUrl]
  )

  const handleCreateNew = useCallback(() => {
    setSelectedId(null)
    setMode('new')
    updateUrl(null)
  }, [updateUrl])

  const handleSavedNew = useCallback(
    (id?: string) => {
      setSelectedId(id ?? null)
      setMode('edit')
      updateUrl(id)
    },
    [updateUrl]
  )

  const handleSavedEdit = useCallback(() => {
    // keep current selection, just refresh tree via query invalidation (handled in editor)
  }, [])

  return (
    <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 140px)' }}>
      {/* Tree Sidebar */}
      <Card
        sx={{
          width: 300,
          minWidth: 300,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <CategoryTree
          selectedId={selectedId ?? undefined}
          onSelect={handleSelect}
          onCreateNew={handleCreateNew}
        />
      </Card>

      {/* Main Content */}
      <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {mode === 'empty' ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'action.selected',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className='tabler-category-2' style={{ fontSize: 36, opacity: 0.4 }} />
            </Box>
            <Typography variant='h6' color='text.secondary' fontWeight={500}>
              Select a category
            </Typography>
            <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 340, textAlign: 'center' }}>
              Choose a category from the tree on the left to edit its details and form schema,
              or click <strong>+</strong> to create a new one.
            </Typography>
          </Box>
        ) : mode === 'new' ? (
          <CategoryEditor key='new' onSaved={handleSavedNew} />
        ) : (
          <CategoryEditor key={selectedId} categoryId={selectedId!} onSaved={handleSavedEdit} />
        )}
      </Box>
    </Box>
  )
}

export default CategoryPage
