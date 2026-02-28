'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { SchemaField } from './CategoryEditor'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FormPreviewDialogProps {
  open: boolean
  onClose: () => void
  categoryName: string
  fields: SchemaField[]
}

// ─── Component ─────────────────────────────────────────────────────────────────
const FormPreviewDialog = ({ open, onClose, categoryName, fields }: FormPreviewDialogProps) => {
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})

  const renderField = (field: SchemaField, index: number) => {
    const key = `field-${index}`

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={key}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            size='small'
            fullWidth
            value={(formValues[key] as string) ?? ''}
            onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
          />
        )

      case 'number':
        return (
          <TextField
            key={key}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            type='number'
            size='small'
            fullWidth
            value={(formValues[key] as string) ?? ''}
            onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
          />
        )

      case 'date':
        return (
          <TextField
            key={key}
            label={field.label}
            required={field.required}
            type='date'
            size='small'
            fullWidth
            value={(formValues[key] as string) ?? ''}
            onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )

      case 'dropdown':
        return (
          <FormControl key={key} fullWidth size='small' required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              label={field.label}
              value={(formValues[key] as string) ?? ''}
              onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
            >
              {(field.options ?? []).map(opt => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )

      case 'checkbox':
        return (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                checked={!!formValues[key]}
                onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.checked }))}
              />
            }
            label={
              <Typography variant='body2'>
                {field.label}
                {field.required && <span style={{ color: '#F50057' }}> *</span>}
              </Typography>
            }
          />
        )

      case 'image':
        return (
          <Box key={key}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              {field.label}
              {field.required && <span style={{ color: '#F50057' }}> *</span>}
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              <i className='tabler-cloud-upload' style={{ fontSize: 28, opacity: 0.4 }} />
              <Typography variant='caption' display='block' color='text.secondary' sx={{ mt: 0.5 }}>
                Click or drag to upload
              </Typography>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1
        }}
      >
        <Box>
          <Typography variant='subtitle1' fontWeight={700}>
            Form Preview
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {categoryName || 'Category'} — {fields.length} field{fields.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small'>
          <i className='tabler-x' style={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {fields.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <i className='tabler-forms' style={{ fontSize: 40, opacity: 0.3 }} />
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              No fields defined yet. Add fields in the Form Builder to preview them here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            {fields.map((field, i) => renderField(field, i))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
          <Button variant='outlined' color='secondary' size='small' onClick={onClose}>
            Close
          </Button>
          <Button variant='contained' size='small' disabled>
            Submit (Preview Only)
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default FormPreviewDialog
