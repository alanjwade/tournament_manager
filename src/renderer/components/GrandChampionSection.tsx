import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Participant, CompetitionRing, CustomRing, TournamentConfig } from '../types/tournament';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { getSchoolAbbreviation } from '../utils/schoolAbbreviations';

interface GrandChampionSectionProps {
  customRings: CustomRing[];
  participants: Participant[];
  config: TournamentConfig;
  printing: string | null;
  setPrinting: (value: string | null) => void;
  onAddCustomRing: (name: string, type: 'forms' | 'sparring') => void;
  onDeleteCustomRing: (ringId: string) => void;
  onUpdateCustomRing: (ringId: string, updates: Partial<CustomRing>) => void;
  onAddParticipantToRing: (ringId: string, participantId: string) => void;
  onRemoveParticipantFromRing: (ringId: string, participantId: string) => void;
  onMoveParticipantInRing: (ringId: string, participantId: string, direction: 'up' | 'down') => void;
  onOpenParticipantSelectionModal: (ringId: string) => void;
}

function GrandChampionSection({
  customRings,
  participants,
  config,
  printing,
  setPrinting,
  onAddCustomRing,
  onDeleteCustomRing,
  onUpdateCustomRing,
  onAddParticipantToRing,
  onRemoveParticipantFromRing,
  onMoveParticipantInRing,
  onOpenParticipantSelectionModal,
}: GrandChampionSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingRingName, setEditingRingName] = useState<string | null>(null);
  const [editingRingNameValue, setEditingRingNameValue] = useState('');
  const [showCreateRingModal, setShowCreateRingModal] = useState(false);
  const [newRingName, setNewRingName] = useState('Black Belt Grand Champion');
  const [newRingType, setNewRingType] = useState<'forms' | 'sparring'>('forms');

  const getParticipantSchool = (participant: Participant): string => {
    const rawSchool = participant.school || 'Unknown';
    return getSchoolAbbreviation(rawSchool, config.schoolAbbreviations);
  };

  const handlePrintRing = async (ring: CustomRing, ringParticipants: Participant[]) => {
    setPrinting(ring.id);
    try {
      // Create participants with rank order set based on position in ring
      const participantsWithOrder = ringParticipants.map((p, index) => ({
        ...p,
        formsRankOrder: index + 1,
        sparringRankOrder: index + 1
      }));
      
      // Create a mock competition ring for PDF generation
      const mockRing: CompetitionRing = {
        id: ring.id,
        physicalRingId: 'GC',
        categoryId: 'custom',
        division: ring.name,
        type: ring.type,
        participantIds: ring.participantIds,
        name: ring.name,
      };
      
      // Use appropriate PDF generator based on type
      const pdf = ring.type === 'forms'
        ? generateFormsScoringSheets(
            participantsWithOrder,
            [mockRing],
            config.physicalRings,
            ring.name,
            config.watermarkImage,
            [],
            undefined,
            undefined,
            true // isCustomRing
          )
        : generateSparringBrackets(
            participantsWithOrder,
            [mockRing],
            config.physicalRings,
            ring.name,
            config.watermarkImage,
            [],
            undefined,
            undefined,
            true // isCustomRing
          );
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        await new Promise<void>(resolve => {
          printWindow.addEventListener('load', () => {
            printWindow.print();
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
              resolve();
            }, 500);
          });
        });
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
  };

  return (
    <>
      {/* Create Ring Modal */}
      {showCreateRingModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateRingModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>
              Create New Ring
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                Ring Name
              </label>
              <input
                type="text"
                value={newRingName}
                onChange={(e) => setNewRingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRingName.trim()) {
                    onAddCustomRing(newRingName, newRingType);
                    setShowCreateRingModal(false);
                  } else if (e.key === 'Escape') {
                    setShowCreateRingModal(false);
                  }
                }}
                placeholder="e.g., Black Belt Grand Champion"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--input-border)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                Type
              </label>
              <select
                value={newRingType}
                onChange={(e) => setNewRingType(e.target.value as 'forms' | 'sparring')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--input-border)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="forms">Forms</option>
                <option value="sparring">Sparring</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateRingModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newRingName.trim()) {
                    onAddCustomRing(newRingName, newRingType);
                    setShowCreateRingModal(false);
                  }
                }}
                disabled={!newRingName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newRingName.trim() ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newRingName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Create Ring
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ 
        marginBottom: '20px',
        border: '2px solid #ffc107',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            backgroundColor: '#ffc107',
            color: '#000',
            padding: '12px 15px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            userSelect: 'none',
          }}
        >
          <span>
            {expanded ? '▼' : '▶'} Grand Champion Rings ({customRings.length})
            {customRings.length > 0 && ` - ${customRings.reduce((sum, r) => sum + r.participantIds.length, 0)} participants`}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewRingName('Black Belt Grand Champion');
              setNewRingType('forms');
              setShowCreateRingModal(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            + Add Ring
          </button>
        </div>
        
        {expanded && (
          <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)' }}>
            {customRings.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}>
                No Grand Champion rings created yet. Click "+ Add Ring" to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {customRings.map((ring) => {
                  // Maintain order from ring.participantIds
                  const ringParticipants = ring.participantIds
                    .map(id => participants.find(p => p.id === id))
                    .filter((p): p is Participant => p !== undefined);
                  
                  return (
                    <div
                      key={ring.id}
                      style={{
                        border: '2px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      {/* Ring Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px',
                        gap: '10px'
                      }}>
                        {editingRingName === ring.id ? (
                          <input
                            type="text"
                            value={editingRingNameValue}
                            onChange={(e) => setEditingRingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateCustomRing(ring.id, { name: editingRingNameValue });
                                setEditingRingName(null);
                              } else if (e.key === 'Escape') {
                                setEditingRingName(null);
                              }
                            }}
                            onBlur={() => {
                              onUpdateCustomRing(ring.id, { name: editingRingNameValue });
                              setEditingRingName(null);
                            }}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '6px',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              border: '2px solid #007bff',
                              borderRadius: '4px',
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        ) : (
                          <h4
                            onClick={() => {
                              setEditingRingName(ring.id);
                              setEditingRingNameValue(ring.name);
                            }}
                            style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              flex: 1,
                            }}
                            title="Click to edit name"
                          >
                            {ring.name} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({ring.type})</span>
                          </h4>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handlePrintRing(ring, ringParticipants)}
                            disabled={ringParticipants.length === 0 || printing !== null}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: ringParticipants.length === 0 ? '#6c757d' : '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: ringParticipants.length === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                            }}
                          >
                            🖨️ Print
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ring "${ring.name}"?`)) {
                                onDeleteCustomRing(ring.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                            }}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                      
                      {/* Add Participant Button */}
                      <button
                        onClick={() => onOpenParticipantSelectionModal(ring.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: '10px',
                        }}
                      >
                        + Add Participant
                      </button>
                      
                      {/* Participants List */}
                      {ringParticipants.length === 0 ? (
                        <div style={{ 
                          padding: '10px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                          fontSize: '13px'
                        }}>
                          No participants added yet
                        </div>
                      ) : (
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '13px'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                              <th style={{ 
                                padding: '6px', 
                                width: '100px',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                Order
                              </th>
                              <th style={{ 
                                padding: '6px', 
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                Name
                              </th>
                              <th style={{ 
                                padding: '6px',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                School
                              </th>
                              <th style={{ 
                                padding: '6px',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                Age
                              </th>
                              <th style={{ 
                                padding: '6px',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                Gender
                              </th>
                              <th style={{ 
                                padding: '6px',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--border-color)'
                              }}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ringParticipants.map((p, index) => {
                              const isFirst = index === 0;
                              const isLast = index === ringParticipants.length - 1;
                              
                              return (
                                <tr 
                                  key={p.id}
                                  style={{ borderBottom: '1px solid var(--border-color)' }}
                                >
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                      <button
                                        onClick={() => onMoveParticipantInRing(ring.id, p.id, 'up')}
                                        disabled={isFirst}
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '10px',
                                          border: '1px solid var(--input-border)',
                                          borderRadius: '3px',
                                          backgroundColor: isFirst ? 'var(--bg-secondary)' : 'var(--input-bg)',
                                          color: 'var(--text-primary)',
                                          cursor: isFirst ? 'not-allowed' : 'pointer',
                                          opacity: isFirst ? 0.5 : 1,
                                        }}
                                      >
                                        ▲
                                      </button>
                                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                        {index + 1}
                                      </span>
                                      <button
                                        onClick={() => onMoveParticipantInRing(ring.id, p.id, 'down')}
                                        disabled={isLast}
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '10px',
                                          border: '1px solid var(--input-border)',
                                          borderRadius: '3px',
                                          backgroundColor: isLast ? 'var(--bg-secondary)' : 'var(--input-bg)',
                                          color: 'var(--text-primary)',
                                          cursor: isLast ? 'not-allowed' : 'pointer',
                                          opacity: isLast ? 0.5 : 1,
                                        }}
                                      >
                                        ▼
                                      </button>
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px', color: 'var(--text-primary)' }}>
                                    {p.firstName} {p.lastName}
                                  </td>
                                  <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                    {getParticipantSchool(p)}
                                  </td>
                                  <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                    {p.age}
                                  </td>
                                  <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                    {p.gender}
                                  </td>
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    <button
                                      onClick={() => onRemoveParticipantFromRing(ring.id, p.id)}
                                      style={{
                                        padding: '2px 8px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default GrandChampionSection;
