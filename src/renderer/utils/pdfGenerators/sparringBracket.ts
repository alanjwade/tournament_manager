import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';
import { getPhysicalRingId, getFullyQualifiedRingName, formatPdfTimestamp } from '../ringNameFormatter';
import { checkSparringAltRingStatus } from '../ringOrdering';

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
  watermark?: string,
  physicalRingMappings?: { cohortRingName: string; physicalRingName: string }[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = 8.5; // Letter width in inches
  const pageHeight = 11; // Letter height in inches
  const margin = 0.5; // 1/2 inch margins
  const timestamp = formatPdfTimestamp(); // Generate once for all pages

  const divisionRings = competitionRings
    .filter((r) => r.division === division && r.type === 'sparring')
    .sort((a, b) => {
      // Extract physical ring IDs for sorting
      const physicalRingIdA = a.name && physicalRingMappings 
        ? getPhysicalRingId(a.name, physicalRingMappings)
        : null;
      const physicalRingIdB = b.name && physicalRingMappings 
        ? getPhysicalRingId(b.name, physicalRingMappings)
        : null;
      
      // If no physical rings, fall back to ring name
      if (!physicalRingIdA && !physicalRingIdB) return 0;
      if (!physicalRingIdA) return 1;
      if (!physicalRingIdB) return -1;
      
      // Extract number and letter from physical ring ID (e.g., "PR4b" -> 4, "b")
      const matchA = physicalRingIdA.match(/(\d+)([a-z]?)/i);
      const matchB = physicalRingIdB.match(/(\d+)([a-z]?)/i);
      
      if (!matchA || !matchB) return 0;
      
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);
      const letterA = matchA[2] || '';
      const letterB = matchB[2] || '';
      
      // Sort by number first
      if (numA !== numB) return numA - numB;
      
      // Then by letter (a before b, etc.)
      return letterA.localeCompare(letterB);
    });

  let firstPage = true;

  divisionRings.forEach((ring) => {
    // Get all participants for this ring first
    const allRingParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));

    // Check for alt ring status
    const pool = ring.name?.match(/_R(\d+)$/)?.[0]?.substring(1); // Get "_R1" then remove "_" to get "R1"
    console.log('[sparringBracket] Ring:', ring.name, 'pool:', pool);
    const altStatus = pool 
      ? checkSparringAltRingStatus(participants, ring.categoryId, pool)
      : { status: 'none' as const, countA: 0, countB: 0, countEmpty: allRingParticipants.length };
    console.log('[sparringBracket] altStatus:', altStatus);

    // Function to generate a bracket for a set of participants with a specific alt ring label
    const generateBracketForAltRing = (ringParticipants: Participant[], altRingLabel: string = '') => {
      if (!firstPage) {
        doc.addPage();
      }
      firstPage = false;

      // Get physical ring ID from mapping using the pool name
      const physicalRingId = ring.name && physicalRingMappings 
        ? getPhysicalRingId(ring.name, physicalRingMappings)
        : null;
      
      const fullyQualifiedRingName = getFullyQualifiedRingName(division, physicalRingId, physicalRings);
      const titleWithAlt = altRingLabel ? `${fullyQualifiedRingName} ${altRingLabel}` : fullyQualifiedRingName;

      // Add watermark if provided - centered, as large as possible without cutting off
      if (watermark) {
        try {
          // Get image dimensions to maintain aspect ratio
          const img = new Image();
          img.src = watermark;
          
          const imgWidth = img.width || 1;
          const imgHeight = img.height || 1;
          const imgAspectRatio = imgWidth / imgHeight;
          
          // Calculate maximum size that fits with 0.5" margins while maintaining aspect ratio
          const maxWidth = pageWidth - (2 * margin);
          const maxHeight = pageHeight - (2 * margin);
          const maxAspectRatio = maxWidth / maxHeight;
          
          let wmWidth, wmHeight;
          if (imgAspectRatio > maxAspectRatio) {
            // Image is wider than available space
            wmWidth = maxWidth;
            wmHeight = maxWidth / imgAspectRatio;
          } else {
            // Image is taller than available space
            wmHeight = maxHeight;
            wmWidth = maxHeight * imgAspectRatio;
          }
          
          // Center the watermark
          const wmX = margin + (maxWidth - wmWidth) / 2;
          const wmY = margin + (maxHeight - wmHeight) / 2;
          
          // Set opacity for watermark
          doc.saveGraphicsState();
          (doc as any).setGState(new (doc as any).GState({ opacity: 0.15 })); // 15% opacity
          
          // Add watermark behind everything
          doc.addImage(watermark, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          
          // Restore opacity for rest of content
          doc.restoreGraphicsState();
        } catch (e) {
          console.error('Error adding watermark:', e);
        }
      }

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${titleWithAlt} Sparring Bracket`, margin, margin + 0.3);
      
      // Category ring name subtitle
      if (ring.name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${ring.name}${altRingLabel}`, margin, margin + 0.5);
      }

      console.log(`Ring ${ring.name}${altRingLabel}: ${ringParticipants.length} participants`);
      ringParticipants.forEach((p, i) => console.log(`  ${i}: ${p.firstName} ${p.lastName} (${p.id})`));

      // Generate 16-person bracket
      const matches = generate16PersonBracket(ringParticipants);
      
      console.log(`Generated ${matches.length} matches`);
      matches.slice(0, 8).forEach(m => {
        console.log(`  Match ${m.number}: p1=${m.participant1}, p2=${m.participant2}`);
      });

      // Draw bracket
      drawBracket(doc, matches, ringParticipants, watermark);

      // Placement table - upper right corner
      let x = pageWidth - 2.5; // 2.5" from right edge
      let y = margin + 0.5; // 0.5" below top margin
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Placements:', x, y);
      
      y += 0.3;
      doc.setFontSize(10);
      const placements = ['1st Place:', '2nd Place:', '3rd Place:'];
      placements.forEach((place) => {
        doc.text(place, x, y);
        doc.setLineWidth(0.01);
        doc.line(x + 1.0, y, x + 2.2, y);
        y += 0.3;
      });
      
      // Add timestamp at bottom
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128); // Gray text
      doc.text(timestamp, margin, pageHeight - 0.25);
      doc.setTextColor(0, 0, 0); // Reset to black
    };

    // If all participants have alt ring 'a' or 'b', generate separate brackets
    if (altStatus.status === 'all') {
      const participantsA = allRingParticipants.filter(p => p.sparringAltRing === 'a');
      const participantsB = allRingParticipants.filter(p => p.sparringAltRing === 'b');
      console.log('[sparringBracket] Splitting into alt rings - A:', participantsA.length, 'B:', participantsB.length);
      
      if (participantsA.length > 0) {
        generateBracketForAltRing(participantsA, 'Alt Ring A');
      }
      if (participantsB.length > 0) {
        generateBracketForAltRing(participantsB, 'Alt Ring B');
      }
    } else {
      // Normal case: generate single bracket for all participants
      console.log('[sparringBracket] Normal bracket (no split) - participants:', allRingParticipants.length);
      generateBracketForAltRing(allRingParticipants);
    }
  });

  return doc;
}

