import { dsl } from '@/utils/dslQueryBuilder'
import type { FilterCondition, FieldConfig } from './types'
import { getOperatorConfig } from './operators'

/**
 * Check if a condition has a valid value (required for operators that need values)
 */
function hasValidValue(
    condition: FilterCondition,
    operatorConfig: { requiresValue: boolean; requiresSecondValue?: boolean } | undefined
): boolean {
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

export function buildDslQuery(conditions: FilterCondition[], fields: FieldConfig[]): string {
    if (!conditions || conditions.length === 0) return ''

    const fieldMap = new Map(fields.map(f => [f.key, f]))
    const query = dsl()
    let hasConditions = false

    conditions.forEach((condition, _index) => {
        const fieldConfig = fieldMap.get(condition.field)

        if (!fieldConfig) return

        const operatorConfig = getOperatorConfig(fieldConfig.dataType, condition.operator)

        // Skip invalid conditions
        if (!hasValidValue(condition, operatorConfig)) {
            return
        }

        // Add logical operator if not the first valid condition
        if (hasConditions) {
            if (condition.logicalOperator === 'OR') {
                query.or()
            } else {
                query.and()
            }
        }

        // Add condition based on type
        const field = condition.field
        const op = condition.operator
        const val = condition.value
        const val2 = condition.secondValue

        switch (fieldConfig.dataType) {
            case 'string':
                const sb = query.string(field)

                switch (op) {
                    case '==': sb.eq(val as string); break
                    case '!=': sb.neq(val as string); break
                    case '@contains': sb.contains(val as string); break
                    case '@ncontains': sb.ncontains(val as string); break
                    case '@startswith': sb.startswith(val as string); break
                    case '@endswith': sb.endswith(val as string); break
                    case '@in': sb.in(parseMultiValue(val)); break
                    case '@nin': sb.nin(parseMultiValue(val)); break
                    case '@isnull': sb.isNull(); break
                    case '@notnull': sb.notNull(); break
                }

                break

            case 'int':
            case 'long':
                const nb = query.number(field)
                const numVal = Number(val)

                switch (op) {
                    case '==': nb.eq(numVal); break
                    case '!=': nb.neq(numVal); break
                    case '>': nb.gt(numVal); break
                    case '>=': nb.gte(numVal); break
                    case '<': nb.lt(numVal); break
                    case '<=': nb.lte(numVal); break
                    case '@between': nb.between(Number(val), Number(val2)); break
                    case '@in': nb.in(parseMultiNumber(val)); break
                    case '@nin': nb.nin(parseMultiNumber(val)); break
                    case '@isnull': nb.isNull(); break
                    case '@notnull': nb.notNull(); break
                }

                break

            case 'date':
                const db = query.date(field)

                switch (op) {
                    case '==': db.eq(val as string); break
                    case '!=': db.neq(val as string); break
                    case '>': db.gt(val as string); break
                    case '>=': db.gte(val as string); break
                    case '<': db.lt(val as string); break
                    case '<=': db.lte(val as string); break
                    case '@between': db.between(val as string, val2 as string); break
                    case '@in': db.in(parseMultiValue(val)); break
                    case '@nin': db.nin(parseMultiValue(val)); break
                    case '@isnull': db.isNull(); break
                    case '@notnull': db.notNull(); break
                }

                break

            case 'bool':
                const bb = query.bool(field)
                const boolVal = val === 'true' || val === true

                switch (op) {
                    case '==': bb.eq(boolVal); break
                    case '!=': bb.neq(boolVal); break
                    case '@isnull': bb.isNull(); break
                    case '@notnull': bb.notNull(); break
                }

                break
        }

        hasConditions = true
    })

    return query.build()
}

function parseMultiValue(val: any): string[] {
    return String(val)
        .split(',')
        .map(v => v.trim())
        .filter(v => v !== '')
}

function parseMultiNumber(val: any): number[] {
    return parseMultiValue(val).map(Number).filter(n => !isNaN(n))
}

