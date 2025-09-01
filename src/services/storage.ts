// Storage service for handling browser storage operations
class StorageService {
  private storage: Storage;

  constructor(useSessionStorage = false) {
    this.storage = useSessionStorage ? sessionStorage : localStorage;
  }

  set<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      this.storage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = this.storage.getItem(key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error('Failed to read from storage:', error);
      return defaultValue || null;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from storage:', error);
    }
  }

  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  has(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }

  keys(): string[] {
    return Object.keys(this.storage);
  }
}

// Export instances for both storage types
export const localStorageService = new StorageService(false);
export const sessionStorageService = new StorageService(true);

export default StorageService;
