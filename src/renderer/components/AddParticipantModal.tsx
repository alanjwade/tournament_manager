import React, { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Participant } from '../types/tournament';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddParticipantModal({ isOpen, onClose }: AddParticipantModalProps) {
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);
  const setParticipants = useTournamentStore((state) => state.setParticipants);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: 0,
    gender: '',
    heightFeet: 0,
    heightInches: 0,
    school: '',
    branch: '',
    formsDivision: null as string | null,
    sparringDivision: null as string | null,
  });

  // Get unique schools and branches from existing participants
  const uniqueSchools = useMemo(() => {
    const schools = new Set(participants.map(p => p.school).filter(Boolean));
    return Array.from(schools).sort();
  }, [participants]);

  const uniqueBranches = useMemo(() => {
    const branches = new Set(participants.map(p => p.branch).filter(Boolean));
    return Array.from(branches).sort();
  }, [participants]);

  const uniqueGenders = useMemo(() => {
    const genders = new Set(participants.map(p => p.gender).filter(Boolean));
    return Array.from(genders).sort();
  }, [participants]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Please enter both first and last name');
      return;
    }

    if (formData.age <= 0) {
      alert('Please enter a valid age');
      return;
    }

    // Create new participant
    const newParticipant: Participant = {
      id: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age,
      gender: formData.gender,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
      school: formData.school,
      branch: formData.branch || undefined,
      formsDivision: formData.formsDivision,
      sparringDivision: formData.sparringDivision,
      competingForms: formData.formsDivision !== null,
      competingSparring: formData.sparringDivision !== null,
      formsCategoryId: undefined,
      sparringCategoryId: undefined,
      formsPool: undefined,
      sparringPool: undefined,
      formsRankOrder: undefined,
      sparringRankOrder: undefined,
      sparringAltRing: '',
    };

    // Add to participants list
    setParticipants([...participants, newParticipant]);

    // Reset form and close
    setFormData({
      firstName: '',
      lastName: '',
      age: 0,
      gender: '',
      heightFeet: 0,
      heightInches: 0,
      school: '',
      branch: '',
      formsDivision: null,
      sparringDivision: null,
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      lastName: '',
      age: 0,
      gender: '',
      heightFeet: 0,
      heightInches: 0,
      school: '',
      branch: '',
      formsDivision: null,
      sparringDivision: null,
    });
    onClose();
  };

  if (!isOpen) return null;

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
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          padding: '30px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Add New Participant</h2>

        <form onSubmit={handleSubmit}>
          {/* Name Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Age and Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Age *
              </label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                required
                min="1"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Select...</option>
                {uniqueGenders.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Height */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Height (Feet)
              </label>
              <input
                type="number"
                value={formData.heightFeet || ''}
                onChange={(e) => setFormData({ ...formData, heightFeet: parseInt(e.target.value) || 0 })}
                min="0"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Height (Inches)
              </label>
              <input
                type="number"
                value={formData.heightInches || ''}
                onChange={(e) => setFormData({ ...formData, heightInches: parseInt(e.target.value) || 0 })}
                min="0"
                max="11"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* School and Branch */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                School
              </label>
              <select
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Select...</option>
                {uniqueSchools.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Branch
              </label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Select...</option>
                {uniqueBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Divisions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#007bff' }}>
                Forms Division
              </label>
              <select
                value={formData.formsDivision || ''}
                onChange={(e) => setFormData({ ...formData, formsDivision: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Not Participating</option>
                {config.divisions.map(div => (
                  <option key={div.name} value={div.name}>{div.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#dc3545' }}>
                Sparring Division
              </label>
              <select
                value={formData.sparringDivision || ''}
                onChange={(e) => setFormData({ ...formData, sparringDivision: e.target.value || null })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Not Participating</option>
                {config.divisions.map(div => (
                  <option key={div.name} value={div.name}>{div.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Add Participant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddParticipantModal;
