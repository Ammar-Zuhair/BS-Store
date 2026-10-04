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

const toSecureStoreKey = (key: string): string => {
  const safeKey = key.replace(/[^A-Za-z0-9.-]+/g, '.').replace(/^[.-]+|[.-]+$/g, '');
  if (!safeKey) throw new Error('SecureStore key must contain at least one alphanumeric character.');
  return safeKey;
};

export function createTokenStorage(isNative: boolean, secure: SecureTokenStore, legacy: LegacyTokenStore) {
  return {
    async get(key: string): Promise<string | null> {
      if (!isNative) return legacy.getItem(key);
      const secureKey = toSecureStoreKey(key);
      const secureValue = await secure.getItemAsync(secureKey);
      if (secureValue !== null) {
        await legacy.removeItem(key);
        return secureValue;
      }

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;
      await secure.setItemAsync(secureKey, legacyValue);
      await legacy.removeItem(key);
      return legacyValue;
    },

    async set(key: string, value: string | null): Promise<void> {
      if (isNative) {
        const secureKey = toSecureStoreKey(key);
        if (value === null) await secure.deleteItemAsync(secureKey);
        else await secure.setItemAsync(secureKey, value);
        await legacy.removeItem(key);
        return;
      }
      if (value === null) await legacy.removeItem(key);
      else await legacy.setItem(key, value);
    },

    async remove(keys: string[]): Promise<void> {
      let deleteError: unknown;
      if (isNative) {
        const results = await Promise.allSettled(keys.map((key) => secure.deleteItemAsync(toSecureStoreKey(key))));
        deleteError = results.find((result) => result.status === 'rejected')?.status === 'rejected'
          ? (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason
          : undefined;
      }
      await legacy.multiRemove(keys);
      if (deleteError) throw deleteError;
    },
  };
}
