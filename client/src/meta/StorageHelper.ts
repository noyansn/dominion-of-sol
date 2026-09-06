/**
 * Safe local storage wrapper with memory fallback for SSR / headless tests / private browsing.
 */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch { /* empty */ }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch { /* empty */ }
    memoryStore.set(key, String(value));
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch { /* empty */ }
    memoryStore.delete(key);
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch { /* empty */ }
    memoryStore.clear();
  },
};
