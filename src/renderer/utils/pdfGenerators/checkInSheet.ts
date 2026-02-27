import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing, PhysicalRingMapping, Category } from '../../types/tournament';
import { getExpandedRingName, formatPdfTimestamp, buildCategoryPoolName } from '../ringNameFormatter';
import { getSchoolAbbreviation } from '../schoolAbbreviations';
import { getEffectiveFormsInfo } from '../computeRings';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';

// Helper function to add timestamp footer to current page
function addTimestampFooter(doc: jsPDF): void {
  const timestamp = formatPdfTimestamp();
  const margin = 10; // mm
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128); // Gray text
  doc.text(timestamp, margin + 50, pageHeight - 5);
  doc.setTextColor(0, 0, 0); // Reset to black
}

export function generateCheckInSheet(
  participants: Participant[],
  division: string,
  physicalRings: PhysicalRing[],
  physicalRingMappings?: PhysicalRingMapping[],
  categories?: Category[],
  schoolAbbreviations?: { [schoolName: string]: string }
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
             p.sparringDivision === division;
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

  // Add timestamp footer to first page
  addTimestampFooter(doc);

  // Table rows
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  divisionParticipants.forEach((participant, index) => {
    if (y > 260) {
      // Add timestamp to current page before adding new page
      addTimestampFooter(doc);
      
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
      
      // Add timestamp footer to new page
      addTimestampFooter(doc);
    }

    // Get ring info - use effective forms pool
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
    
    const effectiveForms = getEffectiveFormsInfo(participant);
    if (effectiveForms.pool && effectiveForms.categoryId && physicalRingMappings && categories) {
      // Find the category to get its name
      const formsCategory = categories.find(c => c.id === effectiveForms.categoryId);
      
      if (formsCategory) {
        const categoryRingName = buildCategoryPoolName(formsCategory.division, formsCategory.name, effectiveForms.pool);
        const mapping = physicalRingMappings.find(m => 
          m.categoryPoolName === categoryRingName
        );
        
        if (mapping) {
          const physicalRingName = mapping.physicalRingName;
          
          // Extract ring number from physicalRingName (e.g., "PR6a" -> "6")
          // The base number is what we use to find the physical ring
          const ringNumberMatch = physicalRingName.match(/(?:PR|Ring\s*)(\d+)/i);
          
          if (ringNumberMatch) {
            const baseRingNumber = ringNumberMatch[1];
            
            // Find the physical ring by the base number - any physical ring should have a color
            const ring = physicalRings.find((r) => r.id === `ring-${baseRingNumber}`);
            
            // Extract full ring identifier (e.g., "6a" from "PR6a")
            const fullRingMatch = physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z]?)/i);
            if (fullRingMatch) {
              const num = fullRingMatch[1];
              const suffix = fullRingMatch[2]?.toLowerCase() || '';
              
              // Convert to "Ring x" or "Ring x Group A" format
              if (suffix) {
                const groupMap: { [key: string]: string } = {
                  'a': 'Group A',
                  'b': 'Group B',
                  'c': 'Group C',
                  'd': 'Group D',
                };
                ringNumber = `${num} ${groupMap[suffix] || suffix}`;
              } else {
                ringNumber = num;
              }
            }
            
            // Get color from ring number using color map
            ringColor = getRingColorFromName(physicalRingName) || '';
          }
        }
      }
    }

    doc.text(participant.lastName, 15, y);
    doc.text(participant.firstName, 55, y);
    
    // School - Use abbreviation based on branch field (or school if no branch)
    const schoolKey = participant.branch || participant.school;
    const schoolDisplay = getSchoolAbbreviation(schoolKey, schoolAbbreviations);
    doc.text(schoolDisplay.substring(0, 25), 95, y);
    
    // Draw ring with colored background
    if (ringNumber && ringColor) {
      const ringText = `Ring ${ringNumber}`;
      const textWidth = doc.getTextWidth(ringText);
      
      const bgColor = hexToRgb(ringColor);
      const fgColor = getForegroundColor(ringColor);
      
      // Draw colored background rectangle
      doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      doc.rect(134, y - 3.5, textWidth + 2, 5, 'F');
      
      // Set text color based on background
      const fgRgb = hexToRgb(fgColor);
      doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
      
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

  // Add timestamp to the last page
  addTimestampFooter(doc);

  return doc;
}
