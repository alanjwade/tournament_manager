import React, { useState, useEffect } from 'react';
import { useTournamentStore } from './store/tournamentStore';
import DataImport from './components/DataImport';
import CohortManagement from './components/CohortManagement';
import RingManagement from './components/RingManagement';
import RingOverview from './components/RingOverview';
import PDFExport from './components/PDFExport';
import DataViewer from './components/DataViewer';
import RingMapEditor from './components/RingMapEditor';
import OrderRings from './components/OrderRings';
import Configuration from './components/Configuration';

type Tab = 'import' | 'cohorts' | 'rings' | 'editor' | 'overview' | 'ringmap' | 'order' | 'export';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const participants = useTournamentStore((state) => state.participants);

  // Load autosave on mount
  useEffect(() => {
    const loadAutosave = async () => {
      console.log('App mounted - checking for autosave');
      try {
        const result = await window.electronAPI.loadAutosave();
        console.log('Autosave exists:', !!result?.data);
        
        if (result?.success && result.data) {
          const state = JSON.parse(result.data);
          console.log('Loading autosave - participants count:', state.participants?.length || 0);
          const defaultConfig = useTournamentStore.getState().config;
          useTournamentStore.setState({
            participants: (state.participants || []).map((p: any) => ({ ...p, sparringAltRing: p.sparringAltRing || '' })),
            cohorts: state.cohorts || [],
            competitionRings: state.competitionRings || [],
            config: { ...defaultConfig, ...state.config },
            physicalRingMappings: state.physicalRingMappings || [],
            cohortRingMappings: state.cohortRingMappings || [],
          });
          console.log('Loaded autosave - final participants count:', useTournamentStore.getState().participants.length);
        } else {
          console.log('No autosave found');
        }
      } catch (error) {
        console.error('Failed to load autosave:', error);
      }
    };
    
    loadAutosave();
  }, []);

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px', color: '#333', flexShrink: 0 }}>
        Tournament Manager
      </h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Data
        </button>
        <button
          className={`tab ${activeTab === 'cohorts' ? 'active' : ''}`}
          onClick={() => setActiveTab('cohorts')}
          disabled={participants.length === 0}
        >
          Cohort Management
        </button>
        <button
          className={`tab ${activeTab === 'rings' ? 'active' : ''}`}
          onClick={() => setActiveTab('rings')}
          disabled={participants.length === 0}
        >
          Cohort Ring Assignment
        </button>
        <button
          className={`tab ${activeTab === 'ringmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('ringmap')}
          disabled={participants.length === 0}
        >
          Ring Map Editor
        </button>
        <button
          className={`tab ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
          disabled={participants.length === 0}
        >
          Order Rings
        </button>
        <button
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
          disabled={participants.length === 0}
        >
          Participant Editor
        </button>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          disabled={participants.length === 0}
        >
          Ring Overview
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
          disabled={participants.length === 0}
        >
          Export PDFs
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'import' && (
          <>
            <DataImport />
            <div style={{ marginTop: '20px' }}>
              <Configuration />
            </div>
          </>
        )}
        {activeTab === 'cohorts' && <CohortManagement />}
        {activeTab === 'rings' && <RingManagement />}
        {activeTab === 'ringmap' && <RingMapEditor />}
        {activeTab === 'order' && <OrderRings />}
        {activeTab === 'editor' && <DataViewer />}
        {activeTab === 'overview' && <RingOverview />}
        {activeTab === 'export' && <PDFExport />}
      </div>
    </div>
  );
}

export default App;
