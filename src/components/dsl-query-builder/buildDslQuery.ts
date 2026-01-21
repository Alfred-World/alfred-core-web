// Build DSL query string from filter conditions
import type { FilterCondition, FieldConfig } from './types'
import { getOperatorConfig } from './operators'

function formatValue(value: string | number | boolean | null, dataType: string, operator: string): string {
    if (value === null || value === undefined || value === '') {
        return ''
    }

    // Special operators that don't need value formatting (parentheses)
    if (operator === '@isnull' || operator === '@notnull') {
        return ''
    }

    // String and Date values need quotes
    if (dataType === 'string' || dataType === 'date') {
        return `"${value}"`
    }

    // Boolean values
    if (dataType === 'bool') {
        return value === true || value === 'true' ? 'true' : 'false'
    }

    // Numeric values
    return String(value)
}

/**
 * Check if a condition has a valid value (required for operators that need values)
 */
function hasValidValue(condition: FilterCondition, operatorConfig: { requiresValue: boolean; requiresSecondValue?: boolean } | undefined): boolean {
    // Operators that don't require values are always valid
    if (!operatorConfig?.requiresValue) {
        return true
    }

    const value = condition.value

    // Check if value is empty
    if (value === null || value === undefined || value === '') {
        return false
    }

    // For @between, also check second value
    if (operatorConfig.requiresSecondValue) {
        const secondValue = condition.secondValue

        if (secondValue === null || secondValue === undefined || secondValue === '') {
            return false
        }
    }

    return true
}

function buildSingleCondition(condition: FilterCondition, fieldConfig: FieldConfig | undefined): string {
    if (!fieldConfig) return ''

    const operator = condition.operator
    const dataType = fieldConfig.dataType
    const operatorConfig = getOperatorConfig(dataType, operator)

    // Skip conditions that require values but don't have them
    if (!hasValidValue(condition, operatorConfig)) {
        return ''
    }

    // Handle operators that don't require values
    if (!operatorConfig?.requiresValue) {
        return `${condition.field} ${operator}()`
    }

    // Handle @between operator
    if (operator === '@between') {
        const val1 = formatValue(condition.value, dataType, operator)
        const val2 = formatValue(condition.secondValue ?? null, dataType, operator)

        return `${condition.field} @between(${val1}, ${val2})`
    }

    // Handle @in, @nin operators (multi-value)
    if (operator === '@in' || operator === '@nin') {
        const values = String(condition.value)
            .split(',')
            .map(v => v.trim())
            .filter(v => v !== '') // Filter out empty values
            .map(v => formatValue(v, dataType, operator))
            .join(', ')

        // If no valid values after filtering, skip this condition
        if (!values) return ''

        return `${condition.field} ${operator}(${values})`
    }

    // Handle @contains, @ncontains, @startswith, @endswith
    if (operator.startsWith('@')) {
        const formattedValue = formatValue(condition.value, dataType, operator)

        return `${condition.field} ${operator}(${formattedValue})`
    }

    // Handle comparison operators (==, !=, >, >=, <, <=)
    const formattedValue = formatValue(condition.value, dataType, operator)

    return `${condition.field} ${operator} ${formattedValue}`
}

export function buildDslQuery(conditions: FilterCondition[], fields: FieldConfig[]): string {
    if (!conditions || conditions.length === 0) return ''

    const fieldMap = new Map(fields.map(f => [f.key, f]))
    const validParts: { logicalOperator?: 'AND' | 'OR'; condition: string }[] = []

    // First pass: build all valid conditions
    conditions.forEach(condition => {
        const fieldConfig = fieldMap.get(condition.field)
        const conditionStr = buildSingleCondition(condition, fieldConfig)

        if (conditionStr) {
            validParts.push({
                logicalOperator: condition.logicalOperator,
                condition: conditionStr
            })
        }
    })

    // Second pass: join with logical operators
    const parts: string[] = []

    validParts.forEach((part, index) => {
        if (index > 0 && part.logicalOperator) {
            parts.push(part.logicalOperator)
        }

        parts.push(part.condition)
    })

    return parts.join(' ')
}
