import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing, PhysicalRingMapping, Cohort } from '../../types/tournament';
import { getExpandedRingName } from '../ringNameFormatter';

export function generateCheckInSheet(
  participants: Participant[],
  division: string,
  physicalRings: PhysicalRing[],
  physicalRingMappings?: PhysicalRingMapping[],
  cohorts?: Cohort[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // Filter participants by division - check formsDivision, sparringDivision, or legacy division field
  const divisionParticipants = participants
    .filter((p) => {
      return p.formsDivision === division || 
             p.sparringDivision === division || 
             p.division === division;
    })
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

  let pageNumber = 1;
  const totalPages = Math.ceil(divisionParticipants.length / 32); // Approximate rows per page

  // Title with page number
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Check-In Sheet - ${division} (Page ${pageNumber} of ${totalPages})`, 15, 20);

  // Table headers
  let y = 35;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Last Name', 15, y);
  doc.text('First Name', 55, y);
  doc.text('School', 95, y);
  doc.text('Ring', 135, y);
  doc.text('Forms', 170, y);
  doc.text('Spar', 185, y);

  // Draw header line
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  // Table rows
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  divisionParticipants.forEach((participant, index) => {
    if (y > 260) {
      doc.addPage();
      pageNumber++;
      y = 20;
      
      // Title with page number
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Check-In Sheet - ${division} (Page ${pageNumber} of ${totalPages})`, 15, 15);
      
      y = 30;
      // Repeat headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Last Name', 15, y);
      doc.text('First Name', 55, y);
      doc.text('School', 95, y);
      doc.text('Ring', 135, y);
      doc.text('Forms', 170, y);
      doc.text('Spar', 185, y);
      y += 2;
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    // Get ring info - use formsCohortRing with physical ring mappings (same as name tags)
    let ringNumber = '';
    let ringColor = '';
    
    // Debug logging for first participant
    if (index === 0) {
      console.log('Check-in sheet participant data:');
      console.log('  competingForms:', participant.competingForms);
      console.log('  competingSparring:', participant.competingSparring);
      console.log('  formsDivision:', participant.formsDivision);
      console.log('  sparringDivision:', participant.sparringDivision);
    }
    
    if (participant.formsCohortRing && participant.formsCohortId && physicalRingMappings && cohorts) {
      // Find the cohort to get its name
      const formsCohort = cohorts.find(c => c.id === participant.formsCohortId);
      
      if (formsCohort) {
        const cohortRingName = `${formsCohort.name}_${participant.formsCohortRing}`;
        const mapping = physicalRingMappings.find(m => m.cohortRingName === cohortRingName);
        
        if (mapping) {
          const physicalRingName = mapping.physicalRingName;
          
          // Extract ring number from physicalRingName (e.g., "PR6a" -> "6")
          // The base number is what we use to find the physical ring
          const ringNumberMatch = physicalRingName.match(/PR(\d+)/i);
          
          if (ringNumberMatch) {
            const baseRingNumber = ringNumberMatch[1];
            
            // Find the physical ring by the base number
            const ring = physicalRings.find((r) => r.id === `ring-${baseRingNumber}`);
            
            if (ring) {
              // Extract full ring identifier (e.g., "6a" from "PR6a")
              const fullRingMatch = physicalRingName.match(/PR(\d+[a-z]?)/i);
              ringNumber = fullRingMatch ? fullRingMatch[1] : baseRingNumber;
              ringColor = ring.color;
            }
          }
        }
      }
    }

    doc.text(participant.lastName, 15, y);
    doc.text(participant.firstName, 55, y);
    doc.text(participant.school.substring(0, 25), 95, y);
    
    // Draw ring with colored background
    if (ringNumber && ringColor) {
      const ringText = `Ring ${ringNumber}`;
      const textWidth = doc.getTextWidth(ringText);
      
      // Convert hex color to RGB for background
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 200, g: 200, b: 200 };
      };
      
      const bgColor = hexToRgb(ringColor);
      
      // Draw colored background rectangle
      doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      doc.rect(134, y - 3.5, textWidth + 2, 5, 'F');
      
      // Determine text color (white for dark backgrounds, black for light)
      const brightness = (bgColor.r * 299 + bgColor.g * 587 + bgColor.b * 114) / 1000;
      doc.setTextColor(brightness > 128 ? 0 : 255);
      
      doc.text(ringText, 135, y);
      
      // Reset text color to black
      doc.setTextColor(0);
    }
    
    // Forms - Y or N with colored background
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0); // Black text
    if (participant.competingForms) {
      // Green background for Y
      doc.setFillColor(144, 238, 144); // Light green
      doc.rect(170, y - 3.5, 8, 5, 'F');
      doc.text('Y', 172, y);
    } else {
      // Red background for N
      doc.setFillColor(255, 100, 100); // Brighter red
      doc.rect(170, y - 3.5, 8, 5, 'F');
      doc.text('N', 172, y);
    }
    
    // Sparring - Y or N with colored background
    if (participant.competingSparring) {
      // Green background for Y
      doc.setFillColor(144, 238, 144); // Light green
      doc.rect(185, y - 3.5, 8, 5, 'F');
      doc.text('Y', 187, y);
    } else {
      // Red background for N
      doc.setFillColor(255, 100, 100); // Brighter red
      doc.rect(185, y - 3.5, 8, 5, 'F');
      doc.text('N', 187, y);
    }
    
    // Reset font
    doc.setFont('helvetica', 'normal');

    y += 7;
    
    // Draw line separator between rows
    doc.setDrawColor(200, 200, 200); // Light gray
    doc.setLineWidth(0.1);
    doc.line(15, y - 3.5, 195, y - 3.5);
    doc.setDrawColor(0, 0, 0); // Reset to black
  });

  return doc;
}
