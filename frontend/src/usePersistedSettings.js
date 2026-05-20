import { useEffect, useState } from 'react';
import { normalizeStoredApiBase } from './config.js';

const STORAGE_KEY = 'equilibria.settings';

export function loadSettings(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = { ...defaults, ...JSON.parse(raw) };
    if (parsed.apiBase != null) {
      parsed.apiBase = normalizeStoredApiBase(parsed.apiBase);
    }
    return parsed;
  } catch {
    return defaults;
  }
}

export function saveSettings(partial) {
  try {
    const current = loadSettings({});
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function usePersistedSettings(defaults) {
  const [settings, setSettings] = useState(() => loadSettings(defaults));

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (partial) => setSettings((prev) => ({ ...prev, ...partial }));

  return [settings, update];
}

export function getOrCreateSessionId() {
  const key = 'equilibria.sessionId';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function setSessionId(id) {
  try {
    localStorage.setItem('equilibria.sessionId', id);
  } catch {
    /* ignore */
  }
}
