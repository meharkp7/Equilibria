import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ApiError,
  checkHealth,
  fetchObservation,
  fetchPolicies,
  resetEnv,
  stepEnv,
  stepHeuristic,
  stepPpo,
} from './api.js';
import { EpisodeGrade } from './EpisodeGrade.jsx';
import { resolveApiBase } from './config.js';
import {
  getOrCreateSessionId,
  setSessionId,
  usePersistedSettings,
} from './usePersistedSettings.js';

const DEFAULT_API_BASE = resolveApiBase();
const TASKS = ['easy', 'medium', 'hard'];
const ACTIONS = [
  { label: 'Recommend', type: 'recommend', icon: '◆' },
  { label: 'Pause Session', type: 'pause_session', icon: '‖' },
  { label: 'Diversify Feed', type: 'diversify_feed', icon: '◎' },
  { label: 'Explore New Topic', type: 'explore_new_topic', icon: '↗' },
];

const METRICS = [
  { key: 'visible_trust', label: 'Trust', barClass: 'metric-bar__fill--trust' },
  { key: 'visible_satisfaction', label: 'Satisfaction', barClass: 'metric-bar__fill--satisfaction' },
  { key: 'visible_fatigue', label: 'Fatigue', barClass: 'metric-bar__fill--fatigue' },
  { key: 'visible_boredom', label: 'Boredom', barClass: 'metric-bar__fill--boredom' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

function MetricTile({ label, value, barClass }) {
  const pct = Math.min(100, Math.max(0, (value ?? 0) * 100));
  return (
    <div className="metric-tile">
      <div className="metric-tile__label">
        <strong>{label}</strong>
        <span>{value?.toFixed(2) ?? '—'}</span>
      </div>
      <div className="metric-bar">
        <div className={`metric-bar__fill ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatApiError(err) {
  if (err instanceof ApiError) {
    return err.code ? `[${err.code}] ${err.message}` : err.message;
  }
  return err?.message || 'Unknown error';
}

function policyHistoryLabel(payload) {
  const pa = payload.policy_action;
  if (!pa) return payload.policy || 'step';
  const base = pa.action_type || 'action';
  return pa.content_id ? `${base} · ${pa.content_id}` : base;
}

function App() {
  const [settings, updateSettings] = usePersistedSettings({
    apiBase: DEFAULT_API_BASE,
    task: 'easy',
  });
  const { apiBase, task } = settings;

  const [sessionId, setSessionIdState] = useState(getOrCreateSessionId);
  const [observation, setObservation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedContent, setSelectedContent] = useState('');
  const [statusInfo, setStatusInfo] = useState({ reward: null, done: false, info: null });
  const [connection, setConnection] = useState('checking');
  const [policies, setPolicies] = useState({ heuristic: true, ppo: false });
  const [lastPolicyAction, setLastPolicyAction] = useState(null);
  const [autoRunning, setAutoRunning] = useState(false);

  const episodeDone = statusInfo.done;
  const episodeGrade = statusInfo.info?.episode_grade ?? null;

  const contentOptions = useMemo(() => {
    return observation?.available_content?.map((c) => c.content_id) || [];
  }, [observation]);

  const currentContent = selectedContent || contentOptions[0] || '';

  const rewardClass =
    statusInfo.reward == null
      ? ''
      : statusInfo.reward >= 0
        ? 'reward-positive'
        : 'reward-negative';

  const updateHistory = (entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 12));
  };

  const handleError = useCallback((err) => {
    setError(formatApiError(err));
    setTimeout(() => setError(''), 6000);
  }, []);

  const probeHealth = useCallback(async () => {
    try {
      await checkHealth(apiBase);
      setConnection('online');
    } catch {
      setConnection('offline');
    }
  }, [apiBase]);

  const loadPolicies = useCallback(async () => {
    try {
      const data = await fetchPolicies(apiBase, task);
      setPolicies({ heuristic: data.heuristic !== false, ppo: Boolean(data.ppo) });
    } catch {
      setPolicies({ heuristic: true, ppo: false });
    }
  }, [apiBase, task]);

  useEffect(() => {
    probeHealth();
    loadPolicies();
    const interval = setInterval(probeHealth, 15_000);
    return () => clearInterval(interval);
  }, [probeHealth, loadPolicies]);

  const applyStepPayload = useCallback((payload) => {
    setObservation(payload.observation);
    setStatusInfo({ reward: payload.reward, done: payload.done, info: payload.info });
    if (payload.policy_action) {
      setLastPolicyAction({ policy: payload.policy, ...payload.policy_action });
      if (payload.policy_action.content_id) {
        setSelectedContent(payload.policy_action.content_id);
      }
    }
    updateHistory({
      type: policyHistoryLabel(payload),
      policy: payload.policy,
      reward: payload.reward,
      done: payload.done,
      time: new Date().toLocaleTimeString(),
    });
    if (payload.done) {
      updateHistory({ type: 'finished', time: new Date().toLocaleTimeString() });
    }
  }, []);

  const syncObservation = useCallback(async () => {
    if (!observation) return;
    try {
      const data = await fetchObservation(apiBase, sessionId);
      setObservation(data.observation);
      if (data.done) setStatusInfo((s) => ({ ...s, done: true }));
    } catch {
      /* non-fatal */
    }
  }, [apiBase, sessionId, observation]);

  const handleReset = async (freshSession = false) => {
    setLoading(true);
    setError('');
    setLastPolicyAction(null);
    setAutoRunning(false);
    try {
      const payload = await resetEnv(apiBase, sessionId, { task, newSession: freshSession });
      if (payload.session_id) {
        setSessionIdState(payload.session_id);
        setSessionId(payload.session_id);
      }
      setObservation(payload.observation);
      setStatusInfo({ reward: null, done: false, info: null });
      setSelectedContent(payload.observation?.available_content?.[0]?.content_id || '');
      updateHistory({ type: 'reset', task, time: new Date().toLocaleTimeString() });
      await loadPolicies();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const runStep = async (stepFn) => {
    if (!observation) {
      handleError(new ApiError('Call reset before taking a step.', { code: 'NOT_RESET' }));
      return null;
    }
    if (episodeDone) {
      handleError(new ApiError('Episode finished — reset to continue.', { code: 'EPISODE_DONE' }));
      return null;
    }
    setLoading(true);
    try {
      const payload = await stepFn();
      applyStepPayload(payload);
      return payload;
    } catch (err) {
      handleError(err);
      if (err instanceof ApiError && err.code === 'EPISODE_DONE') {
        setStatusInfo((s) => ({ ...s, done: true }));
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleManualStep = (actionType) => {
    const action = { action_type: actionType };
    if (actionType === 'recommend') action.content_id = currentContent;
    return runStep(() => stepEnv(apiBase, sessionId, action));
  };

  const handleHeuristicStep = () => runStep(() => stepHeuristic(apiBase, sessionId));
  const handlePpoStep = () => runStep(() => stepPpo(apiBase, sessionId));

  const handleRunHeuristicEpisode = async () => {
    if (!observation || episodeDone) return;
    setAutoRunning(true);
    setLoading(true);
    try {
      for (let i = 0; i < 30; i += 1) {
        const payload = await stepHeuristic(apiBase, sessionId);
        applyStepPayload(payload);
        if (payload.done) break;
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setAutoRunning(false);
    }
  };

  const connectionLabel =
    connection === 'online' ? 'Connected' : connection === 'offline' ? 'Unreachable' : 'Checking…';

  const actionsDisabled = loading || autoRunning || episodeDone || !observation;

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient__mesh" />
        <div className="ambient__orb ambient__orb--violet" />
        <div className="ambient__orb ambient__orb--cyan" />
        <div className="ambient__orb ambient__orb--emerald" />
        <div className="ambient__noise" />
      </div>

      <AnimatePresence>
        {(loading || autoRunning) && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-spinner" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-shell">
        <motion.header
          className="hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero__brand">
            <p className="eyebrow">Equilibria · Attention Economy</p>
            <h1>Policy playground</h1>
            <p className="subtitle">
              Compare manual control, ethical heuristics, and trained PPO on the same live session.
            </p>
          </div>
          <div className="hero__status">
            <div className={`status-chip status-chip--live status-chip--${connection}`}>
              <span>
                <span className="status-dot" />
                API
              </span>
              <strong>{connectionLabel}</strong>
            </div>
            <div className="status-chip">
              <span>Session</span>
              <strong>{observation ? 'Active' : 'Idle'}</strong>
            </div>
            <div className="status-chip">
              <span>Task</span>
              <strong>{observation?.task_id ?? task}</strong>
            </div>
            <div className="status-chip">
              <span>Step</span>
              <strong>{observation?.step_count ?? '—'}</strong>
            </div>
          </div>
        </motion.header>

        <AnimatePresence>
          {episodeDone && (
            <motion.div
              className="episode-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>Episode complete</span>
              <button className="secondary" onClick={() => handleReset(false)} disabled={loading}>
                Start new episode
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {episodeGrade && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginBottom: 22 }}
            >
              <EpisodeGrade grade={episodeGrade} />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="layout-grid">
          <motion.section className="card config-card" custom={0} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">⚙</span>
              <h2>Connection</h2>
            </div>
            <label>
              Backend URL
              <input
                value={apiBase}
                onChange={(e) => updateSettings({ apiBase: e.target.value })}
                onBlur={() => {
                  probeHealth();
                  loadPolicies();
                }}
                placeholder={DEFAULT_API_BASE || 'https://your-space.hf.space'}
              />
            </label>
            <label>
              Task difficulty
              <select value={task} onChange={(e) => updateSettings({ task: e.target.value })}>
                {TASKS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button className="primary" onClick={() => handleReset(false)} disabled={loading || autoRunning}>
                Reset environment
              </button>
              <button className="secondary" onClick={() => handleReset(true)} disabled={loading || autoRunning}>
                New session
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => updateSettings({ apiBase: resolveApiBase() })}
                title="Point API at this host (HF Space or local)"
              >
                Use this host
              </button>
            </div>
            <p className="session-hint">Session {sessionId.slice(0, 8)}…</p>
            <AnimatePresence>
              {error && (
                <motion.p className="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.section>

          <motion.section className="card policy-card" custom={1} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">⚡</span>
              <h2>Policy comparison</h2>
            </div>
            <p className="policy-desc">
              Run automated policies on the <em>same</em> session as manual steps. Compare outcomes in the action log and episode grade.
            </p>
            <div className="policy-columns">
              <div className="policy-block">
                <h3>Heuristic</h3>
                <p className="policy-meta">Ethical rules · mirrors <code>inference.py</code></p>
                <div className="button-row">
                  <button className="primary" onClick={handleHeuristicStep} disabled={actionsDisabled}>
                    Auto step
                  </button>
                  <button className="secondary" onClick={handleRunHeuristicEpisode} disabled={actionsDisabled}>
                    Run episode
                  </button>
                </div>
              </div>
              <div className="policy-block">
                <h3>PPO</h3>
                <p className="policy-meta">
                  {policies.ppo ? 'Checkpoint loaded for task' : 'No model — train with train_rl.py'}
                </p>
                <div className="button-row">
                  <button className="secondary" onClick={handlePpoStep} disabled={actionsDisabled || !policies.ppo}>
                    PPO step
                  </button>
                </div>
              </div>
            </div>
            {lastPolicyAction && (
              <p className="last-policy">
                Last auto: <strong>{lastPolicyAction.policy}</strong> → {lastPolicyAction.action_type}
                {lastPolicyAction.content_id && ` · ${lastPolicyAction.content_id}`}
                {lastPolicyAction.reasoning && (
                  <span className="policy-reason"> ({lastPolicyAction.reasoning})</span>
                )}
              </p>
            )}
          </motion.section>

          <motion.section className="card observation-card" custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">◉</span>
              <h2>Observation</h2>
              {observation && (
                <button className="link-btn" onClick={syncObservation} disabled={loading} type="button">
                  Refresh
                </button>
              )}
            </div>
            {!observation ? (
              <p className="placeholder">Reset the environment to load state metrics.</p>
            ) : (
              <div className="observation-grid">
                {METRICS.map(({ key, label, barClass }) => (
                  <MetricTile key={key} label={label} value={observation[key]} barClass={barClass} />
                ))}
                <div className="metric-tile metric-tile--plain">
                  <div className="metric-tile__label">
                    <strong>Step count</strong>
                    <span>{observation.step_count}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          <motion.section className="card action-card" custom={3} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">▶</span>
              <h2>Manual actions</h2>
            </div>
            <label>
              Content to recommend
              <select
                value={currentContent}
                onChange={(e) => setSelectedContent(e.target.value)}
                disabled={!contentOptions.length || actionsDisabled}
              >
                {contentOptions.map((contentId) => (
                  <option key={contentId} value={contentId}>
                    {contentId}
                  </option>
                ))}
              </select>
            </label>
            <div className="button-grid">
              {ACTIONS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleManualStep(item.type)}
                  disabled={actionsDisabled}
                  className={item.type === 'recommend' ? 'primary' : 'secondary'}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            <div className="status-panel">
              <p>
                <strong>Reward</strong>
                <span className={`value ${rewardClass}`}>
                  {statusInfo.reward != null ? statusInfo.reward.toFixed(4) : '—'}
                </span>
              </p>
              <p>
                <strong>Done</strong>
                <span className="value">{String(statusInfo.done)}</span>
              </p>
            </div>
          </motion.section>

          <motion.section className="card content-card" custom={4} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">▦</span>
              <h2>Feed</h2>
            </div>
            {observation?.available_content?.length ? (
              <div className="content-grid">
                {observation.available_content.map((item) => (
                  <motion.article
                    key={item.content_id}
                    className={`content-card-item${currentContent === item.content_id ? ' content-card-item--selected' : ''}`}
                    onClick={() => setSelectedContent(item.content_id)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedContent(item.content_id)}
                    role="button"
                    tabIndex={0}
                    whileHover={{ y: -3 }}
                  >
                    <div className="content-badge">{item.content_id}</div>
                    <p>
                      <strong>Topic</strong>
                      {Object.keys(item.topic_relevance).join(', ')}
                    </p>
                    <div className="content-scores">
                      <span className="score-pill score-pill--manip">
                        manip {item.manipulation_score.toFixed(2)}
                      </span>
                      <span className="score-pill score-pill--addict">
                        addict {item.addictiveness.toFixed(2)}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <p className="placeholder">No feed loaded. Reset to fetch available content.</p>
            )}
          </motion.section>

          <motion.section className="card history-card" custom={5} variants={cardVariants} initial="hidden" animate="visible">
            <div className="card__head">
              <span className="card__icon">↺</span>
              <h2>Action log</h2>
            </div>
            {history.length ? (
              <ul className="history-list">
                {history.map((item, index) => (
                  <motion.li
                    key={`${item.type}-${index}-${item.time}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span className="time">{item.time}</span>
                    <span className="action-type">
                      {item.policy && <span className="policy-tag">{item.policy}</span>}
                      {String(item.type).replace(/_/g, ' ')}
                    </span>
                    <span className="meta">
                      {item.reward != null && <span>Δ {item.reward.toFixed(3)}</span>}
                      {item.done && <span className="done-pill">done</span>}
                    </span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="placeholder">No actions yet. Reset and step to build a log.</p>
            )}
          </motion.section>
        </main>
      </div>
    </>
  );
}

export default App;
