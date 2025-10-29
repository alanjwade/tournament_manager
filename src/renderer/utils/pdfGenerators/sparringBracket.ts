import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';

interface BracketSlot {
  participantId?: string;
  isBye: boolean;
  matchNumber?: number;
}

interface Match {
  number: number;
  round: number;
  position: number;
  participant1?: string;
  participant2?: string;
  nextMatch?: number;
}

export function generateSparringBrackets(
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
    (r) => r.division === division && r.type === 'sparring'
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
        doc.addImage(watermark, 'PNG', 40, 40, 200, 120, undefined, 'NONE', 0.1);
      } catch (e) {
        console.error('Error adding watermark:', e);
      }
    }

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sparring Bracket - ${division} - ${ringName} Ring`, 15, 15);

    const ringParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));

    // Generate 16-person bracket
    const matches = generate16PersonBracket(ringParticipants);

    // Draw bracket
    drawBracket(doc, matches, ringParticipants, watermark);

    // Placement table
    let y = 175;
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

function generate16PersonBracket(participants: Participant[]): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;

  // Round 1 (8 matches)
  for (let i = 0; i < 8; i++) {
    const p1Index = i * 2;
    const p2Index = i * 2 + 1;
    
    matches.push({
      number: matchNumber++,
      round: 1,
      position: i,
      participant1: p1Index < participants.length ? participants[p1Index].id : undefined,
      participant2: p2Index < participants.length ? participants[p2Index].id : undefined,
      nextMatch: 9 + Math.floor(i / 2),
    });
  }

  // Round 2 (4 matches) - Quarterfinals
  for (let i = 0; i < 4; i++) {
    matches.push({
      number: matchNumber++,
      round: 2,
      position: i,
      nextMatch: 13 + Math.floor(i / 2),
    });
  }

  // Round 3 (2 matches) - Semifinals
  for (let i = 0; i < 2; i++) {
    matches.push({
      number: matchNumber++,
      round: 3,
      position: i,
      nextMatch: 15, // Finals
    });
  }

  // Finals
  matches.push({
    number: matchNumber++,
    round: 4,
    position: 0,
  });

  // Third place match
  matches.push({
    number: matchNumber++,
    round: 4,
    position: 1,
  });

  return matches;
}

function drawBracket(
  doc: jsPDF,
  matches: Match[],
  participants: Participant[],
  watermark?: string
) {
  const startX = 15;
  const startY = 25;
  const matchHeight = 15;
  const roundSpacing = 50;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Color shades for progressive darkening
  const colorShades = [
    [240, 248, 255], // Very light blue
    [200, 220, 240], // Light blue
    [160, 190, 220], // Medium blue
    [120, 160, 200], // Darker blue
  ];

  // Round 1 (8 matches)
  let y = startY;
  for (let i = 0; i < 8; i++) {
    const match = matches[i];
    const x = startX;
    
    drawMatch(doc, x, y, match, participants, colorShades[0]);
    y += matchHeight * 2;
  }

  // Round 2 (4 matches)
  y = startY + matchHeight / 2;
  for (let i = 8; i < 12; i++) {
    const match = matches[i];
    const x = startX + roundSpacing;
    
    drawMatch(doc, x, y, match, participants, colorShades[1]);
    
    // Draw lines connecting from previous round
    const prevY1 = startY + (i - 8) * 4 * matchHeight + matchHeight / 2;
    const prevY2 = prevY1 + 2 * matchHeight;
    doc.line(startX + 40, prevY1, x, y + 3);
    doc.line(startX + 40, prevY2, x, y + 3);
    
    y += matchHeight * 4;
  }

  // Round 3 (2 matches)
  y = startY + matchHeight * 1.5;
  for (let i = 12; i < 14; i++) {
    const match = matches[i];
    const x = startX + roundSpacing * 2;
    
    drawMatch(doc, x, y, match, participants, colorShades[2]);
    
    // Draw connecting lines
    const prevY1 = startY + matchHeight / 2 + (i - 12) * 8 * matchHeight;
    const prevY2 = prevY1 + 4 * matchHeight;
    doc.line(startX + roundSpacing + 40, prevY1, x, y + 3);
    doc.line(startX + roundSpacing + 40, prevY2, x, y + 3);
    
    y += matchHeight * 8;
  }

  // Finals
  const finalsMatch = matches[14];
  const finalsX = startX + roundSpacing * 3;
  const finalsY = startY + matchHeight * 3.5;
  drawMatch(doc, finalsX, finalsY, finalsMatch, participants, colorShades[3]);
  
  // Draw lines to finals
  const semi1Y = startY + matchHeight * 1.5 + 3;
  const semi2Y = startY + matchHeight * 9.5 + 3;
  doc.line(startX + roundSpacing * 2 + 40, semi1Y, finalsX, finalsY + 3);
  doc.line(startX + roundSpacing * 2 + 40, semi2Y, finalsX, finalsY + 3);

  // Third place match
  const thirdPlaceMatch = matches[15];
  const thirdY = finalsY + matchHeight * 2;
  drawMatch(doc, finalsX, thirdY, thirdPlaceMatch, participants, colorShades[2]);
  doc.setFontSize(7);
  doc.text('3rd Place', finalsX - 12, thirdY + 3);
}

function drawMatch(
  doc: jsPDF,
  x: number,
  y: number,
  match: Match,
  participants: Participant[],
  bgColor: number[]
) {
  const width = 40;
  const height = 12;

  // Draw background with color
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, width, height, 'F');

  // Draw border
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Match number
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${match.number}`, x + 2, y + 4);

  // Participants
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const p1 = match.participant1
    ? participants.find((p) => p.id === match.participant1)
    : null;
  const p2 = match.participant2
    ? participants.find((p) => p.id === match.participant2)
    : null;

  if (p1) {
    const name = `${p1.firstName.substring(0, 1)}. ${p1.lastName.substring(0, 10)}`;
    doc.text(name, x + 2, y + 8);
  } else if (match.round === 1) {
    doc.setFont('helvetica', 'italic');
    doc.text('BYE', x + 2, y + 8);
    doc.setFont('helvetica', 'normal');
  }

  if (p2) {
    const name = `${p2.firstName.substring(0, 1)}. ${p2.lastName.substring(0, 10)}`;
    doc.text(name, x + 2, y + 11);
  } else if (match.round === 1 && match.participant1) {
    doc.setFont('helvetica', 'italic');
    doc.text('BYE', x + 2, y + 11);
    doc.setFont('helvetica', 'normal');
  }

  // Winner line
  doc.setLineWidth(0.2);
  doc.line(x + width - 10, y + height / 2, x + width, y + height / 2);

  // Next match indicator
  if (match.nextMatch) {
    doc.setFontSize(6);
    doc.text(`→${match.nextMatch}`, x + width + 2, y + height / 2 + 1);
  }
}
