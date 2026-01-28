export class DslBuilder {
    parts: string[] = []

    /**
     * Start building a condition for a String field
     */
    string(field: string): StringField {
        return new StringField(this, field)
    }

    /**
     * Start building a condition for a Number (Int/Long) field
     */
    number(field: string): NumberField {
        return new NumberField(this, field)
    }

    /**
     * Start building a condition for a Date field
     */
    date(field: string): DateField {
        return new DateField(this, field)
    }

    /**
     * Start building a condition for a Boolean field
     */
    bool(field: string): BoolField {
        return new BoolField(this, field)
    }

    /**
     * Logical AND
     */
    and(): DslBuilder {
        if (this.parts.length > 0 && this.getLastPart() !== '(') {
            this.parts.push('AND')
        }

        return this
    }

    /**
     * Logical OR
     */
    or(): DslBuilder {
        if (this.parts.length > 0 && this.getLastPart() !== '(') {
            this.parts.push('OR')
        }

        return this
    }

    /**
     * Start a group (parentheses)
     */
    group(builderFn: (builder: DslBuilder) => void): DslBuilder {
        this.parts.push('(')
        builderFn(this)
        this.parts.push(')')

        return this
    }

    /**
     * Build the query string
     */
    build(): string {
        return this.parts.join(' ')
    }

    private getLastPart(): string {
        return this.parts[this.parts.length - 1]
    }
}

abstract class BaseField {
    constructor(protected builder: DslBuilder, protected field: string) { }

    protected formatValue(value: string | number | boolean): string {
        if (typeof value === 'string') {
            return `'${value}'`
        }


        return String(value)
    }

    protected addPart(condition: string): DslBuilder {
        this.builder.parts.push(condition)

        return this.builder
    }

    /**
     * Field is null
     */
    isNull(): DslBuilder {
        return this.addPart(`${this.field} @isnull()`)
    }

    /**
     * Field is not null
     */
    notNull(): DslBuilder {
        return this.addPart(`${this.field} @notnull()`)
    }
}

class StringField extends BaseField {
    /**
     * Field equals value
     */
    eq(value: string): DslBuilder {
        return this.addPart(`${this.field} == ${this.formatValue(value)}`)
    }

    /**
     * Field not equals value
     */
    neq(value: string): DslBuilder {
        return this.addPart(`${this.field} != ${this.formatValue(value)}`)
    }

    /**
     * Field contains text
     */
    contains(value: string): DslBuilder {
        return this.addPart(`${this.field} @contains(${this.formatValue(value)})`)
    }

    /**
     * Field does not contain text
     */
    ncontains(value: string): DslBuilder {
        return this.addPart(`${this.field} @ncontains(${this.formatValue(value)})`)
    }

    /**
     * Field starts with text
     */
    startswith(value: string): DslBuilder {
        return this.addPart(`${this.field} @startswith(${this.formatValue(value)})`)
    }

    /**
     * Field ends with text
     */
    endswith(value: string): DslBuilder {
        return this.addPart(`${this.field} @endswith(${this.formatValue(value)})`)
    }

    /**
     * Field in list of values
     */
    in(values: string[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @in(${formattedValues})`)
    }

    /**
     * Field not in list of values
     */
    nin(values: string[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @nin(${formattedValues})`)
    }
}

class NumberField extends BaseField {
    /**
     * Field equals value
     */
    eq(value: number): DslBuilder {
        return this.addPart(`${this.field} == ${this.formatValue(value)}`)
    }

    /**
     * Field not equals value
     */
    neq(value: number): DslBuilder {
        return this.addPart(`${this.field} != ${this.formatValue(value)}`)
    }

    /**
     * Field greater than value
     */
    gt(value: number): DslBuilder {
        return this.addPart(`${this.field} > ${this.formatValue(value)}`)
    }

    /**
     * Field greater than or equal value
     */
    gte(value: number): DslBuilder {
        return this.addPart(`${this.field} >= ${this.formatValue(value)}`)
    }

    /**
     * Field less than value
     */
    lt(value: number): DslBuilder {
        return this.addPart(`${this.field} < ${this.formatValue(value)}`)
    }

    /**
     * Field less than or equal value
     */
    lte(value: number): DslBuilder {
        return this.addPart(`${this.field} <= ${this.formatValue(value)}`)
    }

    /**
     * Field between min and max
     */
    between(min: number, max: number): DslBuilder {
        return this.addPart(`${this.field} @between(${this.formatValue(min)}, ${this.formatValue(max)})`)
    }

    /**
     * Field in list of values
     */
    in(values: number[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @in(${formattedValues})`)
    }

    /**
     * Field not in list of values
     */
    nin(values: number[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @nin(${formattedValues})`)
    }
}

class DateField extends BaseField {
    /**
     * Field equals date (YYYY-MM-DD or full ISO string if compatible)
     */
    eq(value: string): DslBuilder {
        return this.addPart(`${this.field} == ${this.formatValue(value)}`)
    }

    /**
     * Field not equals date
     */
    neq(value: string): DslBuilder {
        return this.addPart(`${this.field} != ${this.formatValue(value)}`)
    }

    /**
     * Field after date
     */
    gt(value: string): DslBuilder {
        return this.addPart(`${this.field} > ${this.formatValue(value)}`)
    }

    /**
     * Field on or after date
     */
    gte(value: string): DslBuilder {
        return this.addPart(`${this.field} >= ${this.formatValue(value)}`)
    }

    /**
     * Field before date
     */
    lt(value: string): DslBuilder {
        return this.addPart(`${this.field} < ${this.formatValue(value)}`)
    }

    /**
     * Field on or before date
     */
    lte(value: string): DslBuilder {
        return this.addPart(`${this.field} <= ${this.formatValue(value)}`)
    }

    /**
     * Field between start and end date
     */
    between(start: string, end: string): DslBuilder {
        return this.addPart(`${this.field} @between(${this.formatValue(start)}, ${this.formatValue(end)})`)
    }

    /**
    * Field in list of values
    */
    in(values: string[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @in(${formattedValues})`)
    }

    /**
     * Field not in list of values
     */
    nin(values: string[]): DslBuilder {
        if (values.length === 0) return this.builder
        const formattedValues = values.map(v => this.formatValue(v)).join(', ')


        return this.addPart(`${this.field} @nin(${formattedValues})`)
    }
}

class BoolField extends BaseField {
    /**
     * Field equals value
     */
    eq(value: boolean): DslBuilder {
        return this.addPart(`${this.field} == ${this.formatValue(value)}`)
    }

    /**
     * Field not equals value
     */
    neq(value: boolean): DslBuilder {
        return this.addPart(`${this.field} != ${this.formatValue(value)}`)
    }
}

/**
 * Helper factory function
 */
export const dsl = () => new DslBuilder()
