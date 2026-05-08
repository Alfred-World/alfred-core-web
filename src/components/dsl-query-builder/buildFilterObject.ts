import type { FilterCondition, FieldConfig, DataType } from './types'
import { getOperatorConfig } from './operators'

/**
 * Check if a condition has a valid value (required for operators that need values)
 */
function hasValidValue(
  condition: FilterCondition,
  operatorConfig: { requiresValue: boolean; requiresSecondValue?: boolean } | undefined
): boolean {
  if (!operatorConfig?.requiresValue) return true

  const value = condition.value

  if (value === null || value === undefined || value === '') return false

  if (operatorConfig.requiresSecondValue) {
    const secondValue = condition.secondValue

    if (secondValue === null || secondValue === undefined || secondValue === '') return false
  }

  return true
}

/**
 * Coerce a raw condition value to the correct type for the API filter object.
 */
function coerceValue(value: unknown, operator: string, dataType: DataType): unknown {
  if (operator === 'in' || operator === 'nin') {
    return String(value ?? '')
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '')
  }

  if (dataType === 'bool') {
    return value === 'true' || value === true
  }

  if (dataType === 'int' || dataType === 'long') {
    return Number(value)
  }

  // String and date: return as string
  return String(value ?? '')
}

/**
 * Build a filter object from FilterCondition[] that matches the generated API filter types.
 *
 * Output shape examples:
 *   Single:  { name: { contains: "test" } }
 *   AND:     { and: [{ name: { contains: "test" } }, { status: { eq: "Active" } }] }
 *   OR:      { or: [{ name: { contains: "test" } }, { code: { eq: "x" } }] }
 *   Mixed:   { or: [{ and: [c1, c2] }, c3] }
 */
export function buildFilterObject(
  conditions: FilterCondition[],
  fields: FieldConfig[]
): Record<string, unknown> | undefined {
  if (!conditions || conditions.length === 0) return undefined

  const fieldMap = new Map(fields.map(f => [f.key, f]))

  // Filter valid conditions only
  const validConditions = conditions.filter(c => {
    const fieldConfig = fieldMap.get(c.field)

    if (!fieldConfig) return false

    const opConfig = getOperatorConfig(fieldConfig.dataType, c.operator)

    return hasValidValue(c, opConfig)
  })

  if (validConditions.length === 0) return undefined

  // Group conditions into AND/OR blocks
  const groups: FilterCondition[][] = []
  let currentGroup: FilterCondition[] = []

  for (const condition of validConditions) {
    if (condition.logicalOperator === 'OR' && currentGroup.length > 0) {
      groups.push(currentGroup)
      currentGroup = [condition]
    } else {
      currentGroup.push(condition)
    }
  }

  if (currentGroup.length > 0) groups.push(currentGroup)

  function buildCondition(c: FilterCondition): Record<string, unknown> {
    const fieldConfig = fieldMap.get(c.field)!

    // Special handling for "between": combine gte + lte on same field
    if (c.operator === 'between') {
      const entry = {
        gte: coerceValue(c.value, 'gte', fieldConfig.dataType),
        lte: coerceValue(c.secondValue, 'lte', fieldConfig.dataType)
      }

      if (fieldConfig.collectionWrap) {
        const { operator, innerField } = fieldConfig.collectionWrap

        return { [c.field]: { [operator]: { [innerField]: entry } } }
      }

      return { [c.field]: entry }
    }

    const value = coerceValue(c.value, c.operator, fieldConfig.dataType)

    // Wrap in collection predicate if configured (e.g. roles.some.name)
    if (fieldConfig.collectionWrap) {
      const { operator, innerField } = fieldConfig.collectionWrap

      return { [c.field]: { [operator]: { [innerField]: { [c.operator]: value } } } }
    }

    return { [c.field]: { [c.operator]: value } }
  }

  const groupFilters = groups.map(group => {
    if (group.length === 1) return buildCondition(group[0])

    return { and: group.map(buildCondition) }
  })

  if (groupFilters.length === 1) return groupFilters[0]

  return { or: groupFilters }
}

/**
 * Build a human-readable summary of filter conditions.
 */
export function describeConditions(conditions: FilterCondition[], fields: FieldConfig[]): string {
  const fieldMap = new Map(fields.map(f => [f.key, f]))

  const parts: string[] = []

  for (const c of conditions) {
    const fieldConfig = fieldMap.get(c.field)

    if (!fieldConfig) continue

    const opConfig = getOperatorConfig(fieldConfig.dataType, c.operator)

    if (!opConfig || !hasValidValue(c, opConfig)) continue

    if (parts.length > 0) {
      parts.push(c.logicalOperator === 'OR' ? 'OR' : 'AND')
    }

    if (c.operator === 'between') {
      parts.push(`${fieldConfig.name} between ${c.value} and ${c.secondValue}`)
    } else if (!opConfig.requiresValue) {
      parts.push(`${fieldConfig.name} ${opConfig.label}`)
    } else {
      parts.push(`${fieldConfig.name} ${opConfig.label} "${c.value}"`)
    }
  }

  return parts.join(' ')
}
