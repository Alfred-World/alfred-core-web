'use client'

import { useEffect, useMemo, useState } from 'react'

import { alpha, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { keyframes } from '@mui/system'

import {
  getGetApiV1AccountSalesBonusTiersQueryKey,
  useGetApiV1AccountSalesBonusTiers,
  usePostApiV1AccountSalesBonusTiers,
  usePutApiV1AccountSalesBonusTiersTierId,
  useDeleteApiV1AccountSalesBonusTiersTierId,
  useGetApiV1AccountSalesOrdersRevenueBySeller
} from '@/generated/core-api'

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(192, 132, 252, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(192, 132, 252, 0); }
  100% { box-shadow: 0 0 0 0 rgba(192, 132, 252, 0); }
`

/* ── Tier management tab ─────────────────────────────────────────────── */

const TiersTab = () => {
  const theme = useTheme()
  const queryClient = useQueryClient()
  
  const tiersQuery = useGetApiV1AccountSalesBonusTiers()
  const sellerRevenueQuery = useGetApiV1AccountSalesOrdersRevenueBySeller()
  
  const originalTiers = useMemo(() => 
    [...(tiersQuery.data?.result ?? [])].sort((a, b) => (a.orderThreshold ?? 0) - (b.orderThreshold ?? 0)),
    [tiersQuery.data?.result]
  )

  type DraftTier = { id: string, orderThreshold: number, bonusAmount: number, isNew?: boolean, isDeleted?: boolean }
  const [drafts, setDrafts] = useState<DraftTier[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (tiersQuery.isSuccess) {
      setDrafts(originalTiers.map(t => ({ id: t.id!, orderThreshold: t.orderThreshold ?? 0, bonusAmount: t.bonusAmount ?? 0 })))
    }
  }, [tiersQuery.isSuccess, originalTiers])

  const createMutation = usePostApiV1AccountSalesBonusTiers()
  const updateMutation = usePutApiV1AccountSalesBonusTiersTierId()
  const deleteMutation = useDeleteApiV1AccountSalesBonusTiersTierId()

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const activeDrafts = drafts.filter(d => !d.isDeleted)
      
      // Update/Create
      for (const draft of activeDrafts) {
        if (draft.isNew) {
          await createMutation.mutateAsync({ data: { orderThreshold: draft.orderThreshold, bonusAmount: draft.bonusAmount } })
        } else {
          const orig = originalTiers.find(t => t.id === draft.id)

          if (orig && (orig.orderThreshold !== draft.orderThreshold || orig.bonusAmount !== draft.bonusAmount)) {
            await updateMutation.mutateAsync({ tierId: draft.id, data: { orderThreshold: draft.orderThreshold, bonusAmount: draft.bonusAmount, isActive: true } })
          }
        }
      }

      // Delete
      const deletedIds = drafts.filter(d => d.isDeleted && !d.isNew).map(d => d.id)

      for (const id of deletedIds) {
        await deleteMutation.mutateAsync({ tierId: id })
      }

      await queryClient.invalidateQueries({ queryKey: getGetApiV1AccountSalesBonusTiersQueryKey() })
      toast.success('Bonus campaign updated and launched!')
      
      // Reset drafts to sync with new DB state (this will be overridden by the useEffect above once query refetches)
      setDrafts(activeDrafts.map(d => ({ ...d, isNew: false, isDeleted: false })))
    } catch (_err: unknown) {
      toast.error('Failed to save some tiers.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevert = () => {
    setDrafts(originalTiers.map(t => ({ id: t.id!, orderThreshold: t.orderThreshold ?? 0, bonusAmount: t.bonusAmount ?? 0 })))
  }

  // Insertion order — used for rendering the list so re-typing threshold doesn't cause jumps
  const activeDrafts = drafts.filter(d => !d.isDeleted)

  // Sorted — used only for the progress bar visualizer and stat calculations
  const activeDraftsSorted = [...activeDrafts].sort((a, b) => a.orderThreshold - b.orderThreshold)

  const maxPotentialPayout = activeDraftsSorted.length > 0 
    ? Math.max(...activeDraftsSorted.map(d => d.bonusAmount || 0)) 
    : 0

  const maxThreshVal = activeDraftsSorted.length > 0 ? Math.max(...activeDraftsSorted.map(d => d.orderThreshold)) : 50
  const isZeroHidden = activeDraftsSorted.some(d => maxThreshVal > 0 && (d.orderThreshold / maxThreshVal) * 100 < 8)

  // Calculate Avg orders per rep using accurate data from sellerRevenueQuery
  const avgOrdersPerRep = useMemo(() => {
    const sellers = sellerRevenueQuery.data?.result || []

    if (sellers.length === 0) return 0
    const totalOrders = sellers.reduce((sum, seller) => sum + (seller.soldOrders || 0), 0)

    return Math.round(totalOrders / sellers.length)
  }, [sellerRevenueQuery.data])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 4, pb: 4, px: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%', position: 'relative' }}>
        
        {/* Modal-like Container */}
        <Card sx={{ 
          bgcolor: 'background.paper', 
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          boxShadow: theme.shadows[8],
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Box sx={{ px: 4, pt: 4, pb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant='h5' fontWeight={700} sx={{ letterSpacing: '-0.5px', mb: 0.5, color: 'text.primary' }}>Configure Bonus Tiers</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>Define performance thresholds and incentive payouts for the current sales cycle.</Typography>
            </Box>
            <IconButton size='small' sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
              <i className='tabler-x' />
            </IconButton>
          </Box>

          {/* Content Area with Split Layout */}
          <Box sx={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, 
            gap: 4, 
            px: 4, 
            pb: 4, 
            minHeight: 0, 
            overflow: 'hidden' ,
          }}>
            {/* Tiers List (Scrollable) */}
            <Box sx={{ 
              overflowY: 'auto', 
              pr: 2,
              pt: 2,
              '&::-webkit-scrollbar': { width: 5 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 10, '&:hover': { bgcolor: 'action.disabled' } }
            }}>
              <Stack spacing={2}>
                {tiersQuery.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : (
                  <>
                    {activeDrafts.map((tier, index) => (
                      <Box key={tier.id} sx={{ 
                        display: 'flex', alignItems: 'center', gap: 3, 
                        p: 3, 
                        bgcolor: 'background.default', 
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <Box sx={{ 
                          width: 48, height: 48, borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #c084fc 0%, #818cf8 100%)', 
                          color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, flexShrink: 0, fontSize: '1.25rem',
                          boxShadow: '0 4px 10px rgba(129, 140, 248, 0.4)'
                        }}>
                          {index + 1}
                        </Box>
                        <Stack spacing={2.5} sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.75px', ml: 0.5 }}>Order Threshold</Typography>
                            <TextField
                              variant='outlined'
                              size='small'
                              type='number'
                              fullWidth
                              value={tier.orderThreshold || ''}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0

                                setDrafts(prev => prev.map(d => d.id === tier.id ? { ...d, orderThreshold: val } : d))
                              }}
                              slotProps={{
                                input: {
                                  endAdornment: <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1, mr: 0.5, fontWeight: 600 }}>Units</Typography>,
                                  sx: { bgcolor: 'background.paper', borderRadius: 2, fontSize: '1.05rem', fontWeight: 600 }
                                }
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.75px', ml: 0.5 }}>Bonus Amount</Typography>
                            <TextField
                              variant='outlined'
                              size='small'
                              fullWidth
                              value={tier.bonusAmount ? tier.bonusAmount.toLocaleString('en-US') : ''}
                              onChange={e => {
                                const val = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0

                                setDrafts(prev => prev.map(d => d.id === tier.id ? { ...d, bonusAmount: val } : d))
                              }}
                              slotProps={{
                                input: {
                                  endAdornment: <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1, mr: 0.5, fontWeight: 700 }}>VND</Typography>,
                                  sx: { bgcolor: 'background.paper', borderRadius: 2, fontSize: '1.05rem', fontWeight: 700 }
                                }
                              }}
                            />
                          </Box>
                        </Stack>
                        <IconButton 
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                          onClick={() => setDrafts(prev => prev.map(d => d.id === tier.id ? { ...d, isDeleted: true } : d))}
                        >
                          <i className='tabler-trash' style={{ fontSize: 24 }} />
                        </IconButton>
                      </Box>
                    ))}

                    <Button
                      onClick={() => {
                        const nextThreshold = activeDraftsSorted.length > 0
                          ? Math.max(...activeDraftsSorted.map(d => d.orderThreshold)) + 1
                          : 1

                        setDrafts(prev => [...prev, { id: `new_${Date.now()}`, orderThreshold: nextThreshold, bonusAmount: 0, isNew: true }])
                      }}
                      sx={{
                        py: 2,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 3,
                        color: 'text.secondary',
                        flexDirection: 'row',
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: alpha(theme.palette.action.hover, 0.4),
                        '&:hover': { bgcolor: 'action.hover', borderColor: '#818cf8', color: '#818cf8' },
                        transition: 'all 0.2s'
                      }}
                    >
                      <i className='tabler-plus' style={{ fontSize: 18 }} />
                      <Typography variant='body2' fontWeight={600}>Add Payout Tier</Typography>
                    </Button>
                  </>
                )}
              </Stack>
            </Box>

            {/* Smart Recommendations (Fixed Side) */}
            <Box>
              <Stack spacing={3}>
                <Box sx={{ 
                  p: 2.5, 
                  bgcolor: 'background.default', 
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Premium glowing backdrop */}
                  <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'radial-gradient(circle, rgba(129, 140, 248, 0.2) 0%, transparent 70%)', zIndex: 0 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, position: 'relative', zIndex: 1 }}>
                    <i className='tabler-sparkles' style={{ color: '#c084fc', fontSize: 20 }} />
                    <Typography variant='body2' fontWeight={800} sx={{ color: 'text.primary', background: 'linear-gradient(90deg, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Smart Recommendations
                    </Typography>
                  </Box>
                  <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 3, position: 'relative', zIndex: 1 }}>
                    Based on last month&apos;s performance, adding a tier at <Typography component='span' fontWeight={700} color='text.primary'>35 orders</Typography> could increase total volume by <Typography component='span' fontWeight={700} color='#818cf8'>14%</Typography>.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, position: 'relative', zIndex: 1 }}>
                    <Typography variant='caption' sx={{ color: 'text.disabled' }}>Max potential payout</Typography>
                    <Typography variant='caption' fontWeight={700} sx={{ color: 'text.primary' }}>{maxPotentialPayout.toLocaleString('en-US')} VND</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, position: 'relative', zIndex: 1 }}>
                    <Typography variant='caption' sx={{ color: 'text.disabled' }}>Avg. orders per rep</Typography>
                    <Typography variant='caption' fontWeight={700} sx={{ color: 'text.primary' }}>
                      {sellerRevenueQuery.isLoading ? <CircularProgress size={10} /> : `${avgOrdersPerRep} units`}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Typography variant='caption' fontWeight={600} sx={{ color: '#818cf8' }}>Automatic Adjustment</Typography>
                    <Switch size='small' defaultChecked sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#818cf8' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#818cf8' } }} />
                  </Box>
                </Box>

                <Box sx={{ 
                  p: 2.5, 
                  bgcolor: 'background.default', 
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 2
                }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)' }}>
                    <i className='tabler-user' style={{ fontSize: 18, color: '#94a3b8' }} />
                  </Box>
                  <Box>
                    <Typography variant='body2' sx={{ color: 'text.primary', fontStyle: 'italic', mb: 1, lineHeight: 1.5, fontSize: '0.85rem' }}>
                      &quot;Higher rewards at higher tiers motivate our top 5% to push beyond standard targets.&quot;
                    </Typography>
                    <Typography variant='caption' fontWeight={700} sx={{ color: '#818cf8', fontSize: '0.65rem', letterSpacing: '0.5px' }}>— DAVID CHEN, SALES DIRECTOR</Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* Footer Timeline & Actions */}
          <Box sx={{ bgcolor: 'action.hover', px: 4, py: 3, borderTop: '1px solid', borderColor: 'divider' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant='caption' fontWeight={700} sx={{ color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>Incentive Tracking Preview</Typography>
              <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>Progression Visualizer</Typography>
            </Box>
            
            <Box sx={{ position: 'relative', height: 45, mb: 1, mt: 4 }}>
              {/* Timeline Track Base */}
              <Box sx={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, bgcolor: 'divider', borderRadius: 3 }} />
              
              {/* Premium Animated Gradient Progress */}
              <Box sx={{ 
                position: 'absolute', top: 12, left: 0, width: '45%', height: 6, borderRadius: 3, zIndex: 1,
                background: 'linear-gradient(90deg, #fb923c, #c084fc, #818cf8, #3b82f6)',
                backgroundSize: '200% 200%',
                animation: `${gradientFlow} 3s ease infinite`,
                boxShadow: '0 0 10px rgba(129, 140, 248, 0.5)'
              }} />
              
              {/* Glow Behind Progress */}
              <Box sx={{ 
                position: 'absolute', top: 12, left: 0, width: '100%', height: 6, borderRadius: 3,
                background: 'linear-gradient(90deg, rgba(251,146,60,0.1), rgba(192,132,252,0.1), rgba(129,140,248,0.1))',
              }} />
              
              {!isZeroHidden && (
                <>
                  <Box sx={{ position: 'absolute', top: 9, left: 0, width: 12, height: 12, borderRadius: '50%', bgcolor: '#c084fc', border: '2px solid', borderColor: 'background.paper', zIndex: 2 }} />
                  <Typography sx={{ position: 'absolute', top: 25, left: 0, color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>0</Typography>
                </>
              )}

              {activeDraftsSorted.map((tier, i) => {
                const isLast = tier.orderThreshold === maxThreshVal
                const leftPercent = maxThreshVal > 0 ? (tier.orderThreshold / maxThreshVal) * 100 : 0
                const left = Math.min(leftPercent, 100)
                const isReached = leftPercent <= 45 // we hardcode 45% as the mock progress in the bar width above
                
                return (
                  <Box key={tier.id} sx={{ position: 'absolute', top: -1, left: `${left}%`, transform: isLast ? 'translateX(-100%)' : 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: isLast ? 'flex-end' : 'center', zIndex: 10 - i }}>
                    
                    {/* The Marker Node */}
                    <Box sx={{ 
                      minWidth: 32, height: 32, px: 0.5, borderRadius: '16px', 
                      background: isReached ? 'linear-gradient(135deg, #c084fc 0%, #818cf8 100%)' : 'background.paper', 
                      border: '2px solid', 
                      borderColor: isReached ? 'transparent' : 'divider', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isReached ? '#fff' : 'text.primary', 
                      fontSize: '0.7rem', fontWeight: 800, zIndex: 2, 
                      boxShadow: isReached ? '0 4px 10px rgba(192, 132, 252, 0.4)' : theme.shadows[1],
                      transition: 'all 0.3s',
                      animation: isReached && isLast ? `${pulseGlow} 2s infinite` : 'none',
                      '&:hover': {
                        transform: 'scale(1.15)',
                        boxShadow: '0 6px 14px rgba(192, 132, 252, 0.6)'
                      }
                    }}>
                      {tier.orderThreshold}
                    </Box>
                    
                    {/* The Tooltip/Label */}
                    <Box sx={{ 
                      mt: 1, 
                      px: 1, py: 0.25, 
                      borderRadius: 1, 
                      bgcolor: isReached ? alpha('#c084fc', 0.1) : 'transparent',
                      color: isReached ? '#c084fc' : 'text.disabled',
                      fontSize: '0.65rem', whiteSpace: 'nowrap', fontWeight: 700,
                      border: isReached ? '1px solid' : 'none',
                      borderColor: alpha('#c084fc', 0.2),
                    }}>
                      {(tier.bonusAmount / 1000).toFixed(0)}k
                    </Box>
                  </Box>
                )
              })}

              <Typography variant='caption' sx={{ position: 'absolute', top: -20, right: 0, color: '#818cf8', fontWeight: 800, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Goal</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
                <i className='tabler-history' style={{ fontSize: 16 }} />
                <Typography variant='caption' fontWeight={500}>Last saved just now</Typography>
              </Box>
              <Stack direction='row' spacing={2}>
                <Button 
                  onClick={handleRevert} 
                  sx={{ color: 'text.primary', fontWeight: 600, px: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:hover': { bgcolor: 'action.selected' } }}
                >
                  Discard
                </Button>
                <Button 
                  variant='contained' 
                  onClick={handleSave}
                  disabled={isSaving}
                  sx={{ 
                    // Gradient button to match the premium theme
                    background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)', 
                    color: '#fff', 
                    fontWeight: 700, 
                    px: 3, 
                    py: 1,
                    borderRadius: 2, 
                    '&:hover': { opacity: 0.9, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
                    boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)'
                  }}
                >
                  {isSaving ? 'Deploying...' : 'Save & Launch Campaign'}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}

/* ── Main Component ───────────────────────────────────────────────────── */

const AccountSalesBonus = () => {
  return <TiersTab />
}

export default AccountSalesBonus
