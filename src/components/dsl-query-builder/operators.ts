// Search Filter Operators by Data Type — values match generated API filter input types
import type { DataType } from './types'

export interface OperatorConfig {
  value: string
  label: string
  requiresValue: boolean
  requiresSecondValue?: boolean // For between
  valueType?: 'text' | 'number' | 'date' | 'boolean' | 'multi' // Type of input
}

// String operators (matches StringFilterInput)
const stringOperators: OperatorConfig[] = [
  { value: 'eq', label: 'equals', requiresValue: true, valueType: 'text' },
  { value: 'neq', label: 'does not equal', requiresValue: true, valueType: 'text' },
  { value: 'contains', label: 'contains', requiresValue: true, valueType: 'text' },
  { value: 'ncontains', label: 'does not contain', requiresValue: true, valueType: 'text' },
  { value: 'startsWith', label: 'starts with', requiresValue: true, valueType: 'text' },
  { value: 'endsWith', label: 'ends with', requiresValue: true, valueType: 'text' },
  { value: 'in', label: 'is in', requiresValue: true, valueType: 'multi' },
  { value: 'nin', label: 'is not in', requiresValue: true, valueType: 'multi' }
]

// Numeric operators (int, long)
const numericOperators: OperatorConfig[] = [
  { value: 'eq', label: 'equals', requiresValue: true, valueType: 'number' },
  { value: 'neq', label: 'does not equal', requiresValue: true, valueType: 'number' },
  { value: 'gt', label: 'greater than', requiresValue: true, valueType: 'number' },
  { value: 'gte', label: 'greater than or equal', requiresValue: true, valueType: 'number' },
  { value: 'lt', label: 'less than', requiresValue: true, valueType: 'number' },
  { value: 'lte', label: 'less than or equal', requiresValue: true, valueType: 'number' },
  { value: 'between', label: 'is between', requiresValue: true, requiresSecondValue: true, valueType: 'number' },
  { value: 'in', label: 'is in', requiresValue: true, valueType: 'multi' },
  { value: 'nin', label: 'is not in', requiresValue: true, valueType: 'multi' }
]

// Date operators (matches DateTimeFilterInput)
const dateOperators: OperatorConfig[] = [
  { value: 'eq', label: 'equals', requiresValue: true, valueType: 'date' },
  { value: 'neq', label: 'does not equal', requiresValue: true, valueType: 'date' },
  { value: 'gt', label: 'after', requiresValue: true, valueType: 'date' },
  { value: 'gte', label: 'on or after', requiresValue: true, valueType: 'date' },
  { value: 'lt', label: 'before', requiresValue: true, valueType: 'date' },
  { value: 'lte', label: 'on or before', requiresValue: true, valueType: 'date' },
  { value: 'between', label: 'is between', requiresValue: true, requiresSecondValue: true, valueType: 'date' }
]

// Boolean operators (matches BoolFilterInput)
const boolOperators: OperatorConfig[] = [
  { value: 'eq', label: 'equals', requiresValue: true, valueType: 'boolean' },
  { value: 'neq', label: 'does not equal', requiresValue: true, valueType: 'boolean' }
]

export const operatorsByDataType: Record<DataType, OperatorConfig[]> = {
  string: stringOperators,
  int: numericOperators,
  long: numericOperators,
  date: dateOperators,
  bool: boolOperators
}

export function getOperatorsForDataType(dataType: DataType): OperatorConfig[] {
  return operatorsByDataType[dataType] || stringOperators
}

export function getOperatorConfig(dataType: DataType, operatorValue: string): OperatorConfig | undefined {
  const operators = getOperatorsForDataType(dataType)

  return operators.find(op => op.value === operatorValue)
}
