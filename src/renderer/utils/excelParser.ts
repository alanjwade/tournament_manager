import * as XLSX from 'xlsx';
import { Participant } from '../types/tournament';

// Helper function to get the effective division for a participant
export function getEffectiveDivision(participant: Participant, type: 'forms' | 'sparring'): string | null {
  if (type === 'forms') {
    // null means not participating
    return participant.formsDivision;
  } else {
    // null means not participating
    return participant.sparringDivision;
  }
}

export function parseExcelFile(data: number[]): Participant[] {
  const uint8Array = new Uint8Array(data);
  const workbook = XLSX.read(uint8Array, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  console.log('========= EXCEL PARSER DEBUG =========');
  console.log('First row of data:', jsonData[0]);
  console.log('======================================');

  return jsonData.map((row, index) => {
    const heightFeet = Number(row['height feet'] || row['Height Feet'] || row['Feet'] || 0);
    const heightInches = Number(row['height inches'] || row['Height Inches'] || row['Inches'] || 0);
    
    // Handle age - check for "18 and Up" string
    let age = 0;
    const ageValue = row['age'] || row['Age'] || row['student age'] || row['Student Age'];
    if (typeof ageValue === 'string') {
      const lowerAge = ageValue.toLowerCase().trim();
      console.log('🔍 Parsing age string:', ageValue, '-> lowercase:', lowerAge);
      if (lowerAge.includes('18') || lowerAge.includes('adult') || lowerAge.includes('up')) {
        age = 18;
        console.log('✅ Detected as adult, setting age to 18');
      } else {
        age = Number(ageValue) || 0;
      }
    } else {
      age = Number(ageValue) || 0;
    }
    
    // Handle Forms and Sparring divisions
    const formsValue = String(row['Form'] || row['form'] || row['Forms'] || row['forms'] || '').trim();
    const sparringValue = String(row['Sparring'] || row['sparring'] || '').trim();
    const baseDivision = String(row['division'] || row['Division'] || '').trim();
    
    // Debug logging for division parsing
    if (index === 0) {
      console.log('📋 First participant division data:');
      console.log('  - formsValue:', formsValue);
      console.log('  - sparringValue:', sparringValue);
      console.log('  - baseDivision:', baseDivision);
    }
    
    // Determine forms division - null means not participating
    let formsDivision: string | null = null;
    let competingForms = false;
    if (formsValue.toLowerCase() === 'no' || formsValue.toLowerCase() === 'not participating') {
      // Explicitly marked as not participating
      formsDivision = null;
      competingForms = false;
    } else if (formsValue.toLowerCase() === 'yes' || formsValue.toLowerCase() === 'y' || formsValue === '') {
      // "Yes", "y", or empty Forms column - use base division if available
      if (baseDivision && baseDivision !== '') {
        formsDivision = baseDivision;
        competingForms = true;
      } else {
        // No base division - not participating
        formsDivision = null;
        competingForms = false;
      }
    } else if (formsValue && formsValue !== '') {
      // Has a specific division name
      formsDivision = formsValue;
      competingForms = true;
    }
    
    // Determine sparring division - null means not participating
    let sparringDivision: string | null = null;
    let competingSparring = false;
    if (sparringValue.toLowerCase() === 'no' || sparringValue.toLowerCase() === 'not participating') {
      // Explicitly marked as not participating
      sparringDivision = null;
      competingSparring = false;
    } else if (sparringValue.toLowerCase() === 'yes' || sparringValue.toLowerCase() === 'y' || sparringValue === '') {
      // "Yes", "y", or empty Sparring column - treat as "yes", use base division
      if (baseDivision && baseDivision !== '') {
        sparringDivision = baseDivision;
        competingSparring = true;
        if (index === 0) {
          console.log('  ✅ Sparring is Yes/empty, using baseDivision:', baseDivision);
        }
      } else {
        // No base division either - not participating
        sparringDivision = null;
        competingSparring = false;
        if (index === 0) {
          console.log('  ❌ Sparring is Yes/empty BUT baseDivision is empty - setting to not participating');
        }
      }
    } else if (sparringValue && sparringValue !== '') {
      // Has a specific value (division name)
      // Handle legacy "same as forms" value
      if (sparringValue.toLowerCase().includes('same') && sparringValue.toLowerCase().includes('form')) {
        sparringDivision = formsDivision;
        competingSparring = competingForms;
      } else {
        sparringDivision = sparringValue;
        competingSparring = true;
      }
    }
    
    // Debug final values
    if (index < 3) {
      console.log(`  📊 Final Participant ${index}:`, {
        formsDivision,
        competingForms,
        sparringDivision,
        competingSparring,
        baseDivision
      });
    }
    
    // Parse gender field
    const genderRaw = String(row['Student Gender'] || row['student gender'] || row['gender'] || row['Gender'] || '').trim().toLowerCase();
    let gender: 'Male' | 'Female' = 'Male'; // default
    if (genderRaw === 'f' || genderRaw === 'female') {
      gender = 'Female';
    } else if (genderRaw === 'm' || genderRaw === 'male') {
      gender = 'Male';
    }
    
    return {
      id: `participant-${index + 1}`,
      firstName: String(row['student first name'] || row['Student First Name'] || '').trim(),
      lastName: String(row['student last name'] || row['Student Last Name'] || '').trim(),
      age,
      gender,
      heightFeet,
      heightInches,
      totalHeightInches: heightFeet * 12 + heightInches,
      school: String(row['school'] || row['School'] || '').trim(),
      branch: row['branch'] || row['Branch'] ? String(row['branch'] || row['Branch']).trim() : undefined,
      formsDivision,
      sparringDivision,
      competingForms,
      competingSparring,
    };
  });
}