interface BracketPlacement {
  round: number;
  position: number;
  participantId?: string;
  matchNumber: number;
}

function calculateBracketPlacements(participants: Participant[], maxRounds: number = 4): {
  placements: BracketPlacement[];
  startRound: number;
  start2Round: number;
  numStartRound: number;
  numStart2Round: number;
  matchCount: number;
} {
  const totalPeople = participants.length;
  let startRound = 0;
  let start2Round = 0;
  let numStartRound = 0;
  let numStart2Round = 0;
  let slotsInNextRound = 0;

  console.log(`Calculating placements for ${totalPeople} people, maxRounds=${maxRounds}`);

  // Find which round we're going to start in
  // For a 16-person bracket: Round 1 = 16 slots, Round 2 = 8 slots, Round 3 = 4 slots, Round 4 = 2 slots
  for (let round = 1; round <= maxRounds; round++) {
    const slotsInStartRound = Math.pow(2, maxRounds - round + 1); // +1 because we need PEOPLE not matches
    slotsInNextRound = Math.pow(2, maxRounds - round); // Next round slots
    
    console.log(`  Round ${round}: slots=${slotsInStartRound}, nextSlots=${slotsInNextRound}`);
    
    if (totalPeople === slotsInStartRound) {
      startRound = round;
      start2Round = round;
      numStartRound = totalPeople;
      numStart2Round = 0;
      console.log(`  -> Exact match! startRound=${startRound}`);
      break;
    } else if (totalPeople < slotsInStartRound && totalPeople > slotsInNextRound) {
      startRound = round;
      start2Round = round + 1;
      
      // need an even number to fight in the start round
      numStartRound = 2 * (totalPeople - slotsInNextRound);
      numStart2Round = totalPeople - numStartRound;
      
      console.log(`  -> Found range! startRound=${startRound}, start2Round=${start2Round}`);
      console.log(`     numStartRound=${numStartRound}, numStart2Round=${numStart2Round}`);
      break;
      numStart2Round = totalPeople - numStartRound;
      break;
    }
  }

  const placements: BracketPlacement[] = [];
  
  // Place participants
  // People with byes go FIRST (top positions), people competing in startRound go LAST (bottom positions)
  for (let personIndex = 0; personIndex < totalPeople; personIndex++) {
    let thisRound: number;
    let thisPosition: number;
    
    if (personIndex < numStart2Round) {
      // These people get byes to the second round - they go at the TOP
      thisRound = start2Round;
      thisPosition = personIndex;
    } else {
      // These people compete in the first round - they go at the BOTTOM
      thisRound = startRound;
      const slotsInStartRound = Math.pow(2, maxRounds - startRound + 1);
      // Position them at the BOTTOM of the bracket
      thisPosition = (personIndex - numStart2Round) + (slotsInStartRound - numStartRound);
    }

    placements.push({
      round: thisRound,
      position: thisPosition,
      participantId: participants[personIndex].id,
      matchNumber: 0
    });
    
    console.log(`Placement ${personIndex}: ${participants[personIndex].firstName} at round=${thisRound}, pos=${thisPosition}`);
  }

  // Calculate match count
  let matchCount = 0;
  for (let round = startRound; round < maxRounds; round++) {
    const slotsInThisRound = Math.pow(2, maxRounds - round);
    const startPosition = round === startRound ? slotsInThisRound - numStartRound : 0;
    matchCount += (slotsInThisRound - startPosition) / 2;
  }

  return { placements, startRound, start2Round, numStartRound, numStart2Round, matchCount };
}

