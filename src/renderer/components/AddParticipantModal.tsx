import React, { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Participant } from '../types/tournament';
import { buildCategoryPoolName } from '../utils/ringNameFormatter';
import {
  participantFieldGrid,
  participantFieldLabel,
  participantModalCard,
  participantBioColumn,
  participantSectionTitle,
} from './participantFormStyles';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddParticipantModal({ isOpen, onClose }: AddParticipantModalProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const config = useTournamentStore((state) => state.config);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const setParticipants = useTournamentStore((state) => state.setParticipants);

  const emptyForm = {
    firstName: '',
    lastName: '',
    age: 0,
    gender: '',
    heightFeet: '' as number | '',
    heightInches: '' as number | '',
    school: '',
    branch: '',
    formsDivision: null as string | null,
    formsCategoryId: null as string | null,
    formsPool: null as string | null,
    sparringDivision: null as string | null,
    sparringCategoryId: null as string | null,
    sparringPool: null as string | null,
    sparringAltRing: '' as '' | 'a' | 'b',
    useFormsForSparring: true,
  };

  const [formData, setFormData] = useState(emptyForm);

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
    const genders = new Set<string>(['Male', 'Female']);
    participants.forEach(p => { if (p.gender) genders.add(p.gender); });
    return Array.from(genders).sort();
  }, [participants]);

  // Filtered categories based on selected division
  const formsCategories = useMemo(() =>
    categories.filter(c => c.type === 'forms' && c.division === formData.formsDivision),
    [categories, formData.formsDivision]
  );

  const sparringCategories = useMemo(() =>
    categories.filter(c => c.type === 'sparring' && c.division === formData.sparringDivision),
    [categories, formData.sparringDivision]
  );

  // Pool options for the selected category. Counts mirror Quick Edit so the
  // user can see Forms and Sparring ring sizes before choosing a pool.
  const formsPoolOptions = useMemo(() => {
    const cat = formsCategories.find(c => c.id === formData.formsCategoryId);
    if (!cat || !cat.numPools) return [];
    const matchingSparringCatId = cat.id.replace(/^forms-/, 'sparring-');
    return Array.from({ length: cat.numPools }, (_, i) => {
      const pool = `P${i + 1}`;
      const fCount = participants.filter(p => p.competingForms && p.formsCategoryId === cat.id && p.formsPool === pool).length;
      const sCount = participants.filter(p => p.competingSparring && p.sparringCategoryId === matchingSparringCatId && p.sparringPool === pool).length;
      return { pool, label: `Pool ${i + 1} (F:${fCount} S:${sCount})` };
    });
  }, [formsCategories, formData.formsCategoryId, participants]);

  const sparringPoolOptions = useMemo(() => {
    const cat = sparringCategories.find(c => c.id === formData.sparringCategoryId);
    if (!cat || !cat.numPools) return [];
    const matchingFormsCatId = cat.id.replace(/^sparring-/, 'forms-');
    return Array.from({ length: cat.numPools }, (_, i) => {
      const pool = `P${i + 1}`;
      const fCount = participants.filter(p => p.competingForms && p.formsCategoryId === matchingFormsCatId && p.formsPool === pool).length;
      const sCount = participants.filter(p => p.competingSparring && p.sparringCategoryId === cat.id && p.sparringPool === pool).length;
      return { pool, label: `Pool ${i + 1} (F:${fCount} S:${sCount})` };
    });
  }, [sparringCategories, formData.sparringCategoryId, participants]);

  // Physical ring is a mapping from category/pool -> ring. It is read-only in
  // this modal; it appears once a pool has been chosen.
  const selectedFormsCategory = formData.formsCategoryId
    ? categories.find(c => c.id === formData.formsCategoryId)
    : null;
  const formsPoolName = selectedFormsCategory && formData.formsPool
    ? buildCategoryPoolName(selectedFormsCategory.division, selectedFormsCategory.name, formData.formsPool)
    : null;
  const formsPhysicalRing = formsPoolName
    ? physicalRingMappings.find(m => m.categoryPoolName === formsPoolName)?.physicalRingName
    : undefined;

  const selectedSparringCategory = formData.sparringCategoryId
    ? categories.find(c => c.id === formData.sparringCategoryId)
    : null;
  const sparringPoolName = selectedSparringCategory && formData.sparringPool
    ? buildCategoryPoolName(selectedSparringCategory.division, selectedSparringCategory.name, formData.sparringPool)
    : null;
  const sparringPhysicalRing = sparringPoolName
    ? physicalRingMappings.find(m => m.categoryPoolName === sparringPoolName)?.physicalRingName
    : undefined;

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

    if (!formData.gender.trim()) {
      alert('Please select a gender');
      return;
    }

    // Create new participant
    const newParticipant: Participant = {
      id: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age,
      gender: formData.gender,
      heightFeet: Number(formData.heightFeet) || 0,
      heightInches: Number(formData.heightInches) || 0,
      school: formData.school,
      branch: formData.branch || undefined,
      formsDivision: formData.formsDivision,
      sparringDivision: formData.sparringDivision,
      competingForms: formData.formsDivision !== null,
      competingSparring: formData.sparringDivision !== null,
      formsCategoryId: formData.formsCategoryId || undefined,
      sparringCategoryId: formData.sparringCategoryId || undefined,
      formsPool: formData.formsPool || undefined,
      sparringPool: formData.sparringPool || undefined,
      formsRankOrder: undefined,
      sparringRankOrder: undefined,
      sparringAltRing: formData.sparringAltRing,
    };

    // Add to participants list
    setParticipants([...participants, newParticipant]);

    // Reset form and close
    setFormData(emptyForm);
    onClose();
  };

  const handleCancel = () => {
    setFormData(emptyForm);
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
          padding: '20px',
          borderRadius: '8px',
          width: 'min(1180px, 94vw)',
          maxHeight: '88vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Add New Participant</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
            {/* Left: biographical data */}
            <div style={participantBioColumn}>
              <h4 style={{ ...participantSectionTitle, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Participant
              </h4>

          {/* Name Fields */}
          <div style={participantFieldGrid}>
            <div>
              <label style={participantFieldLabel}>
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
              <label style={participantFieldLabel}>
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
          <div style={participantFieldGrid}>
            <div>
              <label style={participantFieldLabel}>
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
              <label style={participantFieldLabel}>
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
          <div style={participantFieldGrid}>
            <div>
              <label style={participantFieldLabel}>
                Height (Feet)
              </label>
              <input
                type="number"
                value={formData.heightFeet}
                onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
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
              <label style={participantFieldLabel}>
                Height (Inches)
              </label>
              <input
                type="number"
                value={formData.heightInches}
                onChange={(e) => setFormData({ ...formData, heightInches: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
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
          <div style={participantFieldGrid}>
            <div>
              <label style={participantFieldLabel}>
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
              <label style={participantFieldLabel}>
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

            </div>

            {/* Right: Forms and Sparring assignments */}
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    id="useFormsForSparring"
                    checked={formData.useFormsForSparring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        const div = formData.formsDivision;
                        const sparCats = categories.filter(c => c.type === 'sparring' && c.division === div);
                        const autoSparCatId = sparCats.length === 1 ? sparCats[0].id : null;
                        setFormData({
                          ...formData,
                          useFormsForSparring: true,
                          sparringDivision: div,
                          sparringCategoryId: autoSparCatId,
                          sparringPool: formData.formsPool,
                        });
                      } else {
                        setFormData({ ...formData, useFormsForSparring: false });
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Use same assignment for both Forms and Sparring
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Forms Section */}
                <div style={participantModalCard}>
                  <h4 style={{ ...participantSectionTitle, color: '#007bff', marginBottom: '12px' }}>Forms</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Division</label>
                <select
                  value={formData.formsDivision || ''}
                  onChange={(e) => {
                    const div = e.target.value || null;
                    const sparCats = formData.useFormsForSparring
                      ? categories.filter(c => c.type === 'sparring' && c.division === div)
                      : [];
                    const autoSparCatId = sparCats.length === 1 ? sparCats[0].id : null;
                    setFormData({
                      ...formData,
                      formsDivision: div, formsCategoryId: null, formsPool: null,
                      ...(formData.useFormsForSparring ? { sparringDivision: div, sparringCategoryId: autoSparCatId, sparringPool: null, sparringAltRing: '' } : {}),
                    });
                  }}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="">Not Participating</option>
                  {config.divisions.map(div => (
                    <option key={div.name} value={div.name}>{div.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Category</label>
                <select
                  value={formData.formsCategoryId || ''}
                  onChange={(e) => {
                    const catId = e.target.value || null;
                    let sparCatId = formData.sparringCategoryId;
                    if (formData.useFormsForSparring) {
                      const selectedFormsCat = formsCategories.find(c => c.id === catId);
                      const matchingSparCat = selectedFormsCat
                        ? categories.find(c => c.type === 'sparring' && c.division === formData.sparringDivision && c.name === selectedFormsCat.name)
                        : null;
                      sparCatId = matchingSparCat ? matchingSparCat.id : null;
                    }
                    setFormData({
                      ...formData,
                      formsCategoryId: catId, formsPool: null,
                      ...(formData.useFormsForSparring ? { sparringCategoryId: sparCatId, sparringPool: null } : {}),
                    });
                  }}
                  disabled={!formData.formsDivision || formsCategories.length === 0}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: (!formData.formsDivision || formsCategories.length === 0) ? 0.5 : 1 }}
                >
                  <option value="">{formsCategories.length === 0 ? 'No categories' : 'Select...'}</option>
                  {formsCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Pool</label>
                <select
                  value={formData.formsPool || ''}
                  onChange={(e) => {
                    const pool = e.target.value || null;
                    setFormData({
                      ...formData,
                      formsPool: pool,
                      ...(formData.useFormsForSparring ? { sparringPool: pool } : {}),
                    });
                  }}
                  disabled={!formData.formsCategoryId || formsPoolOptions.length === 0}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: (!formData.formsCategoryId || formsPoolOptions.length === 0) ? 0.5 : 1 }}
                >
                  <option value="">{formsPoolOptions.length === 0 ? 'No pools' : 'Select...'}</option>
                  {formsPoolOptions.map(opt => (
                    <option key={opt.pool} value={opt.pool}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

                  {formsPhysicalRing && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Physical Ring
                      </label>
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}>
                        {formsPhysicalRing}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Change in Ring Map tab
                      </div>
                    </div>
                  )}
                </div>

                {/* Sparring Section */}
                <div style={participantModalCard}>
                  <h4 style={{ ...participantSectionTitle, color: '#dc3545', marginBottom: '12px' }}>Sparring</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Division</label>
                <select
                  value={formData.sparringDivision || ''}
                  onChange={(e) => setFormData({ ...formData, sparringDivision: e.target.value || null, sparringCategoryId: null, sparringPool: null, sparringAltRing: '' })}
                  disabled={formData.useFormsForSparring}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: formData.useFormsForSparring ? 0.6 : 1 }}
                >
                  <option value="">Not Participating</option>
                  {config.divisions.map(div => (
                    <option key={div.name} value={div.name}>{div.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Category</label>
                <select
                  value={formData.sparringCategoryId || ''}
                  onChange={(e) => setFormData({ ...formData, sparringCategoryId: e.target.value || null, sparringPool: null, sparringAltRing: '' })}
                  disabled={formData.useFormsForSparring || !formData.sparringDivision || sparringCategories.length === 0}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: (formData.useFormsForSparring || !formData.sparringDivision || sparringCategories.length === 0) ? 0.5 : 1 }}
                >
                  <option value="">{sparringCategories.length === 0 ? 'No categories' : 'Select...'}</option>
                  {sparringCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Pool</label>
                <select
                  value={formData.sparringPool || ''}
                  onChange={(e) => setFormData({ ...formData, sparringPool: e.target.value || null })}
                  disabled={formData.useFormsForSparring || !formData.sparringCategoryId || sparringPoolOptions.length === 0}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: (formData.useFormsForSparring || !formData.sparringCategoryId || sparringPoolOptions.length === 0) ? 0.5 : 1 }}
                >
                  <option value="">{sparringPoolOptions.length === 0 ? 'No pools' : 'Select...'}</option>
                  {sparringPoolOptions.map(opt => (
                    <option key={opt.pool} value={opt.pool}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Alt Ring</label>
                <select
                  value={formData.sparringAltRing}
                  onChange={(e) => setFormData({ ...formData, sparringAltRing: e.target.value as '' | 'a' | 'b' })}
                  disabled={!formData.sparringPool}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid var(--input-border)', borderRadius: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', opacity: !formData.sparringPool ? 0.5 : 1 }}
                >
                  <option value="">None</option>
                  <option value="a">Alt Ring A</option>
                  <option value="b">Alt Ring B</option>
                </select>
              </div>
            </div>

                  {sparringPhysicalRing && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Physical Ring
                      </label>
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        opacity: formData.useFormsForSparring ? 0.7 : 1,
                      }}>
                        {sparringPhysicalRing}
                        {formData.useFormsForSparring && formsPhysicalRing && sparringPhysicalRing !== formsPhysicalRing && (
                          <span style={{ fontSize: '11px', marginLeft: '6px', color: 'var(--accent-primary)' }}>ℹ Different from Forms</span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Change in Ring Map tab
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
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
