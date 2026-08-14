/**
 * 存储抽象层。
 *
 * store 的一切读写都必须经过 StorageAdapter，不得直接触碰 localStorage。
 * V1 的实现是 localStorage；V2 接云同步时只需换掉这里的实现
 * （PRD 附录 B 预留接口约定）。
 */

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/** localStorage 实现。隐私模式或配额耗尽时静默降级，不让应用崩掉。 */
function createLocalStorageAdapter(): StorageAdapter {
  return {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // 写不进去就算了，本次会话仍可正常使用。
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // 同上。
      }
    },
  };
}

/** 无 localStorage 环境（SSR、测试）下的内存实现。 */
function createMemoryAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

function detectAdapter(): StorageAdapter {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__biguan_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return createLocalStorageAdapter();
    }
  } catch {
    // 落到内存实现。
  }
  return createMemoryAdapter();
}

export const storage: StorageAdapter = detectAdapter();

/** 读取并解析 JSON，失败返回 null。 */
export function readJSON<T>(adapter: StorageAdapter, key: string): T | null {
  const raw = adapter.read(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 序列化并写入。 */
export function writeJSON(
  adapter: StorageAdapter,
  key: string,
  value: unknown
): void {
  try {
    adapter.write(key, JSON.stringify(value));
  } catch {
    // 序列化失败（循环引用等）不应影响运行。
  }
}
