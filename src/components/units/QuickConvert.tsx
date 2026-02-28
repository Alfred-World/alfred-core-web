'use client'

import { useCallback, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { useGetApiV1Units, useGetApiV1UnitsConvert } from '@generated/api'
import type { UnitDto } from '@generated/api'

// ─── Component ─────────────────────────────────────────────────────────────────
const QuickConvert = () => {
  const [fromUnitId, setFromUnitId] = useState('')
  const [toUnitId, setToUnitId] = useState('')
  const [value, setValue] = useState<string>('1')
  const [doConvert, setDoConvert] = useState(false)

  // Fetch all units for selectors (lightweight)
  const { data: unitsData } = useGetApiV1Units({ pageSize: 200 })
  const units = useMemo(() => unitsData?.result?.items ?? [], [unitsData])

  // Conversion result
  const { data: convertData, isFetching } = useGetApiV1UnitsConvert(
    { fromUnitId, toUnitId, value: parseFloat(value) || 0 },
    { query: { enabled: doConvert && !!fromUnitId && !!toUnitId && !!value } }
  )

  const result = convertData?.result

  const handleConvert = useCallback(() => {
    if (fromUnitId && toUnitId && value) {
      setDoConvert(true)
    }
  }, [fromUnitId, toUnitId, value])

  // Reset conversion when inputs change
  const handleInputChange = useCallback((setter: (v: string) => void, val: string) => {
    setter(val)
    setDoConvert(false)
  }, [])

  // Swap from/to
  const handleSwap = useCallback(() => {
    setFromUnitId(_prev => {
      setToUnitId(fromUnitId)

      return toUnitId
    })
    setDoConvert(false)
  }, [fromUnitId, toUnitId])

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <i className='tabler-arrows-exchange' style={{ fontSize: 20, color: '#7C4DFF' }} />
        <Typography variant='subtitle1' fontWeight={600}>
          Quick Convert
        </Typography>
      </Box>

      {/* From */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <TextField
          size='small'
          type='number'
          value={value}
          onChange={e => handleInputChange(setValue, e.target.value)}
          label='Value'
          sx={{ width: 100 }}
        />
        <FormControl size='small' fullWidth>
          <InputLabel>From Unit</InputLabel>
          <Select
            value={fromUnitId}
            label='From Unit'
            onChange={e => handleInputChange(setFromUnitId, e.target.value)}
          >
            {units.map((u: UnitDto) => (
              <MenuItem key={u.id} value={u.id!}>
                {u.name} ({u.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Swap button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
        <Button size='small' variant='text' onClick={handleSwap} sx={{ minWidth: 32 }}>
          <i className='tabler-arrows-sort' style={{ fontSize: 18 }} />
        </Button>
      </Box>

      {/* To */}
      <FormControl size='small' fullWidth sx={{ mb: 2 }}>
        <InputLabel>To Unit</InputLabel>
        <Select
          value={toUnitId}
          label='To Unit'
          onChange={e => handleInputChange(setToUnitId, e.target.value)}
        >
          {units.map((u: UnitDto) => (
            <MenuItem key={u.id} value={u.id!}>
              {u.name} ({u.code})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        fullWidth
        variant='contained'
        onClick={handleConvert}
        disabled={!fromUnitId || !toUnitId || !value || isFetching}
      >
        {isFetching ? 'Converting...' : 'Convert'}
      </Button>

      {/* Result */}
      {result && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h5' fontWeight={700} color='primary'>
              {result.toValue?.toFixed(6)?.replace(/\.?0+$/, '')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {result.toUnitCode}
            </Typography>
            <Typography
              variant='caption'
              color='text.disabled'
              sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}
            >
              {result.formula}
            </Typography>
          </Box>
        </>
      )}
    </Card>
  )
}

export default QuickConvert
