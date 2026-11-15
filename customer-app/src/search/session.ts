import { readSearchCache, writeSearchCache, searchGeneration } from './cache';
export type SearchPage<T> = { items: T[]; page: number; hasMore: boolean };
export type SearchState<T> = SearchPage<T> & { loading: boolean; error: string; searched: boolean };

// A session owns one scope. Closing it cancels both debounce and network work.
export function createSearchSession<T>(identity: string, fetchPage: (q: string, page: number, signal: AbortSignal) => Promise<SearchPage<T>>, emit: (s: SearchState<T>) => void) {
  let state: SearchState<T> = { items: [], page: 1, hasMore: false, loading: false, error: '', searched: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let sequence = 0;
  let closed = false;
  let query = '';
  const publish = (patch: Partial<SearchState<T>>) => { state = { ...state, ...patch }; if (!closed) emit(state); };
  const cancel = () => { sequence++; clearTimeout(timer); controller?.abort(); };
  const run = async (page = 1) => {
    cancel();
    if (closed || !query) return;
    const seq = sequence;
    const generation = searchGeneration();
    const term = query;
    const key = JSON.stringify([identity, generation, term, page]);
    controller = new AbortController();
    const signal = controller.signal;
    publish({ loading: true, error: '', searched: true });
    try {
      const cached = readSearchCache<SearchPage<T>>(key);
      const result = cached || await fetchPage(term, page, signal);
      if (closed || signal.aborted || seq !== sequence || generation !== searchGeneration()) return;
      if (!cached) writeSearchCache(key, result);
      publish({ ...result, items: page === 1 ? result.items : [...state.items, ...result.items], loading: false });
    } catch (error) {
      if (closed || signal.aborted || seq !== sequence || generation !== searchGeneration()) return;
      publish({ loading: false, error: (error as Error).message || 'تعذر البحث. حاول مجدداً.' });
    }
  };
  return {
    change(value: string) {
      cancel(); query = value.trim();
      publish({ items: [], page: 1, hasMore: false, loading: false, error: '', searched: false });
      if (query.length >= 2) timer = setTimeout(() => { void run(); }, 350);
    },
    submit() { void run(); },
    more() { if (!state.loading && state.hasMore) void run(state.page + 1); },
    retry() { void run(state.items.length ? state.page + 1 : 1); },
    close() { closed = true; cancel(); },
  };
}
