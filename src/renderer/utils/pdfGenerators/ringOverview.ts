import jsPDF from 'jspdf';
import { formatPdfTimestamp } from '../ringNameFormatter';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';
import { getSchoolAbbreviation } from '../schoolAbbreviations';

interface RingPair {
  categoryPoolName: string;
  division: string;
  physicalRingName?: string;
  formsRing?: any;
  sparringRing?: any;
}

// Helper function to draw a simple table
function drawTable(
  doc: jsPDF,
  startX: number,
  startY: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  maxWidth: number
): number {
  const rowHeight = 16; // Increased from 15 for better spacing
  const cellPadding = 3;
  let y = startY;

  // Draw header with more room
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, y, maxWidth, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header, x + cellPadding, y + 10);
    x += columnWidths[i];
  });
  
  y += rowHeight;

  // Draw rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, y, maxWidth, rowHeight, 'F');
    }
    
    x = startX;
    row.forEach((cell, i) => {
      doc.text(cell, x + cellPadding, y + 10);
      x += columnWidths[i];
    });
    
    y += rowHeight;
  });

  // Draw border
  doc.setDrawColor(200, 200, 200);
  doc.rect(startX, startY, maxWidth, y - startY);
  
  return y;
}

// Helper function to add timestamp footer
function addFooter(doc: jsPDF, timestamp: string, pageWidth: number, pageHeight: number) {
  const margin = 10; // Standard margin in mm
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128); // Gray text
  doc.text(timestamp, margin + 50, pageHeight - 5);
  doc.setTextColor(0, 0, 0); // Reset to black
}

