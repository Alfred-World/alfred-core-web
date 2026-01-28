'use client'

import { useMemo, memo } from 'react'

import {
    Box,
    Button,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    TextField,
    Typography,
    useTheme,
    useMediaQuery
} from '@mui/material'

import type { FilterCondition, FieldConfig, DataType } from './types'
import { getOperatorsForDataType, getOperatorConfig } from './operators'

interface FilterRowProps {
    condition: FilterCondition
    fields: FieldConfig[]
    showOrButton: boolean // Whether to show OR button
    onChange: (id: string, updates: Partial<FilterCondition>) => void
    onRemove: (id: string) => void
    onAddAfter: (id: string, logicalOperator: 'AND' | 'OR') => void
    canRemove?: boolean
}

export const FilterRow = memo(function FilterRow({
    condition,
    fields,
    showOrButton,
    onChange,
    onRemove,
    onAddAfter,
    canRemove = true
}: FilterRowProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    // ... existing useMemo hooks for selectedFieldConfig, availableOperators, operatorConfig

    const selectedFieldConfig = useMemo(() => {
        return fields.find(f => f.key === condition.field)
    }, [fields, condition.field])

    // Get available operators based on the field's data type
    const availableOperators = useMemo(() => {
        const dataType: DataType = selectedFieldConfig?.dataType || 'string'

        return getOperatorsForDataType(dataType)
    }, [selectedFieldConfig])

    // Get the current operator config
    const operatorConfig = useMemo(() => {
        const dataType: DataType = selectedFieldConfig?.dataType || 'string'

        return getOperatorConfig(dataType, condition.operator)
    }, [selectedFieldConfig, condition.operator])

    const handleFieldChange = (value: string) => {
        const newField = fields.find(f => f.key === value)
        const newOperators = getOperatorsForDataType(newField?.dataType || 'string')

        // Reset operator and value when field changes
        onChange(condition.id, {
            field: value,
            operator: newOperators[0]?.value || '==',
            value: '',
            secondValue: undefined
        })
    }

    const handleOperatorChange = (value: string) => {
        onChange(condition.id, {
            operator: value,
            value: '',
            secondValue: undefined
        })
    }

    const renderValueInput = () => {
        if (!operatorConfig?.requiresValue) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', height: 40, color: 'text.secondary', fontStyle: 'italic' }}>
                    —
                </Box>
            )
        }

        const valueType = operatorConfig.valueType || 'text'

        // Boolean input
        if (valueType === 'boolean') {
            return (
                <FormControl fullWidth size="small">
                    <Select
                        value={condition.value === true || condition.value === 'true' ? 'true' : 'false'}
                        onChange={e => onChange(condition.id, { value: e.target.value === 'true' })}
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value="true">True</MenuItem>
                        <MenuItem value="false">False</MenuItem>
                    </Select>
                </FormControl>
            )
        }

        // Date input
        if (valueType === 'date') {
            if (operatorConfig.requiresSecondValue) {
                return (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            type="date"
                            size="small"
                            value={condition.value || ''}
                            onChange={e => onChange(condition.id, { value: e.target.value })}
                            placeholder="Start date"
                            sx={{ flex: 1, minWidth: 130 }}
                            slotProps={{
                                inputLabel: { shrink: true }
                            }}
                        />
                        <Typography variant="body2">and</Typography>
                        <TextField
                            type="date"
                            size="small"
                            value={condition.secondValue || ''}
                            onChange={e => onChange(condition.id, { secondValue: e.target.value })}
                            placeholder="End date"
                            sx={{ flex: 1, minWidth: 130 }}
                            slotProps={{
                                inputLabel: { shrink: true }
                            }}
                        />
                    </Box>
                )
            }

            return (
                <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={condition.value || ''}
                    onChange={e => onChange(condition.id, { value: e.target.value })}
                    slotProps={{
                        inputLabel: { shrink: true }
                    }}
                />
            )
        }

        // Number input with between
        if (valueType === 'number' && operatorConfig.requiresSecondValue) {
            return (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        type="number"
                        size="small"
                        value={condition.value || ''}
                        onChange={e => onChange(condition.id, { value: e.target.value })}
                        placeholder="Min"
                        sx={{ flex: 1, minWidth: 80 }}
                    />
                    <Typography variant="body2">and</Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={condition.secondValue || ''}
                        onChange={e => onChange(condition.id, { secondValue: e.target.value })}
                        placeholder="Max"
                        sx={{ flex: 1, minWidth: 80 }}
                    />
                </Box>
            )
        }

        // Multi-value input (for @in, @nin)
        if (valueType === 'multi') {
            const isNumeric = selectedFieldConfig?.dataType === 'int' || selectedFieldConfig?.dataType === 'long'

            return (
                <TextField
                    size="small"
                    fullWidth
                    value={condition.value || ''}
                    onChange={e => onChange(condition.id, { value: e.target.value })}
                    placeholder={isNumeric ? 'e.g. 1, 2, 3' : 'e.g. value1, value2'}
                />
            )
        }

        // Enum input (when field has enumOptions)
        if (selectedFieldConfig?.enumOptions && selectedFieldConfig.enumOptions.length > 0) {
            const enumOptions = selectedFieldConfig.enumOptions

            return (
                <FormControl fullWidth size="small">
                    <Select
                        value={condition.value ?? ''}
                        onChange={e => onChange(condition.id, { value: e.target.value })}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            Select...
                        </MenuItem>
                        {enumOptions.map(opt => (
                            <MenuItem key={String(opt.value)} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )
        }

        // Number input
        if (valueType === 'number') {
            return (
                <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={condition.value || ''}
                    onChange={e => onChange(condition.id, { value: e.target.value })}
                    placeholder="Enter value"
                />
            )
        }

        // Default text input
        return (
            <TextField
                size="small"
                fullWidth
                value={condition.value || ''}
                onChange={e => onChange(condition.id, { value: e.target.value })}
                placeholder="Enter value"
            />
        )
    }

    return (
        <Box sx={{ mb: 1 }}>

            {/* Main Row Content */}
            {/* Main Row Content */}
            {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    {/* Row 1: Field & Operator */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <Select value={condition.field} onChange={e => handleFieldChange(e.target.value)} displayEmpty>
                                {fields.map(field => (
                                    <MenuItem key={field.key} value={field.key}>{field.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <Select value={condition.operator} onChange={e => handleOperatorChange(e.target.value)}>
                                {availableOperators.map(op => (
                                    <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Row 2: Value */}
                    <Box sx={{ width: '100%' }}>
                        {renderValueInput()}
                    </Box>

                    {/* Row 3: Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => onAddAfter(condition.id, 'AND')}
                                sx={{ minWidth: 'auto', px: 2, fontSize: '0.75rem', bgcolor: 'grey.600', '&:hover': { bgcolor: 'grey.700' } }}
                            >
                                And
                            </Button>
                            {showOrButton && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => onAddAfter(condition.id, 'OR')}
                                    sx={{ minWidth: 'auto', px: 2, fontSize: '0.75rem', borderColor: 'grey.400', color: 'text.primary', '&:hover': { borderColor: 'grey.600', bgcolor: 'action.hover' } }}
                                >
                                    Or
                                </Button>
                            )}
                        </Box>
                        {canRemove && (
                            <IconButton
                                size="small"
                                onClick={() => onRemove(condition.id)}
                                sx={{
                                    color: 'error.main',
                                    '&:hover': {
                                        bgcolor: 'action.hover'
                                    }
                                }}
                            >
                                <i className='tabler-x' />
                            </IconButton>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select value={condition.field} onChange={e => handleFieldChange(e.target.value)} displayEmpty>
                            {fields.map(field => (
                                <MenuItem key={field.key} value={field.key}>{field.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select value={condition.operator} onChange={e => handleOperatorChange(e.target.value)}>
                            {availableOperators.map(op => (
                                <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        {renderValueInput()}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => onAddAfter(condition.id, 'AND')}
                            sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: '0.75rem', bgcolor: 'grey.600', '&:hover': { bgcolor: 'grey.700' } }}
                        >
                            And
                        </Button>
                        {showOrButton && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => onAddAfter(condition.id, 'OR')}
                                sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: '0.75rem', borderColor: 'grey.400', color: 'text.primary', '&:hover': { borderColor: 'grey.600', bgcolor: 'action.hover' } }}
                            >
                                Or
                            </Button>
                        )}
                    </Box>

                    {canRemove && (
                        <IconButton
                            size="small"
                            onClick={() => onRemove(condition.id)}
                            sx={{
                                color: 'error.main',
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            <i className='tabler-x' />
                        </IconButton>
                    )}
                </Box>
            )}
        </Box>
    )
})
