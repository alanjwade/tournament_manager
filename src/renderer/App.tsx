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

type Tab = 'import' | 'cohorts' | 'rings' | 'editor' | 'overview' | 'ringmap' | 'order' | 'export';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const participants = useTournamentStore((state) => state.participants);

  // Load autosave on mount
  useEffect(() => {
    const autosave = localStorage.getItem('tournament-autosave');
    if (autosave) {
      try {
        const state = JSON.parse(autosave);
        useTournamentStore.setState({
          participants: state.participants || [],
          cohorts: state.cohorts || [],
          competitionRings: state.competitionRings || [],
          config: state.config || useTournamentStore.getState().config,
        });
        console.log('Loaded autosave from localStorage');
      } catch (error) {
        console.error('Failed to load autosave:', error);
      }
    }
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
        {activeTab === 'import' && <DataImport />}
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
