import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Participant } from '../../types/tournament';

export function parseExcel(file: File): Promise<Participant[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const participants = parseWorkbook(workbook);
      resolve(participants);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseExcelFile(fileData: number[]): Participant[] {
  const data = new Uint8Array(fileData);
  const workbook = XLSX.read(data, { type: 'array' });
  return parseWorkbook(workbook);
}

function parseWorkbook(workbook: XLSX.WorkBook): Participant[] {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (json.length === 0) {
    return [];
  }
  
  const header = json[0].map((h: any) => String(h).toLowerCase().trim());
  console.log('========= EXCEL PARSER DEBUG =========');
  console.log('Excel column headers:', header);
  console.log('======================================');
  alert('Excel parser running! Check console for details. Headers: ' + header.join(', '));
  
  const participants: Participant[] = json
    .slice(1)
    .filter((row) => row && row.length > 0) // Filter empty rows
    .map((row) => {
      const obj: any = {};
      header.forEach((key: string, idx: number) => {
        obj[key] = row[idx];
      });
      
      // Try different column name variations for age
      const ageValue = obj['student age'] || obj['age'];
      let age = 0;
      if (typeof ageValue === 'string') {
        const lowerAge = ageValue.toLowerCase().trim();
        console.log('🔍 Parsing age string:', ageValue, '-> lowercase:', lowerAge);
        // Check for various adult age formats
        if (lowerAge.includes('18') || lowerAge.includes('adult') || lowerAge.includes('up')) {
          age = 18;
          console.log('✅ Detected as adult, setting age to 18');
        } else {
          age = Number(ageValue) || 0;
          console.log('🔢 Converted to number:', age);
        }
      } else if (typeof ageValue === 'number') {
        age = ageValue;
      } else {
        console.log('⚠️ Age value is not string or number:', ageValue, 'type:', typeof ageValue);
        age = Number(ageValue) || 0;
      }

      return {
        id: uuidv4(),
        firstName: obj['student first name'] || '',
        lastName: obj['student last name'] || '',
        age,
        gender: obj['gender'] || '',
        heightFeet: Number(obj['Feet']) || 0,
        heightInches: Number(obj['Inches']) || 0,
        school: obj['school'] || '',
        branch: obj['Branch'] || '',
        division: obj['division'] || '',
        competingForms: true,
        competingSparring: true,
      };
    });
  
  return participants;
}
