export interface SecureTokenStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface LegacyTokenStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export function createTokenStorage(isNative: boolean, secure: SecureTokenStore, legacy: LegacyTokenStore) {
  return {
    async get(key: string): Promise<string | null> {
      if (!isNative) return legacy.getItem(key);
      const secureValue = await secure.getItemAsync(key);
      if (secureValue !== null) {
        await legacy.removeItem(key);
        return secureValue;
      }

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;
      await secure.setItemAsync(key, legacyValue);
      await legacy.removeItem(key);
      return legacyValue;
    },

    async set(key: string, value: string | null): Promise<void> {
      if (isNative) {
        if (value === null) await secure.deleteItemAsync(key);
        else await secure.setItemAsync(key, value);
        await legacy.removeItem(key);
        return;
      }
      if (value === null) await legacy.removeItem(key);
      else await legacy.setItem(key, value);
    },

    async remove(keys: string[]): Promise<void> {
      let deleteError: unknown;
      if (isNative) {
        const results = await Promise.allSettled(keys.map((key) => secure.deleteItemAsync(key)));
        deleteError = results.find((result) => result.status === 'rejected')?.status === 'rejected'
          ? (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason
          : undefined;
      }
      await legacy.multiRemove(keys);
      if (deleteError) throw deleteError;
    },
  };
}
