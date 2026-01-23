import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';
import { getPhysicalRingId, getFullyQualifiedRingName, formatPdfTimestamp, formatPoolNameForDisplay } from '../ringNameFormatter';
import { checkSparringAltRingStatus } from '../ringOrdering';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';

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
  physicalRingMappings?: { categoryPoolName: string; physicalRingName: string }[],
  masterPdf?: jsPDF,
  titleOverride?: string,
  isCustomRing?: boolean
): jsPDF {
  const doc = masterPdf || new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });
  
  // When using masterPdf, we need to track pages carefully
  // jsPDF starts with 1 blank page
  const startingPageCount = doc.getNumberOfPages();

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

  divisionRings.forEach((ring, index) => {
    // Add a new page for each ring, except:
    // - If this is the very first ring (index 0) AND we're on the initial blank page (startingPageCount === 1)
    if (index > 0 || startingPageCount > 1) {
      doc.addPage();
    }

    // Track if this is the first alt ring bracket for this specific ring (for alt A/B splits)
    let isFirstBracketForRing = true;

    // Get all participants for this ring first
    const allRingParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));

    // Check for alt ring status
    const pool = ring.name?.split('_').pop(); // Get the pool part like "P1", "P2" etc.
    console.log('[sparringBracket] Ring:', ring.name, 'pool:', pool);
    const altStatus = pool 
      ? checkSparringAltRingStatus(participants, ring.categoryId, pool)
      : { status: 'none' as const, countA: 0, countB: 0, countEmpty: allRingParticipants.length };
    
    // If no participants, skip bracket generation (blank sheet not supported for sparring)
    // Note: We continue even with 0 participants to generate a blank bracket
    // The bracket will show empty match slots that can be filled in manually
    console.log('[sparringBracket] altStatus:', altStatus);

    // Function to generate a bracket for a set of participants with a specific alt ring label
    const generateBracketForAltRing = (ringParticipants: Participant[], altRingLabel: string = '') => {
      // For alt ring splits (A/B), the second bracket needs a new page
      if (!isFirstBracketForRing) {
        doc.addPage();
      }
      isFirstBracketForRing = false;

      // Get physical ring ID from mapping using the pool name
      const physicalRingId = ring.name && physicalRingMappings 
        ? getPhysicalRingId(ring.name, physicalRingMappings)
        : null;
      
      // For custom rings (Grand Champion), use division name directly
      // Otherwise, get fully qualified ring name with physical ring info
      const fullyQualifiedRingName = isCustomRing
        ? division
        : getFullyQualifiedRingName(division, physicalRingId, physicalRings);
      const titleWithAlt = altRingLabel ? `${fullyQualifiedRingName} ${altRingLabel}` : fullyQualifiedRingName;
      
      // Get ring color for title styling
      let ringColor = '';
      if (physicalRingId) {
        ringColor = getRingColorFromName(physicalRingId) || '';
      }

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

      // Title with colored background using ring color
      const titleText = titleOverride ? titleOverride : `${titleWithAlt} Sparring Bracket`;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      
      if (ringColor) {
        const bgColor = hexToRgb(ringColor);
        const fgColor = getForegroundColor(ringColor);
        const fgRgb = hexToRgb(fgColor);
        const titleWidth = doc.getTextWidth(titleText);
        
        // Draw colored background rectangle
        doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
        doc.rect(margin - 0.05, margin + 0.1, titleWidth + 0.1, 0.3, 'F');
        
        // Set text color based on background
        doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
      }
      
      doc.text(titleText, margin, margin + 0.3);
      doc.setTextColor(0); // Reset to black
      
      // Category ring name subtitle - moved lower to avoid overlapping title background
      if (ring.name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatPoolNameForDisplay(ring.name)}${altRingLabel}`, margin, margin + 0.8);
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

      // Final places table - upper right corner
      let x = pageWidth - 2.5; // 2.5" from right edge
      let y = margin + 0.8; // Moved down 0.3" for more space
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Final Places:', x, y);
      
      y += 0.5; // Increased spacing to 0.5" below heading
      doc.setFontSize(10);
      const finalPlaces = ['1st Place:', '2nd Place:', '3rd Place:'];
      const textStartX = x - 1.5; // Move text 1.5" to the left (additional 0.5")
      const lineStartX = textStartX + 1.0; // Line starts closer to text
      finalPlaces.forEach((place) => {
        doc.text(place, textStartX, y);
        doc.setLineWidth(0.01);
        doc.line(lineStartX, y, textStartX + 3.2, y); // Line shortened - extends 3.2" from start
        y += 0.4; // Increased spacing between items
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
  matchCount: number;
} {
  const totalPeople = participants.length;
  
  console.log(`Calculating placements for ${totalPeople} people, maxRounds=${maxRounds}`);

  // If there are no participants, return an empty placement set
  // but still compute the matchCount for a full blank bracket visual.
  if (totalPeople === 0) {
    const startRound = 1;
    let matchCount = 0;
    for (let round = startRound; round <= maxRounds; round++) {
      const matchesInRound = Math.pow(2, maxRounds - round);
      matchCount += matchesInRound;
    }
    // Add 3rd place match
    matchCount += 1;
    return { placements: [], startRound, matchCount };
  }

  // Determine starting round based on participant count
  // Round 1 = 16 slots (8 matches), Round 2 = 8 slots (4 matches), 
  // Round 3 = 4 slots (2 matches), Round 4 = 2 slots (1 match)
  // Find the round where: slotsInRound/2 < totalPeople <= slotsInRound
  let startRound = 1;
  for (let round = 1; round <= maxRounds; round++) {
    const slotsInRound = Math.pow(2, maxRounds - round + 1);
    const slotsInPrevRound = slotsInRound * 2;
    if (totalPeople > slotsInRound / 2 && totalPeople <= slotsInRound) {
      startRound = round;
      break;
    }
  }
  
  const slotsInStartRound = Math.pow(2, maxRounds - startRound + 1);
  const slotsInNextRound = Math.pow(2, maxRounds - startRound);
  
  // Calculate how many compete in start round vs get byes
  // numCompeting compete in startRound, numWithByes get byes to nextRound
  // numCompeting winners + numWithByes must equal slotsInNextRound
  const numCompeting = 2 * (totalPeople - slotsInNextRound);
  const numWithByes = totalPeople - numCompeting;
  
  console.log(`  StartRound=${startRound}, slots=${slotsInStartRound}`);
  console.log(`  Competing in start round: ${numCompeting}, Getting byes: ${numWithByes}`);

  const placements: BracketPlacement[] = [];
  
  // First p(2) participants (top-ranked) get byes to next round, filling from TOP
  for (let i = 0; i < numWithByes; i++) {
    placements.push({
      round: startRound + 1,
      position: i,
      participantId: participants[i].id,
      matchNumber: 0
    });
    console.log(`  Placement ${i}: ${participants[i].firstName} at round=${startRound + 1}, pos=${i} (bye)`);
  }
  
  // Last p(1) participants (lower-ranked) compete in start round, filling from BOTTOM up
  for (let i = numWithByes; i < totalPeople; i++) {
    const position = slotsInStartRound - numCompeting + (i - numWithByes);
    placements.push({
      round: startRound,
      position: position,
      participantId: participants[i].id,
      matchNumber: 0
    });
    console.log(`  Placement ${i}: ${participants[i].firstName} at round=${startRound}, pos=${position} (competing)`);
  }

  // Calculate total match count
  let matchCount = 0;
  for (let round = startRound; round <= maxRounds; round++) {
    const matchesInRound = Math.pow(2, maxRounds - round);
    matchCount += matchesInRound;
  }
  // Add 3rd place match
  matchCount += 1;

  return { placements, startRound, matchCount };
}

function generate16PersonBracket(participants: Participant[]): Match[] {
  const maxRounds = 4; // For up to 16 people
  
  const { placements, startRound } = calculateBracketPlacements(participants, maxRounds);
  
  console.log(`generate16PersonBracket: ${participants.length} participants, startRound=${startRound}`);
  
  // Create all matches - always create full bracket structure for visual consistency
  const allMatches: Match[] = [];
  
  // Helper to get participants for a specific position in a specific round
  const getParticipantsForMatch = (round: number, matchIndex: number): [string | undefined, string | undefined] => {
    const position1 = matchIndex * 2;
    const position2 = matchIndex * 2 + 1;
    
    const p1 = placements.find(p => p.round === round && p.position === position1);
    const p2 = placements.find(p => p.round === round && p.position === position2);
    
    return [p1?.participantId, p2?.participantId];
  };
  
  // Round 1 - 8 matches (positions 0-15)
  console.log('Creating Round 1 matches');
  for (let i = 0; i < 8; i++) {
    const [p1, p2] = getParticipantsForMatch(1, i);
    allMatches.push({
      number: 0, // Will be assigned later
      round: 1,
      position: i * 2,
      participant1: p1,
      participant2: p2,
      nextMatch: 0,
    });
  }

  // Round 2 - 4 matches (positions 0-7)
  console.log('Creating Round 2 matches');
  for (let i = 0; i < 4; i++) {
    const [p1, p2] = getParticipantsForMatch(2, i);
    allMatches.push({
      number: 0,
      round: 2,
      position: i * 2,
      participant1: p1,
      participant2: p2,
      nextMatch: 0,
    });
  }

  // Round 3 - 2 matches (positions 0-3)
  console.log('Creating Round 3 matches');
  for (let i = 0; i < 2; i++) {
    const [p1, p2] = getParticipantsForMatch(3, i);
    allMatches.push({
      number: 0,
      round: 3,
      position: i * 2,
      participant1: p1,
      participant2: p2,
      nextMatch: 0,
    });
  }

  // Finals - 1 match (positions 0-1)
  const [f1, f2] = getParticipantsForMatch(4, 0);
  allMatches.push({
    number: 0,
    round: 4,
    position: 0,
    participant1: f1,
    participant2: f2,
  });

  // Third place match - 1 match (positions 2-3)
  const [t1, t2] = getParticipantsForMatch(4, 1);
  allMatches.push({
    number: 0,
    round: 4,
    position: 1,
    participant1: t1,
    participant2: t2,
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
  
  // Set nextMatch references - only for matches that actually exist
  // Round 1 -> Round 2
  const round1Matches = allMatches.filter(m => m.round === 1);
  const round2Matches = allMatches.filter(m => m.round === 2);
  round1Matches.forEach((match, index) => {
    const nextMatchIndex = Math.floor(index / 2);
    if (round2Matches[nextMatchIndex]) {
      match.nextMatch = round2Matches[nextMatchIndex].number || undefined;
    }
  });
  
  // Round 2 -> Round 3
  const round3Matches = allMatches.filter(m => m.round === 3);
  round2Matches.forEach((match, index) => {
    const nextMatchIndex = Math.floor(index / 2);
    if (round3Matches[nextMatchIndex]) {
      match.nextMatch = round3Matches[nextMatchIndex].number || undefined;
    }
  });
  
  // Round 3 -> Finals
  if (finalsMatch) {
    round3Matches.forEach((match) => {
      match.nextMatch = finalsMatch.number || undefined;
    });
  }

  return allMatches;
}

function drawBracket(
  doc: jsPDF,
  matches: Match[],
  participants: Participant[],
  watermark?: string
) {
  const pageWidth = 8.5; // Letter width in inches
  const startX = 0.5;
  const startY = 2.0; // Moved down 0.5" for more spacing at top
  const roundSpacing = 1.69; // 1.44" box + 0.25" gap (maximize space, 1st place line reaches right margin)
  const matchWidth = 1.44; // 1.44 inches per box (expanded to fill page width)
  
  // Progressive heights for each round - 1.5x increase each round
  const baseHeight = 0.4;
  const matchHeights = [
    baseHeight,            // Round 1: 0.4"
    baseHeight * 1.5,      // Round 2: 0.6"
    baseHeight * 1.5 * 1.5, // Round 3: 0.9"
    baseHeight * 1.5 * 1.5 * 1.5, // Finals: 1.35"
  ];
  const baseMatchHeight = 0.55; // Base height for spacing calculations
  
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
    
    drawMatch(doc, x, y, match, participants, colorShades[0], matchWidth, matchHeights[0]);
    y += baseMatchHeight * 2;
  }

  // Round 2 (4 matches) - centered between Round 1 matches
  y = startY + baseMatchHeight; // Start one matchHeight down to center
  for (let i = 8; i < 12; i++) {
    const match = matches[i];
    const x = startX + roundSpacing;
    
    drawMatch(doc, x, y, match, participants, colorShades[1], matchWidth, matchHeights[1]);
    
    // Draw curved bracket connecting from previous round
    const prevY1 = startY + (i - 8) * 4 * baseMatchHeight + matchHeights[0] / 2;
    const prevY2 = prevY1 + 2 * baseMatchHeight;
    const targetY = y + matchHeights[1] / 2;
    const curveStartX = startX + matchWidth;
    const curveEndX = x;
    
    // Top bracket arm (angled bracket connector)
    const midX = (curveStartX + curveEndX) / 2;
    doc.line(curveStartX, prevY1, midX, prevY1);
    doc.line(midX, prevY1, midX, targetY);
    doc.line(midX, targetY, curveEndX, targetY);
    
    // Bottom bracket arm (angled bracket connector)
    doc.line(curveStartX, prevY2, midX, prevY2);
    doc.line(midX, prevY2, midX, targetY);
    doc.line(midX, targetY, curveEndX, targetY);
    
    y += baseMatchHeight * 4;
  }

  // Round 3 (2 matches) - centered between Round 2 matches
  y = startY + baseMatchHeight * 3; // Start three matchHeights down to center
  for (let i = 12; i < 14; i++) {
    const match = matches[i];
    const x = startX + roundSpacing * 2;
    
    drawMatch(doc, x, y, match, participants, colorShades[2], matchWidth, matchHeights[2]);
    
    // Draw curved bracket connecting from previous round
    const prevY1 = startY + baseMatchHeight + (i - 12) * 8 * baseMatchHeight + matchHeights[1] / 2;
    const prevY2 = prevY1 + 4 * baseMatchHeight;
    const targetY = y + matchHeights[2] / 2;
    const curveStartX = startX + roundSpacing + matchWidth;
    const curveEndX = x;
    
    // Top bracket arm (angled bracket connector)
    const midX = (curveStartX + curveEndX) / 2;
    doc.line(curveStartX, prevY1, midX, prevY1);
    doc.line(midX, prevY1, midX, targetY);
    doc.line(midX, targetY, curveEndX, targetY);
    
    // Bottom bracket arm (angled bracket connector)
    doc.line(curveStartX, prevY2, midX, prevY2);
    doc.line(midX, prevY2, midX, targetY);
    doc.line(midX, targetY, curveEndX, targetY);
    
    y += baseMatchHeight * 8;
  }

  // Finals - centered between semifinals
  const finalsMatch = matches[14];
  const finalsX = startX + roundSpacing * 3;
  const finalsY = startY + baseMatchHeight * 7; // Centered between the two semifinals
  drawMatch(doc, finalsX, finalsY, finalsMatch, participants, colorShades[3], matchWidth, matchHeights[3]);
  
  // Draw curved brackets to finals
  const semi1Y = startY + baseMatchHeight * 3 + matchHeights[2] / 2;
  const semi2Y = startY + baseMatchHeight * 11 + matchHeights[2] / 2;
  const targetY = finalsY + matchHeights[3] / 2;
  const curveStartX = startX + roundSpacing * 2 + matchWidth;
  const curveEndX = finalsX;
  
  // Top semifinal bracket (angled bracket)
  const finalsMidX = (curveStartX + curveEndX) / 2;
  doc.line(curveStartX, semi1Y, finalsMidX, semi1Y);
  doc.line(finalsMidX, semi1Y, finalsMidX, targetY);
  doc.line(finalsMidX, targetY, curveEndX, targetY);
  
  // Bottom semifinal bracket (angled bracket)
  doc.line(curveStartX, semi2Y, finalsMidX, semi2Y);
  doc.line(finalsMidX, semi2Y, finalsMidX, targetY);
  doc.line(finalsMidX, targetY, curveEndX, targetY);

  // Winner line for championship - extend rightward from box
  doc.setLineWidth(0.008);
  const placementLineEndX = finalsX + matchWidth; // End of box
  doc.line(placementLineEndX, finalsY + matchHeights[3] / 2, placementLineEndX + 1.0, finalsY + matchHeights[3] / 2);
  doc.setFontSize(10);
  doc.text('1st Place', placementLineEndX + 0.1, finalsY + matchHeights[3] / 2 + 0.2);

  // Third place match - moved to lower right, horizontally aligned with finals
  const thirdPlaceMatch = matches[15];
  const thirdX = finalsX; // Same X position as finals (horizontally aligned)
  const thirdY = startY + baseMatchHeight * 13; // Moved down to lower right where there's more space
  drawMatch(doc, thirdX, thirdY, thirdPlaceMatch, participants, colorShades[2], matchWidth, matchHeights[2]);
  
  // Winner line for 3rd place - extend rightward from box
  doc.setLineWidth(0.008);
  const thirdPlacementLineEndX = thirdX + matchWidth; // End of box
  doc.line(thirdPlacementLineEndX, thirdY + matchHeights[2] / 2, thirdPlacementLineEndX + 1.0, thirdY + matchHeights[2] / 2);
  doc.setFontSize(10);
  doc.text('3rd Place', thirdPlacementLineEndX + 0.1, thirdY + matchHeights[2] / 2 + 0.2);
}

function drawMatch(
  doc: jsPDF,
  x: number,
  y: number,
  match: Match,
  participants: Participant[],
  bgColor: number[],
  matchWidth?: number,
  matchHeight?: number
) {
  const width = matchWidth || 1.6;
  const height = matchHeight || 0.48;

  // Draw background with 50% transparency (shading between top and bottom lines)
  doc.saveGraphicsState();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.5 }));
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, width, height, 'F');
  doc.restoreGraphicsState();

  // Draw only top and bottom lines (no middle line, no side borders)
  doc.setDrawColor(0);
  doc.setLineWidth(0.01);
  doc.line(x, y, x + width, y); // Top line
  doc.line(x, y + height, x + width, y + height); // Bottom line
  doc.line(x + width, y, x + width, y + height); // Right line

  const p1 = match.participant1
    ? participants.find((p) => p.id === match.participant1)
    : null;
  const p2 = match.participant2
    ? participants.find((p) => p.id === match.participant2)
    : null;

  // Top participant - positioned above the top line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (p1) {
    const name = `${p1.firstName} ${p1.lastName}`;
    doc.text(name, x + 0.05, y - 0.02); // Positioned above the top line
  }

  // Match number in center (larger, bold)
  if (match.number > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    // Only show match numbers when we have participants (i.e., not printing a blank bracket)
    if (participants && participants.length > 0) {
      doc.text(`Match #${match.number}`, x + width / 2, y + height / 2 + 0.03, { align: 'center' });
    }
  }

  // Bottom participant - positioned on top of the bottom line (just above it)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (p2) {
    const name = `${p2.firstName} ${p2.lastName}`;
    doc.text(name, x + 0.05, y + height - 0.05);
  }

  // Winner line extending from middle right edge (not from inside the box)
  // This line connects to the next round's match in drawBracket function
  // Removed as the connector lines are drawn in drawBracket
}
