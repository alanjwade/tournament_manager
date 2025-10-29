import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';

export function generateFormsScoringSheets(
  participants: Participant[],
  competitionRings: CompetitionRing[],
  physicalRings: PhysicalRing[],
  division: string,
  watermark?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  });

  const divisionRings = competitionRings.filter(
    (r) => r.division === division && r.type === 'forms'
  );

  let firstPage = true;

  divisionRings.forEach((ring) => {
    if (!firstPage) {
      doc.addPage();
    }
    firstPage = false;

    const physicalRing = physicalRings.find((r) => r.id === ring.physicalRingId);
    const ringName = physicalRing ? physicalRing.color : 'Unknown';

    // Add watermark if provided
    if (watermark) {
      try {
        doc.addImage(watermark, 'PNG', 40, 40, 200, 150, undefined, 'NONE', 0.1);
      } catch (e) {
        console.error('Error adding watermark:', e);
      }
    }

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Forms Scoring Sheet - ${division} - ${ringName} Ring`, 15, 15);

    // Table
    let y = 30;
    const colWidths = {
      name: 60,
      school: 50,
      judge1: 20,
      judge2: 20,
      judge3: 20,
      final: 20,
    };

    // Headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let x = 15;
    doc.text('Participant', x, y);
    x += colWidths.name;
    doc.text('School', x, y);
    x += colWidths.school;
    doc.text('Judge 1', x, y);
    x += colWidths.judge1;
    doc.text('Judge 2', x, y);
    x += colWidths.judge2;
    doc.text('Judge 3', x, y);
    x += colWidths.judge3;
    doc.text('Final', x, y);

    // Header line
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(15, y, 15 + colWidths.name + colWidths.school + colWidths.judge1 + colWidths.judge2 + colWidths.judge3 + colWidths.final, y);

    // Participants
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const ringParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));

    ringParticipants.forEach((participant) => {
      if (y > 180) {
        doc.addPage();
        y = 20;
        
        // Repeat title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Forms Scoring Sheet - ${division} - ${ringName} Ring (cont.)`, 15, y);
        y += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      x = 15;
      doc.text(`${participant.firstName} ${participant.lastName}`, x, y);
      x += colWidths.name;
      doc.text(participant.school.substring(0, 25), x, y);
      x += colWidths.school;
      
      // Draw score boxes
      for (let i = 0; i < 4; i++) {
        doc.rect(x + 2, y - 4, 15, 6);
        x += i < 3 ? colWidths.judge1 : colWidths.final;
      }

      y += 10;
    });

    // Placement table
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Placements:', 15, y);
    
    y += 8;
    doc.setFontSize(10);
    const placements = ['1st Place:', '2nd Place:', '3rd Place:'];
    placements.forEach((place) => {
      doc.text(place, 15, y);
      doc.setLineWidth(0.3);
      doc.line(45, y, 120, y);
      y += 10;
    });
  });

  return doc;
}
