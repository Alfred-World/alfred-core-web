// DSL Query Builder Operators by Data Type
import type { DataType } from './types'

export interface OperatorConfig {
    value: string
    label: string
    requiresValue: boolean
    requiresSecondValue?: boolean // For @between
    valueType?: 'text' | 'number' | 'date' | 'boolean' | 'multi' // Type of input
}

// String operators
const stringOperators: OperatorConfig[] = [
    { value: '==', label: 'equals', requiresValue: true, valueType: 'text' },
    { value: '!=', label: 'does not equal', requiresValue: true, valueType: 'text' },
    { value: '@contains', label: 'contains', requiresValue: true, valueType: 'text' },
    { value: '@ncontains', label: 'does not contain', requiresValue: true, valueType: 'text' },
    { value: '@startswith', label: 'starts with', requiresValue: true, valueType: 'text' },
    { value: '@endswith', label: 'ends with', requiresValue: true, valueType: 'text' },
    { value: '@in', label: 'is in', requiresValue: true, valueType: 'multi' },
    { value: '@nin', label: 'is not in', requiresValue: true, valueType: 'multi' },
    { value: '@isnull', label: 'is null', requiresValue: false },
    { value: '@notnull', label: 'is not null', requiresValue: false }
]

// Numeric operators (int, long)
const numericOperators: OperatorConfig[] = [
    { value: '==', label: 'equals', requiresValue: true, valueType: 'number' },
    { value: '!=', label: 'does not equal', requiresValue: true, valueType: 'number' },
    { value: '>', label: 'greater than', requiresValue: true, valueType: 'number' },
    { value: '>=', label: 'greater than or equal', requiresValue: true, valueType: 'number' },
    { value: '<', label: 'less than', requiresValue: true, valueType: 'number' },
    { value: '<=', label: 'less than or equal', requiresValue: true, valueType: 'number' },
    { value: '@in', label: 'is in', requiresValue: true, valueType: 'multi' },
    { value: '@nin', label: 'is not in', requiresValue: true, valueType: 'multi' },
    { value: '@between', label: 'is between', requiresValue: true, requiresSecondValue: true, valueType: 'number' },
    { value: '@isnull', label: 'is null', requiresValue: false },
    { value: '@notnull', label: 'is not null', requiresValue: false }
]

// Date operators
const dateOperators: OperatorConfig[] = [
    { value: '==', label: 'equals', requiresValue: true, valueType: 'date' },
    { value: '!=', label: 'does not equal', requiresValue: true, valueType: 'date' },
    { value: '>', label: 'after', requiresValue: true, valueType: 'date' },
    { value: '>=', label: 'on or after', requiresValue: true, valueType: 'date' },
    { value: '<', label: 'before', requiresValue: true, valueType: 'date' },
    { value: '<=', label: 'on or before', requiresValue: true, valueType: 'date' },
    { value: '@in', label: 'is in', requiresValue: true, valueType: 'multi' },
    { value: '@nin', label: 'is not in', requiresValue: true, valueType: 'multi' },
    { value: '@between', label: 'is between', requiresValue: true, requiresSecondValue: true, valueType: 'date' },
    { value: '@isnull', label: 'is null', requiresValue: false },
    { value: '@notnull', label: 'is not null', requiresValue: false }
]

// Boolean operators
const boolOperators: OperatorConfig[] = [
    { value: '==', label: 'equals', requiresValue: true, valueType: 'boolean' },
    { value: '!=', label: 'does not equal', requiresValue: true, valueType: 'boolean' },
    { value: '@isnull', label: 'is null', requiresValue: false },
    { value: '@notnull', label: 'is not null', requiresValue: false }
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
