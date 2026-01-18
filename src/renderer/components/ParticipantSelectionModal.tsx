import React, { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Participant } from '../types/tournament';

interface ParticipantSelectionModalProps {
  onSelect: (participant: Participant) => void;
  onClose: () => void;
  excludeIds?: string[]; // IDs to exclude from selection
  title?: string;
}

function ParticipantSelectionModal({ 
  onSelect, 
  onClose, 
  excludeIds = [],
  title = 'Select Participant'
}: ParticipantSelectionModalProps) {
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const participants = useTournamentStore((state) => state.participants);

  // Filter participants based on search criteria
  const filteredParticipants = useMemo(() => {
    return participants
      .filter(p => !excludeIds.includes(p.id))
      .filter(p => {
        const firstNameMatch = !searchFirstName || 
          p.firstName.toLowerCase().includes(searchFirstName.toLowerCase());
        const lastNameMatch = !searchLastName || 
          p.lastName.toLowerCase().includes(searchLastName.toLowerCase());
        return firstNameMatch && lastNameMatch;
      })
      .sort((a, b) => {
        // Sort by last name, then first name
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
  }, [participants, searchFirstName, searchLastName, excludeIds]);

  const handleSelect = (participant: Participant) => {
    onSelect(participant);
    onClose();
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '20px',
          minWidth: '600px',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>
          {title}
        </h3>

        {/* Search fields */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '13px',
              color: 'var(--text-secondary)' 
            }}>
              First Name
            </label>
            <input
              type="text"
              value={searchFirstName}
              onChange={(e) => setSearchFirstName(e.target.value)}
              placeholder="Search by first name..."
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
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '13px',
              color: 'var(--text-secondary)' 
            }}>
              Last Name
            </label>
            <input
              type="text"
              value={searchLastName}
              onChange={(e) => setSearchLastName(e.target.value)}
              placeholder="Search by last name..."
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
        </div>

        {/* Results count */}
        <div style={{ 
          marginBottom: '10px', 
          fontSize: '13px', 
          color: 'var(--text-secondary)' 
        }}>
          {filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''} found
        </div>

        {/* Participant list */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {filteredParticipants.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              No participants found
            </div>
          ) : (
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: 'var(--table-header-bg)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    Name
                  </th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'left',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    School
                  </th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'center',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    Age
                  </th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'center',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    Gender
                  </th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'center',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr 
                    key={p.id}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>
                      {p.firstName} {p.lastName}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>
                      {p.school}
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'center',
                      color: 'var(--text-primary)'
                    }}>
                      {p.age}
                    </td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'center',
                      color: 'var(--text-primary)'
                    }}>
                      {p.gender}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleSelect(p)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#218838';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#28a745';
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cancel button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
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
        </div>
      </div>
    </div>
  );
}

export default ParticipantSelectionModal;
