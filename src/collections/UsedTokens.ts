/**
 * Storage record mapping token strings to expiration timestamps (milliseconds)
 */
export type TokenRecord = Record<string, number>

/**
 * First-class collection for tracking used tokens and their expirations
 * Encapsulates token reuse prevention logic
 */
export class UsedTokens {
  private readonly tokens: Map<string, number>

  constructor(record: TokenRecord = {}) {
    this.tokens = new Map(Object.entries(record))
  }

  hasBeenUsed(token: string): boolean {
    return this.tokens.has(token)
  }

  markAsUsed(token: string, expirationSeconds: number): void {
    this.tokens.set(token, expirationSeconds * 1000)
  }

  removeExpiredTokens(): void {
    const now = Date.now()
    const expiredTokens: string[] = []

    this.tokens.forEach((expirationMs, tokenString) => {
      if (expirationMs <= now) {
        expiredTokens.push(tokenString)
      }
    })

    expiredTokens.forEach(tokenString => {
      this.tokens.delete(tokenString)
    })
  }

  toRecord(): TokenRecord {
    return Object.fromEntries(this.tokens)
  }
}
