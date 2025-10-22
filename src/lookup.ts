/**
 * Type-safe property accessor for nested object properties with array notation
 * Handles nested property access like 'user[profile][email]'
 */
export function lookup<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  field: string
): T | undefined {
  if (!obj) {
    return undefined
  }

  const chain = field.split(']').join('').split('[')

  for (let i = 0, len = chain.length; i < len; i++) {
    const key = chain[i]
    if (!key || !obj || typeof obj !== 'object') {
      return undefined
    }

    const prop: unknown = obj[key]
    if (typeof prop === 'undefined') {
      return undefined
    }
    if (typeof prop !== 'object' || i === len - 1) {
      return prop as T
    }
    obj = prop as Record<string, unknown>
  }

  return undefined
}
