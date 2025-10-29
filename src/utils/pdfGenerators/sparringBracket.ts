import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../../types/tournament';

interface Match {
  id: number;
  round: number;
  position: number;
  participant1?: string;
  participant2?: string;
  nextMatchId?: number;
}

export function generateSparringBracket(
  participants: Participant[],
  ring: CompetitionRing,
  physicalRing: PhysicalRing,
  divisionName: string,
  watermarkPath?: string
): jsPDF {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  // Add watermark if provided
  if (watermarkPath) {
    try {
      pdf.addImage(watermarkPath, 'PNG', 60, 50, 170, 170, '', 'NONE', 0.1);
    } catch (e) {
      console.error('Failed to add watermark:', e);
    }
  }

  // Title
  pdf.setFontSize(16);
  pdf.text(`Sparring Bracket - ${divisionName}`, 148, 12, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`Ring: ${physicalRing.color}`, 148, 18, { align: 'center' });

  // Get participants in this ring, sorted by rank order (height)
  const ringParticipants = participants
    .filter((p) => p.sparringRingId === ring.id)
    .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));

  // Create 16-person bracket structure
  const matches: Match[] = [];
  let matchId = 1;

  // Round 1 (8 matches)
  for (let i = 0; i < 8; i++) {
    matches.push({
      id: matchId++,
      round: 1,
      position: i,
      nextMatchId: 9 + Math.floor(i / 2),
    });
  }

  // Round 2 (4 matches)
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: matchId++,
      round: 2,
      position: i,
      nextMatchId: 13 + Math.floor(i / 2),
    });
  }

  // Round 3 (2 matches - semi-finals)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: matchId++,
      round: 3,
      position: i,
      nextMatchId: 15, // Finals
    });
  }

  // Finals
  matches.push({
    id: matchId++,
    round: 4,
    position: 0,
  });

  // Third place match
  matches.push({
    id: matchId++,
    round: 4,
    position: 1,
  });

  // Assign participants to bracket
  // Place participants starting from top, with byes toward the top
  const numParticipants = ringParticipants.length;
  const participantNames = ringParticipants.map(
    (p) => `${p.firstName} ${p.lastName}`
  );

  // Distribute participants in round 1 matches
  // Keep byes toward the top
  const round1Matches = matches.filter((m) => m.round === 1);
  let pIdx = 0;

  // Fill from bottom up so byes are at top
  for (let i = round1Matches.length - 1; i >= 0 && pIdx < numParticipants; i--) {
    if (pIdx < numParticipants) {
      round1Matches[i].participant1 = participantNames[pIdx++];
    }
    if (pIdx < numParticipants) {
      round1Matches[i].participant2 = participantNames[pIdx++];
    }
  }

  // Draw bracket
  drawBracket(pdf, matches, divisionName);

  return pdf;
}

function drawBracket(pdf: jsPDF, matches: Match[], divisionName: string): void {
  const startX = 20;
  const startY = 30;
  const boxWidth = 50;
  const boxHeight = 10;
  const roundSpacing = 60;
  const matchSpacing = 12;

  pdf.setFontSize(8);

  // Draw rounds
  for (let round = 1; round <= 4; round++) {
    const roundMatches = matches.filter((m) => m.round === round);
    const x = startX + (round - 1) * roundSpacing;

    // Special handling for round 4 (finals and 3rd place)
    if (round === 4) {
      // Finals
      const finals = roundMatches[0];
      const yFinals = startY + 60;
      drawMatch(pdf, finals, x, yFinals, boxWidth, boxHeight);

      // Third place
      const thirdPlace = roundMatches[1];
      const yThird = startY + 110;
      pdf.setFontSize(7);
      pdf.text('3rd Place', x, yThird - 3);
      pdf.setFontSize(8);
      drawMatch(pdf, thirdPlace, x, yThird, boxWidth, boxHeight);
    } else {
      roundMatches.forEach((match, idx) => {
        const spacing = matchSpacing * Math.pow(2, round - 1);
        const y = startY + idx * spacing * 2;
        drawMatch(pdf, match, x, y, boxWidth, boxHeight);

        // Draw connector lines to next round
        if (match.nextMatchId) {
          const nextMatch = matches.find((m) => m.id === match.nextMatchId);
          if (nextMatch) {
            const nextX = startX + round * roundSpacing;
            const nextSpacing = matchSpacing * Math.pow(2, round);
            const nextY = startY + nextMatch.position * nextSpacing * 2;

            pdf.line(x + boxWidth, y + boxHeight / 2, nextX, nextY + boxHeight / 2);
          }
        }
      });
    }
  }

  // Round labels
  pdf.setFontSize(9);
  pdf.text('Round 1', startX + 10, startY - 5);
  pdf.text('Round 2', startX + roundSpacing + 10, startY - 5);
  pdf.text('Semi-Finals', startX + roundSpacing * 2 + 5, startY - 5);
  pdf.text('Finals', startX + roundSpacing * 3 + 10, startY - 5);

  // Placements table
  const tableY = startY + 135;
  pdf.setFontSize(10);
  pdf.text('Placements', startX, tableY);
  pdf.setFontSize(9);
  ['1st Place:', '2nd Place:', '3rd Place:'].forEach((place, idx) => {
    pdf.text(place, startX, tableY + 8 + idx * 8);
    pdf.line(startX + 25, tableY + 8 + idx * 8, startX + 80, tableY + 8 + idx * 8);
  });
}

function drawMatch(
  pdf: jsPDF,
  match: Match,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Color gradient based on round
  const colors = [
    [240, 240, 240], // Round 1 - lightest
    [220, 220, 220], // Round 2
    [200, 200, 200], // Round 3
    [180, 180, 180], // Round 4 - darkest
  ];
  
  const color = colors[match.round - 1] || colors[0];
  pdf.setFillColor(color[0], color[1], color[2]);

  // Match number
  pdf.setFontSize(7);
  pdf.text(`M${match.id}`, x - 8, y + height / 2 + 2);

  // Participant 1 box
  pdf.rect(x, y, width, height, 'FD');
  pdf.setFontSize(8);
  if (match.participant1) {
    pdf.text(match.participant1, x + 2, y + height / 2 + 2);
  } else {
    pdf.setTextColor(150, 150, 150);
    pdf.text('BYE', x + 2, y + height / 2 + 2);
    pdf.setTextColor(0, 0, 0);
  }

  // Participant 2 box
  pdf.rect(x, y + height, width, height, 'FD');
  if (match.participant2) {
    pdf.text(match.participant2, x + 2, y + height + height / 2 + 2);
  } else if (match.participant1) {
    // Only show BYE for second slot if there's a participant in first slot
    pdf.setTextColor(150, 150, 150);
    pdf.text('BYE', x + 2, y + height + height / 2 + 2);
    pdf.setTextColor(0, 0, 0);
  }
}
