/** Bounded parallel reads; all jobs finish before the caller proceeds. */
export async function runLimited(jobs: (() => Promise<unknown>)[], limit = 3): Promise<void> {
  let next = 0;
  const failures: unknown[] = [];
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try { await job(); } catch (error) { failures.push(error); }
    }
  }));
  if (failures.length) throw failures[0];
}

/** Abort stalled network requests so session restoration cannot hang indefinitely. */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}

/** Shared concurrency budget, deduplication, and a fresh read after mutations. */
export function createReadScheduler(limit = 3) {
  let active = 0;
  const queued: (() => void)[] = [];
  const inFlight = new Map<string, Promise<void>>();
  const acquire = () => new Promise<void>(resolve => {
    const start = () => { active++; resolve(); };
    if (active < limit) start(); else queued.push(start);
  });
  return {
    run(key: string, job: () => Promise<unknown>, fresh = false): Promise<void> {
      const previous = inFlight.get(key);
      if (previous && !fresh) return previous;
      const pending = (async () => {
        if (previous) await previous.catch(() => undefined);
        await acquire();
        try { await job(); }
        finally { active--; queued.shift()?.(); }
      })();
      inFlight.set(key, pending);
      void pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key); }).catch(() => undefined);
      return pending;
    },
  };
}
