import React, { useState, useEffect, useMemo } from 'react';
import { useTournamentStore } from './store/tournamentStore';
import { getEffectiveDivision } from './utils/excelParser';
import { computeCompetitionRings } from './utils/computeRings';
import { buildCategoryPoolName } from './utils/ringNameFormatter';
import Dashboard from './components/Dashboard';
import DataImport from './components/DataImport';
import CategoryManagement from './components/CategoryManagement';
import RingOverview from './components/RingOverview';
import PDFExport from './components/PDFExport';
import DataViewer from './components/DataViewer';
import RingMapEditor from './components/RingMapEditor';
import Configuration from './components/Configuration';
import CheckpointManager from './components/CheckpointManager';
import AddParticipantModal from './components/AddParticipantModal';
import AboutDialog from './components/AboutDialog';
import UpdateChecker from './components/UpdateChecker';
import HelpDialog, { HelpTopic } from './components/HelpDialog';

type Tab = 'dashboard' | 'import' | 'configuration' | 'categories' | 'editor' | 'tournament' | 'ringmap' | 'export' | 'checkpoints';
type Theme = 'light' | 'dark';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUpdateCheckerOpen, setIsUpdateCheckerOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    // Default to dark theme, but check localStorage for user preference
    const savedTheme = localStorage.getItem('tournament-theme') as Theme;
    return savedTheme || 'dark';
  });
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);
  const config = useTournamentStore((state) => state.config);
  const undo = useTournamentStore((state) => state.undo);
  const redo = useTournamentStore((state) => state.redo);
  const undoStack = useTournamentStore((state) => state.undoStack);
  const redoStack = useTournamentStore((state) => state.redoStack);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tournament-theme', theme);
  }, [theme]);

  // Listen for menu events from main process
  useEffect(() => {
    window.electronAPI.onShowAboutDialog(() => {
      setIsAboutOpen(true);
    });

    window.electronAPI.onCheckForUpdates(() => {
      setIsUpdateCheckerOpen(true);
    });

    window.electronAPI.onShowHelp((topic: string) => {
      setHelpTopic(topic as HelpTopic);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name || null;
  };

  // Get ring name for a participant
  const getParticipantRingInfo = (p: typeof participants[0]) => {
    const formsDivision = getEffectiveDivision(p, 'forms');
    const sparringDivision = getEffectiveDivision(p, 'sparring');
    const parts: string[] = [];
    
    if (formsDivision) {
      const formsPoolDisplay = p.formsPool ? p.formsPool.replace(/^P(\d+)$/, 'Pool $1') : 'unassigned';
      let formsRingDisplay = '';
      if (p.formsCategoryId && p.formsPool) {
        const formsCategory = categories.find(c => c.id === p.formsCategoryId);
        if (formsCategory) {
          const poolName = buildCategoryPoolName(formsCategory.division, formsCategory.name, p.formsPool);
          const physicalMapping = physicalRingMappings.find(m => m.categoryPoolName === poolName);
          if (physicalMapping) {
            formsRingDisplay = ` (${physicalMapping.physicalRingName})`;
          }
        }
      }
      parts.push(`F: ${formsPoolDisplay}${formsRingDisplay}`);
    }
    if (sparringDivision) {
      const sparringPoolDisplay = p.sparringPool ? p.sparringPool.replace(/^P(\d+)$/, 'Pool $1') : 'unassigned';
      let sparringRingDisplay = '';
      if (p.sparringCategoryId && p.sparringPool) {
        const sparringCategory = categories.find(c => c.id === p.sparringCategoryId);
        if (sparringCategory) {
          const poolName = buildCategoryPoolName(sparringCategory.division, sparringCategory.name, p.sparringPool);
          const physicalMapping = physicalRingMappings.find(m => m.categoryPoolName === poolName);
          if (physicalMapping) {
            sparringRingDisplay = ` (${physicalMapping.physicalRingName})`;
          }
        }
      }
      parts.push(`S: ${sparringPoolDisplay}${sparringRingDisplay}`);
    }
    return parts.join(' | ') || 'Not competing';
  };

  // Handle search result selection
  const handleSearchSelect = (participantId: string) => {
    setSearchQuery('');
    setSearchFocused(false);
    // Open quick-edit modal directly via store signal (RingOverview is always mounted)
    useTournamentStore.getState().setOpenQuickEditParticipantId(participantId);
  };

  // Compute competition rings for status tracking
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  // Compute tab status badges
  const tabStatus = useMemo(() => {
    // Count participants without category assignments
    const unassignedCategories = participants.filter(p => {
      const formsDivision = getEffectiveDivision(p, 'forms');
      const sparringDivision = getEffectiveDivision(p, 'sparring');
      const needsForms = !!formsDivision;
      const needsSparring = !!sparringDivision;
      return (needsForms && !p.formsCategoryId) || (needsSparring && !p.sparringCategoryId);
    }).length;

    // Count rings without physical ring mappings
    const unmappedRings = competitionRings.filter(ring => !ring.physicalRingId).length;

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

    // Count configuration errors
    let configErrors = 0;
    
    // Check each division for pools exceeding physical rings
    config.divisions.forEach(division => {
      const divisionFormsRings = categories
        .filter(c => c.division === division.name && c.type === 'forms')
        .reduce((sum, c) => sum + (c.numPools || 1), 0);
      const divisionSparringRings = categories
        .filter(c => c.division === division.name && c.type === 'sparring')
        .reduce((sum, c) => sum + (c.numPools || 1), 0);
      const physicalRings = division.numRings || 0;
      
      if (divisionFormsRings > physicalRings) configErrors++;
      if (divisionSparringRings > physicalRings) configErrors++;
      
      // Check if division has categories but no physical rings
      if ((divisionFormsRings > 0 || divisionSparringRings > 0) && physicalRings === 0) {
        configErrors++;
      }
    });

    return {
      categories: unassignedCategories,
      ringMap: unmappedRings,
      tournamentDay: changedRings,
      checkpoints: checkpoints.length,
      configuration: configErrors,
    };
  }, [participants, categories, competitionRings, checkpoints, diffCheckpoint]);

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
      try {
        console.log('App mounted - checking for autosave');
        const result = await window.electronAPI.loadAutosave();
        console.log('Load result received:', {
          success: result?.success,
          hasData: !!result?.data,
          path: result?.path || 'NO_PATH_RETURNED'
        });
        
        if (result?.success && result.data) {
          const state = JSON.parse(result.data);
          const defaultConfig = useTournamentStore.getState().config;
          console.log(`✓ Loaded ${state.participants?.length || 0} participants from: ${result.path}`);
          
          // Merge divisions to preserve abbreviations from default config
          const mergedDivisions = (state.config?.divisions || []).map((savedDiv: any) => {
            const defaultDiv = defaultConfig.divisions.find(d => d.name === savedDiv.name);
            return {
              ...savedDiv,
              // Preserve abbreviation from default config if not in saved state
              abbreviation: savedDiv.abbreviation || defaultDiv?.abbreviation
            };
          });
          
          // Clean up orphaned category references (category IDs that no longer exist)
          // Note: With deterministic category IDs, this should rarely be needed
          const validCategoryIds = new Set((state.categories || []).map((c: any) => c.id));
          let cleanupCount = 0;
          const cleanedParticipants = (state.participants || []).map((p: any) => {
            const cleaned = { ...p, sparringAltRing: p.sparringAltRing || '' };
            
            if (cleaned.formsCategoryId && !validCategoryIds.has(cleaned.formsCategoryId)) {
              console.warn(`Cleaning orphaned formsCategoryId "${cleaned.formsCategoryId}" from ${p.firstName} ${p.lastName}`);
              cleaned.formsCategoryId = undefined;
              cleanupCount++;
            }
            
            if (cleaned.sparringCategoryId && !validCategoryIds.has(cleaned.sparringCategoryId)) {
              console.warn(`Cleaning orphaned sparringCategoryId "${cleaned.sparringCategoryId}" from ${p.firstName} ${p.lastName}`);
              cleaned.sparringCategoryId = undefined;
              cleanupCount++;
            }
            
            return cleaned;
          });
          
          if (cleanupCount > 0) {
            console.log(`✓ Cleaned up ${cleanupCount} orphaned category references`);
          }
          
          useTournamentStore.setState({
            participants: cleanedParticipants,
            categories: state.categories || [],
            config: { 
              ...defaultConfig, 
              ...state.config,
              divisions: mergedDivisions
            },
            physicalRingMappings: state.physicalRingMappings || [],
            categoryPoolMappings: state.categoryPoolMappings || [],
            customRings: state.customRings || [],
          });
        } else if (!result?.data) {
          console.log('No autosave data found. Save path will be: ' + (result?.path || 'unknown'));
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
        <h1 style={{ 
          margin: 0, 
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, var(--accent-color, #007bff), var(--accent-light, #0056b3))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          letterSpacing: '0.5px'
        }}>
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
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
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
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px var(--card-shadow)',
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
                        borderBottom: '1px solid var(--border-color)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {getEffectiveDivision(p, 'forms') || getEffectiveDivision(p, 'sparring') || 'No division'} • {p.age}yo • {p.gender}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px var(--card-shadow)',
                  zIndex: 1000,
                  padding: '12px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}>
                  No participants found
                </div>
              )}
            </div>
          )}

          {/* Add Participant Button */}
          {participants.length > 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title="Add new participant"
            >
              ➕ Add Participant
            </button>
          )}

          {/* Undo / Redo Buttons */}
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title={`Undo (Ctrl+Z) — ${undoStack.length} step${undoStack.length !== 1 ? 's' : ''} available`}
            style={{
              padding: '8px 10px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-tertiary)',
              color: undoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              opacity: undoStack.length === 0 ? 0.5 : 1,
            }}
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title={`Redo (Ctrl+Y) — ${redoStack.length} step${redoStack.length !== 1 ? 's' : ''} available`}
            style={{
              padding: '8px 10px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-tertiary)',
              color: redoStack.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              opacity: redoStack.length === 0 ? 0.5 : 1,
            }}
          >
            ↪
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
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
          className={`tab ${activeTab === 'configuration' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuration')}
        >
          Configuration
          <Badge count={tabStatus.configuration} type="warning" />
        </button>
        <button
          className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
          disabled={participants.length === 0}
          title={participants.length === 0 ? '⚠️ Import participants first before managing categories' : undefined}
          style={{ 
            opacity: participants.length === 0 ? 0.6 : 1,
            cursor: participants.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Categories
          <Badge count={tabStatus.categories} type="warning" />
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
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
          disabled={participants.length === 0}
        >
          Editor
        </button>
        <button
          className={`tab ${activeTab === 'tournament' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournament')}
          disabled={participants.length === 0}
          style={{ backgroundColor: activeTab === 'tournament' ? '#dc3545' : undefined, color: activeTab === 'tournament' ? 'white' : undefined }}
        >
          🏆 Tournament
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
          disabled={participants.length === 0}
        >
          Export
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
        {activeTab === 'import' && <DataImport />}
        {activeTab === 'configuration' && <Configuration />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'ringmap' && <RingMapEditor />}
        {/* DataViewer stays mounted while participants exist to avoid expensive re-mount on every tab switch */}
        {participants.length > 0 && (
          <div style={{ display: activeTab === 'editor' ? undefined : 'none', height: '100%' }}>
            <DataViewer />
          </div>
        )}
        {/* RingOverview stays mounted so the quick-edit modal can open from global search */}
        {participants.length > 0 && (
          <div style={{ display: activeTab === 'tournament' ? undefined : 'none', height: '100%' }}>
            <RingOverview />
          </div>
        )}
        {activeTab === 'export' && <PDFExport />}
        {activeTab === 'checkpoints' && <CheckpointManager />}
      </div>

      {/* Global Add Participant Modal */}
      <AddParticipantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* About Dialog */}
      <AboutDialog 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />

      {/* Update Checker */}
      <UpdateChecker 
        isOpen={isUpdateCheckerOpen} 
        onClose={() => setIsUpdateCheckerOpen(false)} 
      />

      {/* Help Dialog */}
      <HelpDialog
        isOpen={helpTopic !== null}
        initialTopic={helpTopic ?? undefined}
        onClose={() => setHelpTopic(null)}
      />
    </div>
  );
}

export default App;