function generate16PersonBracket(participants: Participant[]): Match[] {
  const maxRounds = 4; // For up to 16 people
  
  const { placements, startRound } = calculateBracketPlacements(participants, maxRounds);
  
  // First, create all matches without numbers
  const allMatches: Match[] = [];
  
  // Round 1 (8 matches) - ALWAYS create all 8
  for (let i = 0; i < 8; i++) {
    const pos1 = i * 2;
    const pos2 = i * 2 + 1;
    const p1 = placements.find(p => p.round === 1 && p.position === pos1);
    const p2 = placements.find(p => p.round === 1 && p.position === pos2);
    
    allMatches.push({
      number: 0, // Will be set later
      round: 1,
      position: i * 2,
      participant1: p1?.participantId,
      participant2: p2?.participantId,
      nextMatch: 0, // Will be set later
    });
  }

  // Round 2 (4 matches) - ALWAYS create all 4
  for (let i = 0; i < 4; i++) {
    const pos1 = i * 2;
    const pos2 = i * 2 + 1;
    const p1 = placements.find(p => p.round === 2 && p.position === pos1);
    const p2 = placements.find(p => p.round === 2 && p.position === pos2);
    
    allMatches.push({
      number: 0,
      round: 2,
      position: i * 2,
      participant1: p1?.participantId,
      participant2: p2?.participantId,
      nextMatch: 0,
    });
  }

  // Round 3 (2 matches) - ALWAYS create both
  for (let i = 0; i < 2; i++) {
    const pos1 = i * 2;
    const pos2 = i * 2 + 1;
    const p1 = placements.find(p => p.round === 3 && p.position === pos1);
    const p2 = placements.find(p => p.round === 3 && p.position === pos2);
    
    allMatches.push({
      number: 0,
      round: 3,
      position: i * 2,
      participant1: p1?.participantId,
      participant2: p2?.participantId,
      nextMatch: 0,
    });
  }

  // Finals
  allMatches.push({
    number: 0,
    round: 4,
    position: 0,
  });

  // Third place match
  allMatches.push({
    number: 0,
    round: 4,
    position: 1,
  });

  // Now assign match numbers: top to bottom in each round, but 3rd place before finals
  let matchNumber = 1;
  let hasStartedNumbering = false;
  
  // Number matches in rounds 1-3 (top to bottom)
  for (let round = 1; round <= 3; round++) {
    const roundMatches = allMatches.filter(m => m.round === round);
    roundMatches.forEach(match => {
      // Start numbering when we hit the first match with participants
      if (!hasStartedNumbering && (match.participant1 || match.participant2)) {
        hasStartedNumbering = true;
      }
      
      // Once we've started, number everything from that point on
      if (hasStartedNumbering) {
        match.number = matchNumber++;
      }
    });
  }
  
  // Third place match (round 4, position 1)
  const thirdPlaceMatch = allMatches.find(m => m.round === 4 && m.position === 1);
  if (thirdPlaceMatch) {
    thirdPlaceMatch.number = matchNumber++;
  }
  
  // Finals (round 4, position 0)
  const finalsMatch = allMatches.find(m => m.round === 4 && m.position === 0);
  if (finalsMatch) {
    finalsMatch.number = matchNumber++;
  }
  
  // Set nextMatch references
  // Round 1 -> Round 2
  for (let i = 0; i < 8; i++) {
    const match = allMatches[i];
    const nextMatchIndex = 8 + Math.floor(i / 2);
    match.nextMatch = allMatches[nextMatchIndex].number || undefined;
  }
  
  // Round 2 -> Round 3
  for (let i = 8; i < 12; i++) {
    const match = allMatches[i];
    const nextMatchIndex = 12 + Math.floor((i - 8) / 2);
    match.nextMatch = allMatches[nextMatchIndex].number || undefined;
  }
  
  // Round 3 -> Finals
  for (let i = 12; i < 14; i++) {
    allMatches[i].nextMatch = finalsMatch?.number || undefined;
  }

  return allMatches;
}

