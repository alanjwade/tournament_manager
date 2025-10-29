import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../../types/tournament';

export function generateCheckInSheet(
  participants: Participant[],
  rings: CompetitionRing[],
  physicalRings: PhysicalRing[],
  divisionName: string
): jsPDF {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  
  // Title
  pdf.setFontSize(18);
  pdf.text(`Check-In Sheet - ${divisionName}`, 105, 15, { align: 'center' });

  // Sort participants by last name, then first name
  const sorted = [...participants].sort((a, b) => {
    const lastNameCmp = a.lastName.localeCompare(b.lastName);
    if (lastNameCmp !== 0) return lastNameCmp;
    return a.firstName.localeCompare(b.firstName);
  });

  // Table headers
  pdf.setFontSize(10);
  let y = 30;
  const lineHeight = 7;
  
  pdf.text('Last Name', 15, y);
  pdf.text('First Name', 55, y);
  pdf.text('School', 95, y);
  pdf.text('Ring', 140, y);
  pdf.text('✓', 180, y);
  
  y += lineHeight;
  pdf.line(10, y - 2, 200, y - 2);

  sorted.forEach((participant, index) => {
    // Add new page if needed
    if (y > 270) {
      pdf.addPage();
      y = 20;
      
      // Repeat headers
      pdf.setFontSize(10);
      pdf.text('Last Name', 15, y);
      pdf.text('First Name', 55, y);
      pdf.text('School', 95, y);
      pdf.text('Ring', 140, y);
      pdf.text('✓', 180, y);
      y += lineHeight;
      pdf.line(10, y - 2, 200, y - 2);
    }

    // Find ring
    const formsRing = rings.find((r) => r.id === participant.formsRingId);
    const physicalRing = physicalRings.find((pr) => pr.id === formsRing?.physicalRingId);
    const ringInfo = physicalRing ? physicalRing.color : 'N/A';

    pdf.text(participant.lastName, 15, y);
    pdf.text(participant.firstName, 55, y);
    pdf.text(participant.school, 95, y);
    pdf.text(ringInfo, 140, y);
    
    // Checkbox
    pdf.rect(178, y - 4, 5, 5);

    y += lineHeight;
    
    // Separator line every 5 rows
    if ((index + 1) % 5 === 0) {
      pdf.line(10, y - 2, 200, y - 2);
    }
  });

  return pdf;
}