export function generateRingOverviewPDF(
  participants: any[],
  ringPairs: RingPair[],
  categories: any[],
  selectedDivision: string = 'all',
  schoolAbbreviations?: { [schoolName: string]: string }
) {
  const doc = new jsPDF('portrait', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const timestamp = formatPdfTimestamp();

  // Filter ring pairs by division if specified
  const filteredRingPairs = selectedDivision === 'all' 
    ? ringPairs 
    : ringPairs.filter(pair => pair.division === selectedDivision);

  // Group rings by division
  const ringsByDivision = new Map<string, RingPair[]>();
  filteredRingPairs.forEach(pair => {
    if (!ringsByDivision.has(pair.division)) {
      ringsByDivision.set(pair.division, []);
    }
    ringsByDivision.get(pair.division)!.push(pair);
  });

  const divisions = Array.from(ringsByDivision.keys()).sort();
  let isFirstPage = true;

  divisions.forEach((division, divIndex) => {
    const divisionRings = ringsByDivision.get(division)!;
    
    // Sort by category name first (with age-aware sorting), then by pool number
    const sortedDivisionRings = [...divisionRings].sort((a, b) => {
      // Extract category name from "Division - CategoryName Pool N"
      const extractCategory = (name: string) => {
        const match = name.match(/^.+?\s*-\s*(.+?)\s+Pool\s+\d+/i);
        return match ? match[1] : name;
      };
      
      // Extract starting age from category for numeric sorting
      const extractStartingAge = (categoryName: string): number => {
        // Match patterns like "8-9", "12-13", "18+", "8", etc.
        const ageMatch = categoryName.match(/\b(\d+)(?:-\d+|\+)?\b/);
        if (ageMatch) {
          const age = parseInt(ageMatch[1]);
          // If it's "18+", treat as 18 but add small offset to sort after "18-19" if exists
          if (categoryName.includes('+')) {
            return age + 0.5;
          }
          return age;
        }
        // Non-numeric categories (like "Adult") go last
        return 999;
      };
      
      const aCat = extractCategory(a.categoryPoolName);
      const bCat = extractCategory(b.categoryPoolName);
      
      // Sort by category first (age-aware)
      if (aCat !== bCat) {
        const aAge = extractStartingAge(aCat);
        const bAge = extractStartingAge(bCat);
        
        // Sort by starting age numerically
        if (aAge !== bAge) {
          return aAge - bAge;
        }
        
        // If ages are the same, use alphabetical as fallback
        return aCat.localeCompare(bCat);
      }
      
      // Then sort by pool number
      const aPoolMatch = a.categoryPoolName.match(/Pool\s+(\d+)/i);
      const bPoolMatch = b.categoryPoolName.match(/Pool\s+(\d+)/i);
      const aPool = aPoolMatch ? parseInt(aPoolMatch[1]) : 999;
      const bPool = bPoolMatch ? parseInt(bPoolMatch[1]) : 999;
      return aPool - bPool;
    });
    
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    let yPos = margin;

    // Title
    if (selectedDivision === 'all') {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Ring Overview - All Divisions', pageWidth / 2, yPos, { align: 'center' });
      yPos += 30;
    }

    // Division Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 123, 255); // Blue color
    doc.text(division, margin, yPos);
    yPos += 5;
    
    // Underline
    doc.setDrawColor(0, 123, 255);
    doc.setLineWidth(2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 20;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // ========== RING LIST FIRST ==========
    // Build a list of rows: each row is a ring + category/pool + counts
    interface RingListRow {
      physicalRingName: string;
      categoryPool: string;
      formsCount: number;
      sparringCount: number;
      ringNum: number;
      suffix: string;
    }
    
    const ringListRows: RingListRow[] = [];
    
    // Parse ring number and suffix for grouping
    const parseRing = (name: string) => {
      const match = name.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
      if (match) {
        return {
          num: parseInt(match[1]),
          suffix: match[2]?.toLowerCase() || ''
        };
      }
      return { num: 999, suffix: '' };
    };
    
    sortedDivisionRings.forEach(pair => {
      if (pair.physicalRingName) {
        // Extract category and pool from categoryPoolName
        const extractCategoryPool = (name: string) => {
          const match = name.match(/^.+?\s*-\s*(.+?)\s+(Pool\s+\d+)/i);
          if (match) {
            return `${match[1]} ${match[2]}`;
          }
          return name;
        };
        
        const catPool = extractCategoryPool(pair.categoryPoolName);
        const parsed = parseRing(pair.physicalRingName);
        
        ringListRows.push({
          physicalRingName: pair.physicalRingName,
          categoryPool: catPool,
          formsCount: pair.formsRing ? pair.formsRing.participantIds.length : 0,
          sparringCount: pair.sparringRing ? pair.sparringRing.participantIds.length : 0,
          ringNum: parsed.num,
          suffix: parsed.suffix
        });
      }
    });
    
    if (ringListRows.length > 0) {
      // Ring List Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 123, 255);
      doc.text('Ring List', margin, yPos);
      yPos += 5;
      doc.setDrawColor(0, 123, 255);
      doc.setLineWidth(2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 20;
      doc.setTextColor(0, 0, 0);
      
      // Check if any ring has a suffix
      const hasAnySuffix = ringListRows.some(row => row.suffix !== '');
      
      // If there are suffixed rings, treat no-suffix rings as 'a'
      if (hasAnySuffix) {
        ringListRows.forEach(row => {
          if (row.suffix === '') {
            row.suffix = 'a';
          }
        });
      }
      
      // Group by ring number and suffix
      const ringGroups = new Map<number, { a?: RingListRow[], b?: RingListRow[] }>();
      
      ringListRows.forEach(row => {
        if (!ringGroups.has(row.ringNum)) {
          ringGroups.set(row.ringNum, {});
        }
        const group = ringGroups.get(row.ringNum)!;
        
        if (row.suffix === 'a' || row.suffix === '') {
          if (!group.a) group.a = [];
          group.a.push(row);
        } else if (row.suffix === 'b') {
          if (!group.b) group.b = [];
          group.b.push(row);
        }
      });
      
      // Sort ring numbers
      const sortedRingNums = Array.from(ringGroups.keys()).sort((a, b) => a - b);
      
      // Define column positions for 2-column layout
      const leftColumnStart = margin + 5;
      const rightColumnStart = pageWidth / 2 + 5;
      
      // Main column headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Ring \'a\'', leftColumnStart, yPos);
      doc.text('Ring \'b\'', rightColumnStart, yPos);
      yPos += 8;
      
      // Sub-headers for left column (Ring 'a')
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const leftRingCol = leftColumnStart;
      const leftCategoryCol = leftRingCol + 40;
      const leftFormsCol = leftCategoryCol + 110;
      const leftSparringCol = leftFormsCol + 35;
      
      doc.setTextColor(100, 100, 100);
      doc.text('Ring', leftRingCol, yPos);
      doc.text('Category / Pool', leftCategoryCol, yPos);
      doc.setTextColor(0, 123, 255);
      doc.text('Frms', leftFormsCol, yPos);
      doc.setTextColor(220, 53, 69);
      doc.text('Spar', leftSparringCol, yPos);
      
      // Sub-headers for right column (Ring 'b')
      const rightRingCol = rightColumnStart;
      const rightCategoryCol = rightRingCol + 40;
      const rightFormsCol = rightCategoryCol + 110;
      const rightSparringCol = rightFormsCol + 35;
      
      doc.setTextColor(100, 100, 100);
      doc.text('Ring', rightRingCol, yPos);
      doc.text('Category / Pool', rightCategoryCol, yPos);
      doc.setTextColor(0, 123, 255);
      doc.text('Frms', rightFormsCol, yPos);
      doc.setTextColor(220, 53, 69);
      doc.text('Spar', rightSparringCol, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
      
      // For each ring number, render a and b side by side
      sortedRingNums.forEach(ringNum => {
        const group = ringGroups.get(ringNum)!;
        
        // Determine max rows needed for this ring number
        const aRows = group.a || [];
        const bRows = group.b || [];
        const maxRows = Math.max(aRows.length, bRows.length);
        
        // Render each row (a side and b side)
        for (let i = 0; i < maxRows; i++) {
          const rowA = aRows[i];
          const rowB = bRows[i];
          
          // Render Ring 'a' (left column)
          if (rowA) {
            const ringCol = leftColumnStart;
            const categoryCol = ringCol + 40;
            const formsCol = categoryCol + 110;
            const sparringCol = formsCol + 35;
            
            doc.setFontSize(8);
            
            // Ring name with color background
            doc.setFont('helvetica', 'bold');
            const ringLabel = `Ring ${ringNum}`;
            const ringColor = getRingColorFromName(rowA.physicalRingName);
            const ringTextWidth = doc.getTextWidth(ringLabel);
            
            if (ringColor) {
              const bgColor = hexToRgb(ringColor);
              const fgColor = getForegroundColor(ringColor);
              const fgRgb = hexToRgb(fgColor);
              
              // Draw colored background for ring name
              doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
              doc.rect(ringCol - 2, yPos - 6, ringTextWidth + 4, 9, 'F');
              doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
            }
            
            doc.text(ringLabel, ringCol, yPos);
            doc.setTextColor(0, 0, 0);
            
            // Category/Pool
            doc.setFont('helvetica', 'normal');
            doc.text(rowA.categoryPool, categoryCol, yPos);
            
            // Forms count
            doc.setTextColor(0, 123, 255);
            doc.text(String(rowA.formsCount), formsCol, yPos);
            
            // Sparring count
            doc.setTextColor(220, 53, 69);
            doc.text(String(rowA.sparringCount), sparringCol, yPos);
            doc.setTextColor(0, 0, 0);
          }
          
          // Render Ring 'b' (right column)
          if (rowB) {
            const ringCol = rightColumnStart;
            const categoryCol = ringCol + 40;
            const formsCol = categoryCol + 110;
            const sparringCol = formsCol + 35;
            
            doc.setFontSize(8);
            
            // Ring name with color background
            doc.setFont('helvetica', 'bold');
            const ringLabel = `Ring ${ringNum}`;
            const ringColor = getRingColorFromName(rowB.physicalRingName);
            const ringTextWidth = doc.getTextWidth(ringLabel);
            
            if (ringColor) {
              const bgColor = hexToRgb(ringColor);
              const fgColor = getForegroundColor(ringColor);
              const fgRgb = hexToRgb(fgColor);
              
              // Draw colored background for ring name
              doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
              doc.rect(ringCol - 2, yPos - 6, ringTextWidth + 4, 9, 'F');
              doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
            }
            
            doc.text(ringLabel, ringCol, yPos);
            doc.setTextColor(0, 0, 0);
            
            // Category/Pool
            doc.setFont('helvetica', 'normal');
            doc.text(rowB.categoryPool, categoryCol, yPos);
            
            // Forms count
            doc.setTextColor(0, 123, 255);
            doc.text(String(rowB.formsCount), formsCol, yPos);
            
            // Sparring count
            doc.setTextColor(220, 53, 69);
            doc.text(String(rowB.sparringCount), sparringCol, yPos);
            doc.setTextColor(0, 0, 0);
          }
          
          yPos += 12;
        }
        
        // Add small space between different ring numbers
        yPos += 3;
      });
      
      // Add page break after ring list
      addFooter(doc, timestamp, pageWidth, pageHeight);
      doc.addPage();
      yPos = margin;
      
      // Repeat division header on new page
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 123, 255);
      doc.text(`${division} - Detailed Breakdown`, margin, yPos);
      yPos += 5;
      doc.setDrawColor(0, 123, 255);
      doc.setLineWidth(2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 20;
      doc.setTextColor(0, 0, 0);
    }
    // ======== END RING LIST ========

    // Track current category for page breaks
    let currentCategory = '';
    const extractCategory = (name: string) => {
      const match = name.match(/^.+?\s*-\s*(.+?)\s+Pool\s+\d+/i);
      return match ? match[1] : name;
    };

    sortedDivisionRings.forEach((pair, ringIndex) => {
      const thisCategory = extractCategory(pair.categoryPoolName);
      
      // Start new page when category changes (if not already at top of page)
      if (thisCategory !== currentCategory && currentCategory !== '' && yPos > margin + 50) {
        addFooter(doc, timestamp, pageWidth, pageHeight);
        doc.addPage();
        yPos = margin;
        
        // Repeat division header on new page
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text(`${division} (continued)`, margin, yPos);
        yPos += 5;
        doc.setDrawColor(0, 123, 255);
        doc.setLineWidth(2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 20;
        doc.setTextColor(0, 0, 0);
      }
      
      currentCategory = thisCategory;
      // Check if we need a new page (increased margin for safety)
      if (yPos > pageHeight - 250) {
        addFooter(doc, timestamp, pageWidth, pageHeight);
        doc.addPage();
        yPos = margin;
        
        // Repeat division header on new page
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text(`${division} (continued)`, margin, yPos);
        yPos += 5;
        doc.setDrawColor(0, 123, 255);
        doc.setLineWidth(2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 20;
        doc.setTextColor(0, 0, 0);
      }

      // Check if ring header + some content will fit, if not start new page
      if (yPos > pageHeight - 300) {
        addFooter(doc, timestamp, pageWidth, pageHeight);
        doc.addPage();
        yPos = margin;
        
        // Repeat division header on new page
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text(`${division} (continued)`, margin, yPos);
        yPos += 5;
        doc.setDrawColor(0, 123, 255);
        doc.setLineWidth(2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 20;
        doc.setTextColor(0, 0, 0);
      }

      // Ring Header with colored background if physical ring is assigned
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      let ringHeader = pair.categoryPoolName;
      if (pair.physicalRingName) {
        ringHeader += ` (${pair.physicalRingName})`;
        
        // Apply ring color styling
        const ringColor = getRingColorFromName(pair.physicalRingName);
        if (ringColor) {
          const bgColor = hexToRgb(ringColor);
          const fgColor = getForegroundColor(ringColor);
          const fgRgb = hexToRgb(fgColor);
          const headerWidth = doc.getTextWidth(ringHeader);
          
          // Draw colored background rectangle (centered on text)
          // Using points unit: add small padding around text
          doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
          doc.rect(margin - 2, yPos - 10, headerWidth + 4, 12, 'F');
          
          // Set text color based on background
          doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
        }
      }
      doc.text(ringHeader, margin, yPos);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPos += 15;

      const columnWidth = (pageWidth - 2 * margin - 20) / 2;
      const leftX = margin;
      const rightX = margin + columnWidth + 20;

      // Track the ending positions of both columns
      let formsEndY = yPos;
      let sparringEndY = yPos;

      // Forms Ring (Left Column)
      const formsStartY = yPos;
      if (pair.formsRing) {
        const category = categories.find(c => c.id === pair.formsRing.categoryId);
        const formsParticipants = participants
          .filter(p => pair.formsRing.participantIds.includes(p.id))
          .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text('Forms', leftX, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 15;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        if (category) {
          doc.text(`Category: ${category.gender}, Ages ${category.minAge}-${category.maxAge}`, leftX, yPos);
          yPos += 12;
        }
        doc.text(`Participants: ${formsParticipants.length}`, leftX, yPos);
        yPos += 15;

        // Forms table
        const formsRows = formsParticipants.map(p => {
          const schoolAbbr = getSchoolAbbreviation(p.branch || p.school, schoolAbbreviations);
          return [
            `${p.firstName} ${p.lastName}`,
            schoolAbbr,
            String(p.age),
            p.gender ? p.gender.charAt(0).toUpperCase() : 'U'
          ];
        });

        formsEndY = drawTable(
          doc,
          leftX,
          yPos,
          ['Name', 'School', 'Age', 'Gr'],
          formsRows,
          [columnWidth - 165, 60, 30, 25],
          columnWidth
        );
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text('Forms', leftX, yPos);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        yPos += 15;
        doc.text('No forms ring', leftX, yPos);
        doc.setTextColor(0, 0, 0);
        formsEndY = yPos;
      }

      // Sparring Ring (Right Column)
      yPos = formsStartY;
      if (pair.sparringRing) {
        const category = categories.find(c => c.id === pair.sparringRing.categoryId);
        const sparringParticipants = participants
          .filter(p => pair.sparringRing.participantIds.includes(p.id))
          .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));

        // Check for alt ring splits
        const hasAltA = sparringParticipants.some(p => p.sparringAltRing === 'a');
        const hasAltB = sparringParticipants.some(p => p.sparringAltRing === 'b');
        const isSplit = hasAltA && hasAltB;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69); // Red color
        doc.text('Sparring', rightX, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 15;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        if (category) {
          doc.text(`Category: ${category.gender}, Ages ${category.minAge}-${category.maxAge}`, rightX, yPos);
          yPos += 12;
        }

        if (isSplit) {
          const participantsA = sparringParticipants.filter(p => p.sparringAltRing === 'a');
          const participantsB = sparringParticipants.filter(p => p.sparringAltRing === 'b');
          
          doc.setTextColor(92, 184, 92);
          doc.setFont('helvetica', 'bold');
          doc.text(`Split: ${participantsA.length} in 'a', ${participantsB.length} in 'b'`, rightX, yPos);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          yPos += 15;

          // Alt Ring A
          if (participantsA.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Alt Ring A (${participantsA.length})`, rightX, yPos);
            yPos += 12;

            const rowsA = participantsA.map(p => {
              const schoolAbbr = getSchoolAbbreviation(p.branch || p.school, schoolAbbreviations);
              return [
                `${p.firstName} ${p.lastName}`,
                schoolAbbr,
                String(p.age),
                p.gender ? p.gender.charAt(0).toUpperCase() : 'U',
                `${p.heightFeet}'${p.heightInches}"`
              ];
            });

            yPos = drawTable(
              doc,
              rightX,
              yPos,
              ['Name', 'School', 'Age', 'Gr', 'Ht'],
              rowsA,
              [columnWidth - 165, 55, 30, 25, 55],
              columnWidth
            ) + 10;
          }

          // Alt Ring B
          if (participantsB.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Alt Ring B (${participantsB.length})`, rightX, yPos);
            yPos += 12;

            const rowsB = participantsB.map(p => {
              const schoolAbbr = getSchoolAbbreviation(p.branch || p.school, schoolAbbreviations);
              return [
                `${p.firstName} ${p.lastName}`,
                schoolAbbr,
                String(p.age),
                p.gender ? p.gender.charAt(0).toUpperCase() : 'U',
                `${p.heightFeet}'${p.heightInches}"`
              ];
            });

            sparringEndY = drawTable(
              doc,
              rightX,
              yPos,
              ['Name', 'School', 'Age', 'Gr', 'Ht'],
              rowsB,
              [columnWidth - 165, 55, 30, 25, 55],
              columnWidth
            );
          } else {
            sparringEndY = yPos;
          }
        } else {
          doc.text(`Participants: ${sparringParticipants.length}`, rightX, yPos);
          yPos += 15;

          const sparringRows = sparringParticipants.map(p => {
            const schoolAbbr = getSchoolAbbreviation(p.branch || p.school, schoolAbbreviations);
            return [
              `${p.firstName} ${p.lastName}`,
              schoolAbbr,
              String(p.age),
              p.gender ? p.gender.charAt(0).toUpperCase() : 'U',
              `${p.heightFeet}'${p.heightInches}"`
            ];
          });

          sparringEndY = drawTable(
            doc,
            rightX,
            yPos,
            ['Name', 'School', 'Age', 'Gr', 'Ht'],
            sparringRows,
            [columnWidth - 165, 55, 30, 25, 55],
            columnWidth
          );
        }
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69);
        doc.text('Sparring', rightX, yPos);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        yPos += 15;
        doc.text('No sparring ring', rightX, yPos);
        doc.setTextColor(0, 0, 0);
        sparringEndY = yPos;
      }

      // Move Y position to the bottom of the tallest column
      yPos = Math.max(formsEndY, sparringEndY) + 20;
    });
  });

  // Add footer to the last page
  addFooter(doc, timestamp, pageWidth, pageHeight);

  return doc;
}
