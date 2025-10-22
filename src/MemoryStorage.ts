/**
 * Storage interface for token invalidation
 */
export type UserId = string
export type Token = string
export type Expiration = number
export type UsedTokens = { [token: Token]: Expiration }
export interface TokenStorage {
  set(key: UserId, value: UsedTokens): Promise<void>
  get(key: UserId): Promise<UsedTokens | undefined>
  delete(key: UserId): Promise<boolean>
}

/**
 * Simple in-memory token storage implementation
 * Uses Map for token storage with async interface
 */
export class MemoryStorage implements TokenStorage {
  private tokens: Map<UserId, UsedTokens>

  constructor() {
    this.tokens = new Map()
  }

  async set(key: UserId, value: UsedTokens): Promise<void> {
    this.tokens.set(key, value)
  }

  async get(key: UserId): Promise<UsedTokens | undefined> {
    return this.tokens.get(key)
  }

  async delete(key: UserId): Promise<boolean> {
    return this.tokens.delete(key)
  }
}
