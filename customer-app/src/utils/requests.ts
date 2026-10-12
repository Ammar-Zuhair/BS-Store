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

/** Bound detail reads across independently mounted bundle pieces. */
export function createReadLimiter(limit = 3) {
  let running = 0;
  const queued: (() => void)[] = [];
  return function read<T>(job: () => Promise<T>): Promise<T> { return new Promise((resolve, reject) => {
    const start = () => {
      running++;
      Promise.resolve().then(job).then(resolve, reject).finally(() => {
        running--;
        queued.shift()?.();
      });
    };
    if (running < limit) start(); else queued.push(start);
  }); };
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
