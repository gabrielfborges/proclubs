type CacheEntry<T> = {
  data?: T;
  expiresAt: number;
  promise?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function cachedRequest<T>(key: string, request: () => Promise<T>, ttlMs = 30_000): Promise<T> {
  const current = cache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (current?.data !== undefined && current.expiresAt > now) {
    return Promise.resolve(current.data);
  }

  if (current?.promise) return current.promise;

  const promise = request()
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

export function clearRequestCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
