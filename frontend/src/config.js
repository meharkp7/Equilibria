/**
 * Resolve API base URL.
 * - VITE_API_BASE_URL set → use it (build-time)
 * - dev → localhost:7860
 * - production on HF / same host → current origin (API + UI in one container)
 */
export function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:7860';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://mk1647-attention-economy-env.hf.space';
}

export function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(String(url || '').trim());
}

/** Upgrade stale localStorage from local dev when user opens the deployed UI. */
export function normalizeStoredApiBase(stored) {
  if (typeof window === 'undefined') return stored;

  const onDeployedHost = !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  if (onDeployedHost && isLocalhostUrl(stored)) {
    return window.location.origin;
  }
  return stored;
}
