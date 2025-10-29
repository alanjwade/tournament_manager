import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../../types/tournament';

export function generateFormsScoringSheet(
  participants: Participant[],
  ring: CompetitionRing,
  physicalRing: PhysicalRing,
  divisionName: string,
  watermarkPath?: string
): jsPDF {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  
  // Add watermark if provided
  if (watermarkPath) {
    try {
      pdf.addImage(watermarkPath, 'PNG', 40, 80, 130, 130, '', 'NONE', 0.1);
    } catch (e) {
      console.error('Failed to add watermark:', e);
    }
  }

  // Title
  pdf.setFontSize(18);
  pdf.text(`Forms Scoring Sheet`, 105, 15, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Division: ${divisionName}`, 105, 22, { align: 'center' });
  pdf.text(`Ring: ${physicalRing.color}`, 105, 28, { align: 'center' });

  // Get participants in this ring, sorted by rank order
  const ringParticipants = participants
    .filter((p) => p.formsRingId === ring.id)
    .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));

  // Table
  let y = 40;
  const lineHeight = 10;
  const colWidths = {
    order: 15,
    name: 55,
    school: 45,
    judge1: 20,
    judge2: 20,
    judge3: 20,
    final: 20,
  };
  
  let x = 15;
  
  pdf.setFontSize(9);
  pdf.text('#', x, y);
  x += colWidths.order;
  pdf.text('Name', x, y);
  x += colWidths.name;
  pdf.text('School', x, y);
  x += colWidths.school;
  pdf.text('Judge 1', x, y);
  x += colWidths.judge1;
  pdf.text('Judge 2', x, y);
  x += colWidths.judge2;
  pdf.text('Judge 3', x, y);
  x += colWidths.judge3;
  pdf.text('Final', x, y);

  y += 2;
  pdf.line(10, y, 200, y);
  y += lineHeight - 2;

  ringParticipants.forEach((participant, index) => {
    // Add new page if needed
    if (y > 270) {
      pdf.addPage();
      if (watermarkPath) {
        try {
          pdf.addImage(watermarkPath, 'PNG', 40, 80, 130, 130, '', 'NONE', 0.1);
        } catch (e) {
          console.error('Failed to add watermark:', e);
        }
      }
      y = 20;
    }

    x = 15;
    
    pdf.text(String(participant.formsRankOrder || index + 1), x, y);
    x += colWidths.order;
    pdf.text(`${participant.firstName} ${participant.lastName}`, x, y);
    x += colWidths.name;
    pdf.text(participant.school, x, y);
    x += colWidths.school;
    
    // Boxes for scores
    pdf.rect(x, y - 5, colWidths.judge1 - 2, 7);
    x += colWidths.judge1;
    pdf.rect(x, y - 5, colWidths.judge2 - 2, 7);
    x += colWidths.judge2;
    pdf.rect(x, y - 5, colWidths.judge3 - 2, 7);
    x += colWidths.judge3;
    pdf.rect(x, y - 5, colWidths.final - 2, 7);

    y += lineHeight;
  });

  // Placements table
  y += 10;
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  pdf.setFontSize(12);
  pdf.text('Placements', 15, y);
  y += 8;

  pdf.setFontSize(10);
  ['1st Place:', '2nd Place:', '3rd Place:'].forEach((place) => {
    pdf.text(place, 15, y);
    pdf.line(50, y, 150, y);
    y += 10;
  });

  return pdf;
}
