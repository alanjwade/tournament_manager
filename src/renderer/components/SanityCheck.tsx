import { useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeSanityStats } from '../utils/sanityStats';

interface SanityCheckProps {}

function SanityCheck({}: SanityCheckProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const config = useTournamentStore((state) => state.config);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);

  const stats = useMemo(
    () => computeSanityStats(participants, categories, config.divisions, physicalRingMappings),
    [participants, categories, config.divisions, physicalRingMappings]
  );

  const { divisions, totals, unmappedTotal, unmapped, configIssues, physicalRings, problemDetails } = stats;

  const divisionTotals = divisions.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      forms: acc.forms + d.forms,
      sparring: acc.sparring + d.sparring,
    }),
    { total: 0, forms: 0, sparring: 0 }
  );

  const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: string }) => (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  );

  const cellStyle = {
    padding: '8px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  const breakdownRows = [
    { label: 'Withdrawn', value: unmapped.withdrawn },
    { label: 'Not competing in Forms or Sparring', value: unmapped.notCompeting },
    { label: 'Competing but no division', value: unmapped.noDivision },
    { label: 'Competing in an unknown division (not in Configuration)', value: unmapped.unknownDivision },
    { label: 'Competing Forms but no Forms category', value: unmapped.formsNoCategory },
    { label: 'Competing Sparring but no Sparring category', value: unmapped.sparringNoCategory },
    { label: 'Has a category but no pool', value: unmapped.categoryNoPool },
    { label: 'Pool not mapped to a physical ring', value: unmapped.poolNoPhysicalRing },
    { label: 'Duplicate names', value: unmapped.duplicateNames },
  ];

  if (participants.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Sanity Check</h2>
        <div className="info">
          <p>No participants loaded yet. Import a spreadsheet to see totals here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Sanity Check</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0 }}>
        A read-only summary of who is competing and where. Withdrawn participants are excluded from
        the division counts and listed separately at the bottom.
      </p>

      {/* Grand totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '25px',
        }}
      >
        <StatCard label="Total participants" value={totals.participants} />
        <StatCard label="In a division" value={totals.inAnyDivision} />
        <StatCard label="Competing Forms" value={totals.formsCompeting} accent="#007bff" />
        <StatCard label="Competing Sparring" value={totals.sparringCompeting} accent="#dc3545" />
        <StatCard
          label="Not mapped to anything"
          value={unmappedTotal}
          accent={unmappedTotal > 0 ? '#ffc107' : '#28a745'}
        />
      </div>

      {/* Per-division table */}
      <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>By division</h3>
      <div style={{ overflowX: 'auto', marginBottom: '25px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--border-color)' }}>Division</th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '2px solid var(--border-color)' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '2px solid var(--border-color)' }}>Forms</th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '2px solid var(--border-color)' }}>Sparring</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((d) => (
              <tr key={d.name}>
                <td style={cellStyle}>{d.name}</td>
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{d.total}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{d.forms}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{d.sparring}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <td style={{ ...cellStyle, fontWeight: 'bold' }}>All divisions (sum)</td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{divisionTotals.total}</td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{divisionTotals.forms}</td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{divisionTotals.sparring}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Not counted in a division */}
      <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>
        Not counted in a division ({unmappedTotal})
      </h3>
      <div
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '25px',
        }}
      >
        {breakdownRows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '8px 12px',
              borderTop: i === 0 ? undefined : '1px solid var(--border-color)',
              backgroundColor: i % 2 ? 'var(--bg-secondary)' : 'transparent',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>{row.label}</span>
            <span style={{ fontWeight: 'bold', color: row.value > 0 ? '#ffc107' : 'var(--text-muted)' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {problemDetails.notInDivision.length > 0 && (
        <details
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 12px',
            marginTop: '10px',
            marginBottom: '25px',
          }}
        >
          <summary style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>
            Show who they are ({problemDetails.notInDivision.length})
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
            {problemDetails.notInDivision.map((m, i) => (
              <li key={`${m.reason}-${m.participant}-${i}`}>
                {m.participant} — {m.reason}
                {m.detail ? ` (${m.detail})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Configuration checks (explains the Configuration tab badge) */}
      <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>Configuration checks</h3>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
        The "rings" number is each division's <strong>Rings</strong> value saved in Configuration. If it
        doesn't match how many rings you actually have, change it on the Configuration tab.
      </p>
      {configIssues.length === 0 ? (
        <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', color: 'var(--text-primary)', marginBottom: '25px' }}>
          ✅ No configuration issues. The Configuration tab badge is clear.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
          {configIssues.map((issue, i) => (
            <div
              key={`${issue.division}-${issue.kind}-${i}`}
              style={{
                border: '1px solid var(--warning-border, #ffeeba)',
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: 'var(--warning-bg, #fff3cd)',
              }}
            >
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {issue.division}: {issue.message}
              </div>
              <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)' }}>
                Configured rings: <strong>{issue.configuredRings}</strong> (from Configuration) ·{' '}
                {issue.type === 'forms' ? 'Forms' : 'Sparring'} pools: <strong>{issue.poolCount}</strong>
              </div>
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {issue.categories.length} categor{issue.categories.length === 1 ? 'y' : 'ies'} contributing pools
                </summary>
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {issue.categories.map((c) => (
                    <li key={c.id}>
                      {c.name} — {c.numPools} pool{c.numPools === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
                <details style={{ marginTop: '6px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Pools and participant counts
                  </summary>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {issue.pools.map((pool) => (
                      <li key={pool.name}>
                        {pool.name} — {pool.participantCount} participant{pool.participantCount === 1 ? '' : 's'}
                      </li>
                    ))}
                  </ul>
                </details>
              </details>
            </div>
          ))}
        </div>
      )}
    {/* Physical rings in use */}
      <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>
        Physical rings in use ({physicalRings.length})
      </h3>
      {physicalRings.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 0, marginBottom: '25px' }}>
          No pools have been mapped to physical rings yet (Ring Map tab).
        </p>
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '25px', overflow: 'hidden' }}>
          {physicalRings.map((ring, i) => (
            <details key={ring.name} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-color)', padding: '8px 12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-primary)' }}>
                <strong>{ring.name}</strong> — {ring.pools.length} pool{ring.pools.length === 1 ? '' : 's'}
              </summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
                {ring.pools.map((pool) => (
                  <li key={pool}>{pool}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {/* Who/what is behind the problems */}
      <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>People &amp; pools behind the problems</h3>
      {problemDetails.missingCategory.length === 0 &&
      problemDetails.categoryNoPool.length === 0 &&
      problemDetails.unmappedPools.length === 0 ? (
        <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', color: 'var(--text-primary)' }}>
          ✅ No participant/pool problems found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {problemDetails.unmappedPools.length > 0 && (
            <details style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Pools with no physical ring ({problemDetails.unmappedPools.length})
              </summary>
              {problemDetails.unmappedPools.map((p) => (
                <div key={`${p.type}-${p.poolName}`} style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <strong>{p.poolName}</strong> ({p.type}) — {p.participants.length} participant
                  {p.participants.length === 1 ? '' : 's'}
                  <div style={{ color: 'var(--text-secondary)' }}>{p.participants.join(', ')}</div>
                </div>
              ))}
            </details>
          )}
          {problemDetails.missingCategory.length > 0 && (
            <details style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Competing but no category ({problemDetails.missingCategory.length})
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
                {problemDetails.missingCategory.map((m, i) => (
                  <li key={`${m.type}-${m.participant}-${i}`}>
                    {m.participant} — {m.type} · {m.detail}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {problemDetails.categoryNoPool.length > 0 && (
            <details style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Has a category but no pool ({problemDetails.categoryNoPool.length})
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)' }}>
                {problemDetails.categoryNoPool.map((m, i) => (
                  <li key={`${m.type}-${m.participant}-${i}`}>
                    {m.participant} — {m.type} · {m.detail}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default SanityCheck;
