import { resolveApiBase } from './config.js';

const TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', detail = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function getBaseUrl(baseUrl) {
  const resolved = baseUrl != null && String(baseUrl).trim() !== '' ? baseUrl : resolveApiBase();
  return String(resolved).replace(/\/$/, '');
}

async function parseError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    const detail = json.detail;
    if (detail && typeof detail === 'object') {
      return new ApiError(detail.message || text, {
        status: response.status,
        code: detail.code || 'HTTP_ERROR',
        detail,
      });
    }
    if (typeof detail === 'string') {
      return new ApiError(detail, { status: response.status, code: 'HTTP_ERROR' });
    }
    return new ApiError(json.message || text, { status: response.status });
  } catch {
    return new ApiError(text || response.statusText, { status: response.status });
  }
}

export async function apiRequest(path, { baseUrl, sessionId, method = 'GET', body } = {}) {
  const url = `${getBaseUrl(baseUrl)}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = { Accept: 'application/json' };
  if (sessionId) headers['X-Session-Id'] = sessionId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) throw await parseError(response);

    if (response.status === 204) return null;
    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', { code: 'TIMEOUT' });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error', { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timer);
  }
}

export function checkHealth(baseUrl) {
  return apiRequest('/health', { baseUrl });
}

export function resetEnv(baseUrl, sessionId, { task, newSession = false }) {
  return apiRequest('/reset', {
    baseUrl,
    sessionId,
    method: 'POST',
    body: { task, new_session: newSession },
  });
}

export function stepEnv(baseUrl, sessionId, action) {
  return apiRequest('/step', {
    baseUrl,
    sessionId,
    method: 'POST',
    body: { action },
  });
}

export function stepHeuristic(baseUrl, sessionId) {
  return apiRequest('/step/heuristic', { baseUrl, sessionId, method: 'POST', body: {} });
}

export function stepPpo(baseUrl, sessionId) {
  return apiRequest('/step/ppo', { baseUrl, sessionId, method: 'POST', body: {} });
}

export function fetchPolicies(baseUrl, task) {
  return apiRequest(`/policies?task=${encodeURIComponent(task)}`, { baseUrl });
}

export function fetchObservation(baseUrl, sessionId) {
  return apiRequest('/observation', { baseUrl, sessionId });
}
