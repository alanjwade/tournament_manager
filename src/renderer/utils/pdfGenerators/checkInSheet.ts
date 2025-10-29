import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';

export function generateCheckInSheet(
  participants: Participant[],
  division: string,
  physicalRings: PhysicalRing[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const divisionParticipants = participants
    .filter((p) => p.division === division)
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Check-In Sheet - ${division}`, 15, 20);

  // Table headers
  let y = 35;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Last Name', 15, y);
  doc.text('First Name', 60, y);
  doc.text('School', 100, y);
  doc.text('Ring', 150, y);
  doc.text('✓', 190, y);

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
      y = 20;
      
      // Repeat headers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Last Name', 15, y);
      doc.text('First Name', 60, y);
      doc.text('School', 100, y);
      doc.text('Ring', 150, y);
      doc.text('✓', 190, y);
      y += 2;
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    // Get ring info
    let ringInfo = '';
    const formsRing = participant.formsRingId;
    if (formsRing) {
      const physicalRingId = formsRing.split('-').pop();
      const ring = physicalRings.find((r) => r.id === physicalRingId);
      if (ring) {
        ringInfo = ring.color;
      }
    }

    doc.text(participant.lastName, 15, y);
    doc.text(participant.firstName, 60, y);
    doc.text(participant.school.substring(0, 30), 100, y);
    doc.text(ringInfo, 150, y);
    
    // Checkbox
    doc.rect(190, y - 3, 5, 5);

    y += 7;
  });

  return doc;
}
