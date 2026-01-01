import React, { useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { getEffectiveDivision } from '../utils/excelParser';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const checkpoints = useTournamentStore((state) => state.checkpoints);

  // Compute competition rings
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );

  // Calculate statistics by division
  const divisionStats = useMemo(() => {
    const stats = new Map<string, {
      total: number;
      formsAssigned: number;
      sparringAssigned: number;
      formsRingAssigned: number;
      sparringRingAssigned: number;
    }>();

    // Initialize stats for each division
    config.divisions.forEach(div => {
      stats.set(div.name, {
        total: 0,
        formsAssigned: 0,
        sparringAssigned: 0,
        formsRingAssigned: 0,
        sparringRingAssigned: 0,
      });
    });

    // Count participants per division
    participants.forEach(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');

      if (formsDivision && stats.has(formsDivision)) {
        const s = stats.get(formsDivision)!;
        s.total++;
        if (p.formsCohortId) s.formsAssigned++;
        if (p.formsCohortRing) s.formsRingAssigned++;
      }

      if (sparringDivision && stats.has(sparringDivision)) {
        const s = stats.get(sparringDivision)!;
        if (formsDivision !== sparringDivision) s.total++; // Only count if different division
        if (p.sparringCohortId) s.sparringAssigned++;
        if (p.sparringCohortRing) s.sparringRingAssigned++;
      }
    });

    return stats;
  }, [participants, config.divisions]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const formsParticipants = participants.filter(p => p.competingForms);
    const sparringParticipants = participants.filter(p => p.competingSparring);

    const formsWithCohort = formsParticipants.filter(p => p.formsCohortId);
    const sparringWithCohort = sparringParticipants.filter(p => p.sparringCohortId);

    const formsWithRing = formsParticipants.filter(p => p.formsCohortRing);
    const sparringWithRing = sparringParticipants.filter(p => p.sparringCohortRing);

    return {
      totalParticipants: participants.length,
      formsParticipants: formsParticipants.length,
      sparringParticipants: sparringParticipants.length,
      formsWithCohort: formsWithCohort.length,
      sparringWithCohort: sparringWithCohort.length,
      formsWithRing: formsWithRing.length,
      sparringWithRing: sparringWithRing.length,
      formsCohortPercent: formsParticipants.length > 0 
        ? Math.round((formsWithCohort.length / formsParticipants.length) * 100) 
        : 0,
      sparringCohortPercent: sparringParticipants.length > 0 
        ? Math.round((sparringWithCohort.length / sparringParticipants.length) * 100) 
        : 0,
      formsRingPercent: formsParticipants.length > 0 
        ? Math.round((formsWithRing.length / formsParticipants.length) * 100) 
        : 0,
      sparringRingPercent: sparringParticipants.length > 0 
        ? Math.round((sparringWithRing.length / sparringParticipants.length) * 100) 
        : 0,
    };
  }, [participants]);

  // Ring balance analysis
  const ringAnalysis = useMemo(() => {
    const issues: Array<{ ring: string; issue: string; severity: 'warning' | 'error' }> = [];
    
    competitionRings.forEach(ring => {
      const count = ring.participantIds.length;
      if (count === 0) {
        issues.push({ ring: ring.name || ring.id, issue: 'Empty ring (0 participants)', severity: 'error' });
      } else if (count < 3) {
        issues.push({ ring: ring.name || ring.id, issue: `Very small ring (${count} participants)`, severity: 'warning' });
      } else if (count > 16) {
        issues.push({ ring: ring.name || ring.id, issue: `Large ring (${count} participants)`, severity: 'warning' });
      }
    });

    return issues;
  }, [competitionRings]);

  // Physical ring mapping analysis
  const mappingAnalysis = useMemo(() => {
    const unmappedRings: string[] = [];
    
    competitionRings.forEach(ring => {
      const hasMapping = physicalRingMappings.some(m => m.cohortRingName === ring.name);
      if (!hasMapping && ring.name) {
        unmappedRings.push(ring.name);
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
        name: 'Assign Cohorts',
        status: overallStats.formsCohortPercent === 100 && overallStats.sparringCohortPercent === 100 
          ? 'complete' 
          : overallStats.formsCohortPercent > 0 || overallStats.sparringCohortPercent > 0 
            ? 'in-progress' 
            : 'pending',
        detail: `Forms: ${overallStats.formsCohortPercent}%, Sparring: ${overallStats.sparringCohortPercent}%`,
        tab: 'cohorts',
      },
      {
        name: 'Assign Rings',
        status: overallStats.formsRingPercent === 100 && overallStats.sparringRingPercent === 100 
          ? 'complete' 
          : overallStats.formsRingPercent > 0 || overallStats.sparringRingPercent > 0 
            ? 'in-progress' 
            : 'pending',
        detail: `Forms: ${overallStats.formsRingPercent}%, Sparring: ${overallStats.sparringRingPercent}%`,
        tab: 'rings',
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
  const warningCount = ringAnalysis.length + mappingAnalysis.length + 
    (overallStats.formsParticipants - overallStats.formsWithCohort) +
    (overallStats.sparringParticipants - overallStats.sparringWithCohort);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{cohorts.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Cohorts</div>
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
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '25px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Workflow Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workflowStatus.map((step, idx) => (
            <div 
              key={idx}
              onClick={() => onNavigate(step.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                cursor: 'pointer',
                border: `2px solid ${step.status === 'in-progress' ? '#ffc107' : 'transparent'}`,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            >
              <span style={{ fontSize: '20px', marginRight: '12px' }}>{getStatusIcon(step.status)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: getStatusColor(step.status) }}>{step.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{step.detail}</div>
              </div>
              <span style={{ color: '#999', fontSize: '18px' }}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Division Breakdown */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '25px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Participants by Division</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Division</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Total</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Forms Cohort</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Sparring Cohort</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Forms Ring</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Sparring Ring</th>
            </tr>
          </thead>
          <tbody>
            {config.divisions.sort((a, b) => a.order - b.order).map(div => {
              const stats = divisionStats.get(div.name);
              if (!stats || stats.total === 0) return null;
              return (
                <tr key={div.name} style={{ borderBottom: '1px solid #eee' }}>
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
                    <span style={{ color: stats.formsAssigned === stats.total ? '#28a745' : '#dc3545' }}>
                      {stats.formsAssigned}/{stats.total}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: stats.sparringAssigned === stats.total ? '#28a745' : '#dc3545' }}>
                      {stats.sparringAssigned}/{stats.total}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: stats.formsRingAssigned === stats.total ? '#28a745' : '#dc3545' }}>
                      {stats.formsRingAssigned}/{stats.total}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: stats.sparringRingAssigned === stats.total ? '#28a745' : '#dc3545' }}>
                      {stats.sparringRingAssigned}/{stats.total}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Warnings & Issues */}
      {(ringAnalysis.length > 0 || mappingAnalysis.length > 0 || 
        overallStats.formsWithCohort < overallStats.formsParticipants ||
        overallStats.sparringWithCohort < overallStats.sparringParticipants) && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '25px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#856404' }}>⚠️ Warnings & Issues</h3>
          
          {/* Unassigned participants */}
          {overallStats.formsWithCohort < overallStats.formsParticipants && (
            <div 
              onClick={() => onNavigate('cohorts')}
              style={{ 
                padding: '10px', 
                backgroundColor: 'rgba(255,255,255,0.5)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
              }}
            >
              <strong>{overallStats.formsParticipants - overallStats.formsWithCohort}</strong> forms participants not assigned to cohorts
              <span style={{ float: 'right', color: '#007bff' }}>Go to Cohorts →</span>
            </div>
          )}
          
          {overallStats.sparringWithCohort < overallStats.sparringParticipants && (
            <div 
              onClick={() => onNavigate('cohorts')}
              style={{ 
                padding: '10px', 
                backgroundColor: 'rgba(255,255,255,0.5)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
              }}
            >
              <strong>{overallStats.sparringParticipants - overallStats.sparringWithCohort}</strong> sparring participants not assigned to cohorts
              <span style={{ float: 'right', color: '#007bff' }}>Go to Cohorts →</span>
            </div>
          )}

          {/* Ring balance issues */}
          {ringAnalysis.map((issue, idx) => (
            <div 
              key={idx}
              onClick={() => onNavigate('overview')}
              style={{ 
                padding: '10px', 
                backgroundColor: issue.severity === 'error' ? 'rgba(220,53,69,0.1)' : 'rgba(255,255,255,0.5)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
              }}
            >
              <strong>{issue.ring}:</strong> {issue.issue}
              <span style={{ float: 'right', color: '#007bff' }}>Go to Overview →</span>
            </div>
          ))}

          {/* Unmapped rings */}
          {mappingAnalysis.length > 0 && (
            <div 
              onClick={() => onNavigate('ringmap')}
              style={{ 
                padding: '10px', 
                backgroundColor: 'rgba(255,255,255,0.5)', 
                borderRadius: '4px', 
                marginBottom: '8px',
                cursor: 'pointer',
              }}
            >
              <strong>{mappingAnalysis.length}</strong> rings not mapped to physical rings
              <span style={{ float: 'right', color: '#007bff' }}>Go to Ring Map →</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Quick Actions</h3>
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
