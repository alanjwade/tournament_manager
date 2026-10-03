import { useEffect, useMemo, useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import type { CommitSummary, HistoryTag } from '../../shared/history';

/**
 * History view for the git-like commit journal.
 *
 * Each entry is a committed state transition labelled with the operation that
 * caused it (e.g. "Moved Mason Crosby from ... Pool 1 to ... Pool 2 (forms)").
 * Restoring appends a new forward-only commit, so history is never lost, and
 * baselines are named tags pointing at commits.
 */
export default function HistoryPanel() {
  const history = useTournamentStore((state) => state.history);
  const historyTags = useTournamentStore((state) => state.historyTags);
  const historyHeadId = useTournamentStore((state) => state.historyHeadId);
  const loadHistory = useTournamentStore((state) => state.loadHistory);
  const restoreCommit = useTournamentStore((state) => state.restoreCommit);
  const createHistoryTag = useTournamentStore((state) => state.createHistoryTag);
  const deleteHistoryTag = useTournamentStore((state) => state.deleteHistoryTag);

  const [tagName, setTagName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [history]
  );

  const tagsByCommit = useMemo(() => {
    const map = new Map<string, HistoryTag[]>();
    for (const tag of historyTags) {
      const list = map.get(tag.commitId) ?? [];
      list.push(tag);
      map.set(tag.commitId, list);
    }
    return map;
  }, [historyTags]);

  const handleRestore = async (commit: CommitSummary) => {
    if (
      !confirm(
        `Restore the data to this state?\n\n"${commit.operation.description}"\n\n` +
          'This appends a new restore commit; existing history is preserved.'
      )
    ) {
      return;
    }
    setBusy(true);
    const ok = await restoreCommit(commit.id);
    setBusy(false);
    alert(ok ? 'Restored successfully.' : 'Failed to restore this commit.');
  };

  const handleCreateTag = async () => {
    const name = tagName.trim() || `Baseline ${new Date().toLocaleString()}`;
    await createHistoryTag(name);
    setTagName('');
  };

  return (
    <div className="history-panel" style={{ width: 'fit-content', minWidth: 0 }}>
      <h2>History</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '720px' }}>
        Every change is committed with the operation that caused it. Restore any point in time;
        baselines are saved as named tags.
      </p>

      <div style={{ display: 'flex', gap: '10px', margin: '16px 0', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Baseline name (optional)"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          style={{ flex: 1, maxWidth: '360px', padding: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
        />
        <button onClick={handleCreateTag} disabled={!historyHeadId}>
          Create Baseline
        </button>
      </div>

      {historyTags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '13px' }}>Baselines ({historyTags.length})</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {historyTags.map((tag) => (
              <span
                key={tag.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '12px' }}
              >
                {tag.name}
                <button
                  onClick={() => deleteHistoryTag(tag.id)}
                  title="Delete baseline"
                  style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 0 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <h3>Commits ({history.length})</h3>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No commits yet.</p>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {sorted.map((commit) => {
            const isHead = commit.id === historyHeadId;
            const tags = tagsByCommit.get(commit.id) ?? [];
            return (
              <div
                key={commit.id}
                style={{ padding: '10px', marginBottom: '8px', backgroundColor: isHead ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', border: isHead ? '2px solid #007bff' : '1px solid var(--border-color)', borderRadius: '4px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {commit.operation.description}
                    {isHead && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#007bff' }}>(current)</span>}
                  </div>
                  <button onClick={() => handleRestore(commit)} disabled={busy || isHead}>
                    Restore
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {new Date(commit.timestamp).toLocaleString()} · {commit.stats.participants} participants · {commit.id.slice(0, 8)}
                  {commit.author === 'system' && ' · system'}
                  {tags.length > 0 && ` · 🏷 ${tags.map((t) => t.name).join(', ')}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
