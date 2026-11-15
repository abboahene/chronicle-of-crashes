import { useEffect } from 'react';

const STORAGE_KEY = 'color-scheme';

function getSystemScheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMetaScheme(value: string | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = value === 'light' || value === 'dark' ? value : 'light dark';
  }
}

export function ThemeToggle() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        applyMetaScheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleToggle = () => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const system = getSystemScheme();
    const currentStored = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();

    const currentlyRendered =
      currentStored === 'light' || currentStored === 'dark' ? currentStored : system;
    const target = currentlyRendered === 'dark' ? 'light' : 'dark';

    if (target === system) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors in restricted contexts
      }
      if (meta) meta.content = 'light dark';
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, target);
      } catch {
        // Ignore storage errors in restricted contexts
      }
      if (meta) meta.content = target;
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleToggle}
      aria-label="Toggle color theme"
    >
      <span className="icon-sun" aria-hidden="true">
        ☀ Light
      </span>
      <span className="icon-moon" aria-hidden="true">
        ☾ Dark
      </span>
    </button>
  );
}

