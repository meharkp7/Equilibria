export function EpisodeGrade({ grade }) {
  if (!grade) return null;

  const rows = [
    { label: 'Final score', key: 'final_score', highlight: true },
    { label: 'Avg engagement', key: 'avg_engagement' },
    { label: 'Final trust', key: 'final_trust' },
    { label: 'Final satisfaction', key: 'final_satisfaction' },
  ];

  return (
    <div className="grade-card">
      <h3>Episode grade</h3>
      <div className="grade-grid">
        {rows.map(({ label, key, highlight }) => (
          <div key={key} className={`grade-tile${highlight ? ' grade-tile--hero' : ''}`}>
            <span>{label}</span>
            <strong>{grade[key] != null ? Number(grade[key]).toFixed(4) : '—'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
