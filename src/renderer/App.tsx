import React, { useState, useEffect, useMemo } from 'react';
import { useTournamentStore } from './store/tournamentStore';
import { getEffectiveDivision } from './utils/excelParser';
import { computeCompetitionRings } from './utils/computeRings';
import Dashboard from './components/Dashboard';
import DataImport from './components/DataImport';
import CohortManagement from './components/CohortManagement';
import RingManagement from './components/RingManagement';
import RingOverview from './components/RingOverview';
import PDFExport from './components/PDFExport';
import DataViewer from './components/DataViewer';
import RingMapEditor from './components/RingMapEditor';
import OrderRings from './components/OrderRings';
import Configuration from './components/Configuration';
import CheckpointManager from './components/CheckpointManager';
import TournamentDay from './components/TournamentDay';

type Tab = 'dashboard' | 'import' | 'cohorts' | 'rings' | 'editor' | 'overview' | 'ringmap' | 'order' | 'export' | 'checkpoints' | 'tournament-day';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [globalDivision, setGlobalDivision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);
  const config = useTournamentStore((state) => state.config);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return participants
      .filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        `${p.lastName} ${p.firstName}`.toLowerCase().includes(query) ||
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchQuery, participants]);

  // Get cohort name by ID
  const getCohortName = (cohortId?: string) => {
    if (!cohortId) return null;
    const cohort = cohorts.find(c => c.id === cohortId);
    return cohort?.name || null;
  };

  // Get ring name for a participant
  const getParticipantRingInfo = (p: typeof participants[0]) => {
    const formsDivision = getEffectiveDivision(p, 'forms');
    const sparringDivision = getEffectiveDivision(p, 'sparring');
    const parts: string[] = [];
    
    if (formsDivision && formsDivision !== 'not participating') {
      parts.push(`F: ${p.formsCohortRing || 'unassigned'}`);
    }
    if (sparringDivision && sparringDivision !== 'not participating') {
      parts.push(`S: ${p.sparringCohortRing || 'unassigned'}`);
    }
    return parts.join(' | ') || 'Not competing';
  };

  // Handle search result selection
  const handleSearchSelect = (participantId: string) => {
    setSearchQuery('');
    setSearchFocused(false);
    // Navigate to editor tab - the DataViewer component will need to handle highlighting
    setActiveTab('editor');
    // Store selected participant ID for the editor to pick up
    sessionStorage.setItem('highlightParticipant', participantId);
  };

  // Compute competition rings for status tracking
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );

  // Compute tab status badges
  const tabStatus = useMemo(() => {
    // Count participants without cohort assignments
    const unassignedCohorts = participants.filter(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');
      const needsForms = formsDivision && formsDivision !== 'not participating';
      const needsSparring = sparringDivision && sparringDivision !== 'not participating';
      return (needsForms && !p.formsCohortId) || (needsSparring && !p.sparringCohortId);
    }).length;

    // Count participants without ring assignments
    const unassignedRings = participants.filter(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');
      const needsForms = formsDivision && formsDivision !== 'not participating';
      const needsSparring = sparringDivision && sparringDivision !== 'not participating';
      return (needsForms && p.formsCohortId && !p.formsCohortRing) || 
             (needsSparring && p.sparringCohortId && !p.sparringCohortRing);
    }).length;

    // Count rings without physical ring mappings
    const unmappedRings = competitionRings.filter(ring => !ring.physicalRingId).length;

    // Count participants without rank order
    const unorderedParticipants = participants.filter(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');
      const needsForms = formsDivision && formsDivision !== 'not participating';
      const needsSparring = sparringDivision && sparringDivision !== 'not participating';
      return (needsForms && p.formsCohortRing && !p.formsRankOrder) || 
             (needsSparring && p.sparringCohortRing && !p.sparringRankOrder);
    }).length;

    // Count rings changed since last checkpoint
    let changedRings = 0;
    if (checkpoints.length > 0) {
      const latestCheckpoint = [...checkpoints].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      const diff = diffCheckpoint(latestCheckpoint.id);
      if (diff) {
        changedRings = diff.ringsAffected.size;
      }
    }

    return {
      cohorts: unassignedCohorts,
      rings: unassignedRings,
      ringMap: unmappedRings,
      order: unorderedParticipants,
      tournamentDay: changedRings,
      checkpoints: checkpoints.length,
    };
  }, [participants, cohorts, competitionRings, checkpoints, diffCheckpoint]);

  // Badge component
  const Badge = ({ count, type = 'warning' }: { count: number; type?: 'warning' | 'info' | 'success' }) => {
    if (count === 0) return null;
    const colors = {
      warning: { bg: '#ffc107', text: '#000' },
      info: { bg: '#17a2b8', text: '#fff' },
      success: { bg: '#28a745', text: '#fff' },
    };
    return (
      <span style={{
        marginLeft: '6px',
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 'bold',
        backgroundColor: colors[type].bg,
        color: colors[type].text,
      }}>
        {count}
      </span>
    );
  };

  // Load autosave on mount
  useEffect(() => {
    const loadAutosave = async () => {
      console.log('App mounted - checking for autosave');
      try {
        const result = await window.electronAPI.loadAutosave();
        
        if (result?.success && result.data) {
          const state = JSON.parse(result.data);
          const defaultConfig = useTournamentStore.getState().config;
          
          // Merge divisions to preserve abbreviations from default config
          const mergedDivisions = (state.config?.divisions || []).map((savedDiv: any) => {
            const defaultDiv = defaultConfig.divisions.find(d => d.name === savedDiv.name);
            return {
              ...savedDiv,
              // Preserve abbreviation from default config if not in saved state
              abbreviation: savedDiv.abbreviation || defaultDiv?.abbreviation
            };
          });
          
          useTournamentStore.setState({
            participants: (state.participants || []).map((p: any) => ({ ...p, sparringAltRing: p.sparringAltRing || '' })),
            cohorts: state.cohorts || [],
            competitionRings: state.competitionRings || [],
            config: { 
              ...defaultConfig, 
              ...state.config,
              divisions: mergedDivisions
            },
            physicalRingMappings: state.physicalRingMappings || [],
            cohortRingMappings: state.cohortRingMappings || [],
          });
        }
      } catch (error) {
        console.error('Failed to load autosave:', error);
      }
    };
    
    loadAutosave();
  }, []);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <h1 style={{ margin: 0, color: '#333' }}>
          Tournament Manager
        </h1>
        
        {/* Global Search and Division Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Search */}
          {participants.length > 0 && (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  width: '220px',
                }}
              />
              {/* Search Results Dropdown */}
              {searchFocused && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSearchSelect(p.id)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 'bold', color: '#333' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {getEffectiveDivision(p, 'forms') || getEffectiveDivision(p, 'sparring') || 'No division'} • {p.age}yo • {p.gender}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {getParticipantRingInfo(p)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchFocused && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  padding: '12px',
                  color: '#666',
                  fontStyle: 'italic',
                }}>
                  No participants found
                </div>
              )}
            </div>
          )}
          
          {/* Division Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Division:</label>
            <select
              value={globalDivision}
              onChange={(e) => setGlobalDivision(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '2px solid #007bff',
                backgroundColor: globalDivision === 'all' ? 'white' : '#e7f3ff',
                fontWeight: globalDivision === 'all' ? 'normal' : 'bold',
                minWidth: '150px',
              }}
            >
              <option value="all">All Divisions</option>
              {config.divisions.sort((a, b) => a.order - b.order).map(div => (
                <option key={div.name} value={div.name}>
                  {div.abbreviation || div.name.substring(0, 4).toUpperCase()} - {div.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ fontWeight: activeTab === 'dashboard' ? 'bold' : undefined }}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Data
          {participants.length > 0 && <Badge count={participants.length} type="info" />}
        </button>
        <button
          className={`tab ${activeTab === 'cohorts' ? 'active' : ''}`}
          onClick={() => setActiveTab('cohorts')}
          disabled={participants.length === 0}
        >
          Cohorts
          <Badge count={tabStatus.cohorts} type="warning" />
        </button>
        <button
          className={`tab ${activeTab === 'rings' ? 'active' : ''}`}
          onClick={() => setActiveTab('rings')}
          disabled={participants.length === 0}
        >
          Ring Assignment
          <Badge count={tabStatus.rings} type="warning" />
        </button>
        <button
          className={`tab ${activeTab === 'ringmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('ringmap')}
          disabled={participants.length === 0}
        >
          Ring Map
          <Badge count={tabStatus.ringMap} type="warning" />
        </button>
        <button
          className={`tab ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
          disabled={participants.length === 0}
        >
          Order
          <Badge count={tabStatus.order} type="warning" />
        </button>
        <button
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
          disabled={participants.length === 0}
        >
          Editor
        </button>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          disabled={participants.length === 0}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
          disabled={participants.length === 0}
        >
          Export
        </button>
        <button
          className={`tab ${activeTab === 'tournament-day' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournament-day')}
          disabled={participants.length === 0}
          style={{ backgroundColor: activeTab === 'tournament-day' ? '#dc3545' : undefined, color: activeTab === 'tournament-day' ? 'white' : undefined }}
        >
          🏆 Tournament
          <Badge count={tabStatus.tournamentDay} type="info" />
        </button>
        <button
          className={`tab ${activeTab === 'checkpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkpoints')}
        >
          Checkpoints
          <Badge count={tabStatus.checkpoints} type="info" />
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === 'import' && (
          <>
            <DataImport />
            <div style={{ marginTop: '20px' }}>
              <Configuration />
            </div>
          </>
        )}
        {activeTab === 'cohorts' && <CohortManagement globalDivision={globalDivision} />}
        {activeTab === 'rings' && <RingManagement globalDivision={globalDivision} />}
        {activeTab === 'ringmap' && <RingMapEditor globalDivision={globalDivision} />}
        {activeTab === 'order' && <OrderRings globalDivision={globalDivision} />}
        {activeTab === 'editor' && <DataViewer globalDivision={globalDivision} />}
        {activeTab === 'overview' && <RingOverview globalDivision={globalDivision} />}
        {activeTab === 'export' && <PDFExport globalDivision={globalDivision} />}
        {activeTab === 'tournament-day' && <TournamentDay globalDivision={globalDivision} />}
        {activeTab === 'checkpoints' && <CheckpointManager />}
      </div>
    </div>
  );
}

export default App;