function drawBracket(
  doc: jsPDF,
  matches: Match[],
  participants: Participant[],
  watermark?: string
) {
  const startX = 0.5; // Moved left from 0.6
  const startY = 1.0;
  const matchHeight = 0.55; // Reduced from 0.6
  const roundSpacing = 1.8; // Reduced from 2.0 to fit placement lines
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const colorShades = [
    [240, 248, 255], // Round 1
    [200, 220, 240], // Round 2
    [160, 190, 220], // Round 3
    [120, 160, 200], // Round 4/Finals
  ];

  // Round 1 (8 matches)
  let y = startY;
  for (let i = 0; i < 8; i++) {
    const match = matches[i];
    const x = startX;
    
    drawMatch(doc, x, y, match, participants, colorShades[0]);
    y += matchHeight * 2;
  }

  // Round 2 (4 matches) - centered between Round 1 matches
  y = startY + matchHeight; // Start one matchHeight down to center
  for (let i = 8; i < 12; i++) {
    const match = matches[i];
    const x = startX + roundSpacing;
    
    drawMatch(doc, x, y, match, participants, colorShades[1]);
    
    // Draw lines connecting from previous round
    const prevY1 = startY + (i - 8) * 4 * matchHeight + matchHeight / 2;
    const prevY2 = prevY1 + 2 * matchHeight;
    doc.line(startX + 1.6, prevY1, x, y + 0.24);
    doc.line(startX + 1.6, prevY2, x, y + 0.24);
    
    y += matchHeight * 4;
  }

  // Round 3 (2 matches) - centered between Round 2 matches
  y = startY + matchHeight * 3; // Start three matchHeights down to center
  for (let i = 12; i < 14; i++) {
    const match = matches[i];
    const x = startX + roundSpacing * 2;
    
    drawMatch(doc, x, y, match, participants, colorShades[2]);
    
    // Draw connecting lines
    const prevY1 = startY + matchHeight + (i - 12) * 8 * matchHeight + matchHeight / 2;
    const prevY2 = prevY1 + 4 * matchHeight;
    doc.line(startX + roundSpacing + 1.6, prevY1, x, y + 0.24);
    doc.line(startX + roundSpacing + 1.6, prevY2, x, y + 0.24);
    
    y += matchHeight * 8;
  }

  // Finals - centered between semifinals
  const finalsMatch = matches[14];
  const finalsX = startX + roundSpacing * 3;
  const finalsY = startY + matchHeight * 7; // Centered between the two semifinals
  drawMatch(doc, finalsX, finalsY, finalsMatch, participants, colorShades[3]);
  
  // Draw lines to finals
  const semi1Y = startY + matchHeight * 3 + 0.24;
  const semi2Y = startY + matchHeight * 11 + 0.24;
  doc.line(startX + roundSpacing * 2 + 1.6, semi1Y, finalsX, finalsY + 0.24);
  doc.line(startX + roundSpacing * 2 + 1.6, semi2Y, finalsX, finalsY + 0.24);

  // Winner line for championship
  doc.setLineWidth(0.008);
  doc.line(finalsX + 1.6, finalsY + 0.24, finalsX + 2.2, finalsY + 0.24);
  doc.setFontSize(7);
  doc.text('1st Place', finalsX + 1.7, finalsY + 0.42);

  // Third place match - moved to lower right, horizontally aligned with finals
  const thirdPlaceMatch = matches[15];
  const thirdX = finalsX; // Same X position as finals (horizontally aligned)
  const thirdY = startY + matchHeight * 13; // Moved down to lower right where there's more space
  drawMatch(doc, thirdX, thirdY, thirdPlaceMatch, participants, colorShades[2]);
  doc.setFontSize(7);
  doc.text('3rd Place Match', thirdX - 0.6, thirdY - 0.08);
  
  // Winner line for 3rd place
  doc.setLineWidth(0.008);
  doc.line(thirdX + 1.6, thirdY + 0.24, thirdX + 2.2, thirdY + 0.24);
  doc.text('3rd Place', thirdX + 1.7, thirdY + 0.42);
}

