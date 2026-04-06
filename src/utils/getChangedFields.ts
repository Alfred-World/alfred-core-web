/**
 * Compare current form values against original data and return only changed fields.
 * Useful for PATCH requests — only sends fields that actually differ.
 *
 * @returns Partial object with only changed fields, or `undefined` if nothing changed.
 */
export function getChangedFields<T extends object>(original: Partial<T>, current: T): Partial<T> | undefined {
  const changes = {} as Partial<T>
  let hasChanges = false

  for (const key of Object.keys(current) as (keyof T)[]) {
    const orig = original[key]
    const curr = current[key]

    if (typeof orig === 'object' || typeof curr === 'object') {
      if (JSON.stringify(orig) !== JSON.stringify(curr)) {
        changes[key] = curr
        hasChanges = true
      }
    } else if (orig !== curr) {
      changes[key] = curr
      hasChanges = true
    }
  }

  return hasChanges ? changes : undefined
}
