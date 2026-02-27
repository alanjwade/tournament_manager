import React, { useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { formatPoolNameForDisplay } from '../utils/ringNameFormatter';
import { getEffectiveDivision } from '../utils/excelParser';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const checkpoints = useTournamentStore((state) => state.checkpoints);

  // Compute competition rings
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  // Calculate statistics by division
  const divisionStats = useMemo(() => {
    const stats = new Map<string, {
      total: number;
      formsParticipation: number;
      sparringParticipation: number;
    }>();

    // Initialize stats for each division
    config.divisions.forEach(div => {
      stats.set(div.name, {
        total: 0,
        formsParticipation: 0,
        sparringParticipation: 0,
      });
    });

    // Count participants per division
    participants.forEach(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');
      
      // Track unique participants per division
      const divisionsCounted = new Set<string>();
      
      if (formsDivision && stats.has(formsDivision) && p.competingForms) {
        const s = stats.get(formsDivision)!;
        if (!divisionsCounted.has(formsDivision)) {
          s.total++;
          divisionsCounted.add(formsDivision);
        }
        s.formsParticipation++;
      }
      
      if (sparringDivision && stats.has(sparringDivision) && p.competingSparring) {
        const s = stats.get(sparringDivision)!;
        if (!divisionsCounted.has(sparringDivision)) {
          s.total++;
          divisionsCounted.add(sparringDivision);
        }
        s.sparringParticipation++;
      }
    });

    return stats;
  }, [participants, config.divisions]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const participatingParticipants = participants.filter(p => p.competingForms || p.competingSparring);

    const formsParticipants = participants.filter(p => p.competingForms);
    const sparringParticipants = participants.filter(p => p.competingSparring);
    const formsWithCategory = formsParticipants.filter(p => p.formsCategoryId);
    const sparringWithCategory = sparringParticipants.filter(p => p.sparringCategoryId);

    const withCategory = participatingParticipants.filter(p => p.formsCategoryId || p.sparringCategoryId);
    const withoutCategory = participatingParticipants.filter(p => !p.formsCategoryId && !p.sparringCategoryId);
    const withRing = participatingParticipants.filter(p => p.formsPool || p.sparringPool);

    return {
      totalParticipants: participants.length,
      participatingParticipants: participatingParticipants.length,
      formsParticipants: formsParticipants.length,
      sparringParticipants: sparringParticipants.length,
      formsWithCategory: formsWithCategory.length,
      sparringWithCategory: sparringWithCategory.length,
      withCategory: withCategory.length,
      withoutCategory: withoutCategory.length,
      withRing: withRing.length,
      categoryPercent: participatingParticipants.length > 0 
        ? Math.round((withCategory.length / participatingParticipants.length) * 100) 
        : 0,
      ringPercent: participatingParticipants.length > 0 
        ? Math.round((withRing.length / participatingParticipants.length) * 100) 
        : 0,
    };
  }, [participants]);

  // Physical ring mapping analysis
  const mappingAnalysis = useMemo(() => {
    const unmappedRings: string[] = [];
    
    competitionRings.forEach(ring => {
      const hasMapping = physicalRingMappings.some(m => m.categoryPoolName === ring.name);
      if (!hasMapping && ring.name) {
        unmappedRings.push(formatPoolNameForDisplay(ring.name));
      }
    });

    return unmappedRings;
  }, [competitionRings, physicalRingMappings]);

  // Workflow progress
  const workflowStatus = useMemo(() => {
    const steps = [
      {
        name: 'Import Data',
        status: participants.length > 0 ? 'complete' : 'pending',
        detail: participants.length > 0 ? `${participants.length} participants` : 'No data imported',
        tab: 'import',
      },
      {
        name: 'Assign Categories',
        status: overallStats.categoryPercent === 100 
          ? 'complete' 
          : overallStats.categoryPercent > 0 
            ? 'in-progress' 
            : 'pending',
        detail: `${overallStats.categoryPercent}% assigned (auto-assigned to pools)`,
        tab: 'categories',
      },
      {
        name: 'Map Physical Rings',
        status: mappingAnalysis.length === 0 && competitionRings.length > 0 
          ? 'complete' 
          : mappingAnalysis.length < competitionRings.length && competitionRings.length > 0
            ? 'in-progress' 
            : 'pending',
        detail: competitionRings.length > 0 
          ? `${competitionRings.length - mappingAnalysis.length}/${competitionRings.length} mapped`
          : 'No rings to map',
        tab: 'ringmap',
      },
      {
        name: 'Create Checkpoint',
        status: checkpoints.length > 0 ? 'complete' : 'pending',
        detail: checkpoints.length > 0 ? `${checkpoints.length} checkpoint(s)` : 'No checkpoints',
        tab: 'checkpoints',
      },
    ];

    return steps;
  }, [participants, overallStats, mappingAnalysis, competitionRings, checkpoints]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⬜';
      default: return '⬜';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return '#28a745';
      case 'in-progress': return '#ffc107';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Count all warnings
  const warningCount = mappingAnalysis.length + overallStats.withoutCategory;

  return (
    <div style={{ padding: '20px', width: 'fit-content', minWidth: 0 }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Tournament Dashboard</h2>

      {/* Quick Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{overallStats.totalParticipants}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Participants</div>
        </div>

        <div style={{
          backgroundColor: '#17a2b8',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{categories.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Categories</div>
        </div>

        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{competitionRings.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Competition Rings</div>
        </div>

        <div style={{
          backgroundColor: warningCount > 0 ? '#dc3545' : '#6c757d',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{warningCount}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Warnings</div>
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '25px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>Workflow Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workflowStatus.map((step, idx) => (
            <div 
              key={idx}
              onClick={() => onNavigate(step.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 15px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                cursor: 'pointer',
                border: `2px solid ${step.status === 'in-progress' ? '#ffc107' : 'transparent'}`,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            >
              <span style={{ fontSize: '20px', marginRight: '12px' }}>{getStatusIcon(step.status)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: getStatusColor(step.status) }}>{step.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{step.detail}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Division Breakdown */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '25px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>Participants by Division</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-primary)' }}>Division</th>
              <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-primary)' }}>Total</th>
              <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-primary)' }}>Forms Participation</th>
              <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-primary)' }}>Sparring Participation</th>
            </tr>
          </thead>
          <tbody>
            {[...config.divisions].sort((a, b) => a.order - b.order).map(div => {
              const stats = divisionStats.get(div.name);
              if (!stats || stats.total === 0) return null;
              return (
                <tr key={div.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '8px'
                    }}>
                      {div.abbreviation || div.name.substring(0, 4).toUpperCase()}
                    </span>
                    {div.name}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{stats.total}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {stats.formsParticipation}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {stats.sparringParticipation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Warnings & Issues */}
      {(overallStats.withoutCategory > 0 || mappingAnalysis.length > 0) && (
        <div style={{
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '25px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--warning-text)' }}>⚠️ Warnings & Issues</h3>
          
          {/* Participants not assigned to any category */}
          {overallStats.withoutCategory > 0 && (
            <div 
              onClick={() => onNavigate('categories')}
              style={{ 
                padding: '10px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <strong>{overallStats.withoutCategory}</strong> participants not assigned to any category
              <span style={{ float: 'right', color: 'var(--accent-primary)' }}>Go to Categories →</span>
            </div>
          )}

          {/* Unmapped pools */}
          {mappingAnalysis.length > 0 && (
            <div 
              onClick={() => onNavigate('ringmap')}
              style={{ 
                padding: '10px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <strong>{mappingAnalysis.length}</strong> pools not assigned to physical rings
              <span style={{ float: 'right', color: 'var(--accent-primary)' }}>Go to Ring Map →</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '20px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('tournament-day')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            🏆 Tournament Day Mode
          </button>
          <button
            onClick={() => onNavigate('export')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            📄 Export PDFs
          </button>
          <button
            onClick={() => onNavigate('checkpoints')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            💾 Manage Checkpoints
          </button>
          <button
            onClick={() => onNavigate('editor')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ✏️ Edit Participants
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
