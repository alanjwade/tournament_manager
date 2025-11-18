import React, { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Participant } from '../types/tournament';
import { computeCompetitionRings } from '../utils/computeRings';

function ParticipantEditor() {
  const participants = useTournamentStore((state) => state.participants);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const config = useTournamentStore((state) => state.config);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Participant>>({});

  const filteredParticipants = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return participants;

    return participants.filter(p => 
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.formsDivision.toLowerCase().includes(term) ||
      p.sparringDivision.toLowerCase().includes(term)
    );
  }, [participants, searchTerm]);

  // Validation: Check for participants in multiple rings
  const multipleRingsIssues = useMemo(() => {
    const issues: string[] = [];
    
    participants.forEach(p => {
      // Count how many forms rings this participant is in
      const formsRings = competitionRings.filter(
        r => r.type === 'forms' && r.participantIds.includes(p.id)
      );
      
      const sparringRings = competitionRings.filter(
        r => r.type === 'sparring' && r.participantIds.includes(p.id)
      );
      
      if (formsRings.length > 1) {
        const ringNames = formsRings.map(r => r.name || r.id).join(', ');
        issues.push(`${p.firstName} ${p.lastName} is in ${formsRings.length} Forms rings: ${ringNames}`);
      }
      
      if (sparringRings.length > 1) {
        const ringNames = sparringRings.map(r => r.name || r.id).join(', ');
        issues.push(`${p.firstName} ${p.lastName} is in ${sparringRings.length} Sparring rings: ${ringNames}`);
      }
      
      // Also check if participant's stored ring ID matches what rings claim
      if (p.formsRingId) {
        const assignedRing = competitionRings.find(r => r.id === p.formsRingId);
        if (assignedRing && !assignedRing.participantIds.includes(p.id)) {
          issues.push(`${p.firstName} ${p.lastName} has formsRingId="${assignedRing.name}" but is not in that ring's participant list`);
        }
      }
      
      if (p.sparringRingId) {
        const assignedRing = competitionRings.find(r => r.id === p.sparringRingId);
        if (assignedRing && !assignedRing.participantIds.includes(p.id)) {
          issues.push(`${p.firstName} ${p.lastName} has sparringRingId="${assignedRing.name}" but is not in that ring's participant list`);
        }
      }
    });
    
    return issues;
  }, [participants, competitionRings]);

  const handleEdit = (participant: Participant) => {
    setEditingId(participant.id);
    setEditForm({ ...participant });
  };

  const handleSave = () => {
    if (!editingId) return;

    const updatedParticipants = participants.map(p => 
      p.id === editingId ? { ...p, ...editForm } as Participant : p
    );
    setParticipants(updatedParticipants);
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="card">
      <h2 className="card-title">Participant Editor</h2>

      {multipleRingsIssues.length > 0 && (
        <div className="warning" style={{ marginBottom: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px' }}>⚠️ Ring Assignment Issues</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {multipleRingsIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label className="form-label">Search by Name or Division</label>
        <input
          type="text"
          className="form-control"
          placeholder="Type to filter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="info mb-2">
        Showing {filteredParticipants.length} of {participants.length} participants
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
        <table className="table">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Height</th>
              <th>School</th>
              <th>Branch</th>
              <th className="forms-column">Forms Division</th>
              <th className="forms-column">Forms Cohort</th>
              <th className="forms-column">Forms Ring</th>
              <th className="sparring-column">Sparring Division</th>
              <th className="sparring-column">Sparring Cohort</th>
              <th className="sparring-column">Sparring Ring</th>
              <th className="sparring-alt-column">Sparring Alt Ring</th>
              <th>Forms Order</th>
              <th>Sparring Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((p, idx) => {
              const isEditing = editingId === p.id;
              const formsRing = competitionRings.find(r => r.id === p.formsRingId);
              const sparringRing = competitionRings.find(r => r.id === p.sparringRingId);
              const formsCohort = cohorts.find(c => c.id === p.formsCohortId);
              const sparringCohort = cohorts.find(c => c.id === p.sparringCohortId);
              
              // Check if participant is in multiple rings
              const allFormsRings = competitionRings.filter(
                r => r.type === 'forms' && r.participantIds.includes(p.id)
              );
              const allSparringRings = competitionRings.filter(
                r => r.type === 'sparring' && r.participantIds.includes(p.id)
              );
              
              const hasFormsIssue = allFormsRings.length > 1;
              const hasSparringIssue = allSparringRings.length > 1;

              return (
                <tr key={p.id} style={{ backgroundColor: (hasFormsIssue || hasSparringIssue) ? '#fff3cd' : 'transparent' }}>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.firstName || ''}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        style={{ width: '100%', padding: '4px' }}
                      />
                    ) : p.firstName}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.lastName || ''}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        style={{ width: '100%', padding: '4px' }}
                      />
                    ) : p.lastName}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.age || ''}
                        onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                        style={{ width: '60px', padding: '4px' }}
                      />
                    ) : p.age >= 18 ? '18+' : p.age}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editForm.gender || ''}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'Male' | 'Female' })}
                        style={{ width: '100%', padding: '4px' }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    ) : p.gender}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          value={editForm.heightFeet || ''}
                          onChange={(e) => setEditForm({ ...editForm, heightFeet: parseInt(e.target.value) || 0 })}
                          style={{ width: '40px', padding: '4px' }}
                          placeholder="ft"
                        />
                        <input
                          type="number"
                          value={editForm.heightInches || ''}
                          onChange={(e) => setEditForm({ ...editForm, heightInches: parseInt(e.target.value) || 0 })}
                          style={{ width: '40px', padding: '4px' }}
                          placeholder="in"
                        />
                      </div>
                    ) : `${p.heightFeet}'${p.heightInches}"`}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.school || ''}
                        onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                        style={{ width: '100%', padding: '4px' }}
                      />
                    ) : p.school}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.branch || ''}
                        onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                        style={{ width: '100%', padding: '4px' }}
                      />
                    ) : p.branch || '-'}
                  </td>
                  {/* Forms Division */}
                  <td className="forms-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {p.formsDivision || '-'}
                  </td>
                  {/* Forms Cohort */}
                  <td className="forms-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {formsCohort?.name || (p.competingForms ? <span style={{ color: '#999' }}>Not assigned</span> : '-')}
                  </td>
                  {/* Forms Ring */}
                  <td className="forms-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {p.competingForms ? (
                      allFormsRings.length > 0 ? (
                        <span style={{ color: allFormsRings.length > 1 ? '#d9534f' : 'inherit' }}>
                          {allFormsRings.map(r => r.name).join(', ')}
                          {allFormsRings.length > 1 && ' ⚠️'}
                        </span>
                      ) : <span style={{ color: '#999' }}>Not assigned</span>
                    ) : <span style={{ color: '#999' }}>Not competing</span>}
                  </td>
                  {/* Sparring Division */}
                  <td className="sparring-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {p.sparringDivision || '-'}
                  </td>
                  {/* Sparring Cohort */}
                  <td className="sparring-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {sparringCohort?.name || (p.competingSparring ? <span style={{ color: '#999' }}>Not assigned</span> : '-')}
                  </td>
                  {/* Sparring Ring */}
                  <td className="sparring-column" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {p.competingSparring ? (
                      allSparringRings.length > 0 ? (
                        <span style={{ color: allSparringRings.length > 1 ? '#d9534f' : 'inherit' }}>
                          {allSparringRings.map(r => r.name).join(', ')}
                          {allSparringRings.length > 1 && ' ⚠️'}
                        </span>
                      ) : <span style={{ color: '#999' }}>Not assigned</span>
                    ) : <span style={{ color: '#999' }}>Not competing</span>}
                  </td>
                  {/* Sparring Alt Ring */}
                  <td className="sparring-alt-column" style={{ fontSize: '12px', textAlign: 'center' }}>
                    {isEditing ? (
                      p.competingSparring ? (
                        <select
                          value={editForm.sparringAltRing || ''}
                          onChange={(e) => setEditForm({ ...editForm, sparringAltRing: e.target.value as '' | 'a' | 'b' })}
                          style={{ width: '100%', padding: '4px' }}
                        >
                          <option value="">-</option>
                          <option value="a">a</option>
                          <option value="b">b</option>
                        </select>
                      ) : '-'
                    ) : (
                      p.competingSparring ? (p.sparringAltRing || '-') : '-'
                    )}
                  </td>
                  {/* Forms Order */}
                  <td style={{ fontSize: '12px', textAlign: 'center' }}>
                    {p.competingForms ? (p.formsRankOrder || <span style={{ color: '#999' }}>Not assigned</span>) : '-'}
                  </td>
                  {/* Sparring Order */}
                  <td style={{ fontSize: '12px', textAlign: 'center' }}>
                    {p.competingSparring ? (p.sparringRankOrder || <span style={{ color: '#999' }}>Not assigned</span>) : '-'}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-primary"
                          onClick={handleSave}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancel}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleEdit(p)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ParticipantEditor;