function drawMatch(
  doc: jsPDF,
  x: number,
  y: number,
  match: Match,
  participants: Participant[],
  bgColor: number[]
) {
  const width = 1.6; // 1.6" wide
  const height = 0.48; // 0.48" tall

  // Draw background with 50% transparency
  doc.saveGraphicsState();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.5 }));
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, width, height, 'F');
  doc.restoreGraphicsState();

  // Draw border
  doc.setDrawColor(0);
  doc.setLineWidth(0.01);
  doc.rect(x, y, width, height);

  const p1 = match.participant1
    ? participants.find((p) => p.id === match.participant1)
    : null;
  const p2 = match.participant2
    ? participants.find((p) => p.id === match.participant2)
    : null;

  // Top participant (smaller font)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (p1) {
    const name = `${p1.firstName} ${p1.lastName}`;
    doc.text(name, x + 0.05, y + 0.12);
  }

  // Match number in center (larger, bold)
  if (match.number > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Match #${match.number}`, x + width / 2, y + height / 2 + 0.03, { align: 'center' });
  }

  // Bottom participant (smaller font)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (p2) {
    const name = `${p2.firstName} ${p2.lastName}`;
    doc.text(name, x + 0.05, y + height - 0.05);
  }

  // Winner line
  doc.setLineWidth(0.008);
  doc.line(x + width - 0.4, y + height / 2, x + width, y + height / 2);
}
