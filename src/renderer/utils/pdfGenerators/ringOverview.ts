import jsPDF from 'jspdf';
import { formatPdfTimestamp } from '../ringNameFormatter';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';

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
  selectedDivision: string = 'all'
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

    divisionRings.forEach((pair, ringIndex) => {
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
        const formsRows = formsParticipants.map(p => [
          p.formsRankOrder ? String(p.formsRankOrder) : '-',
          `${p.firstName} ${p.lastName}`,
          p.schoolId ? p.schoolId.split(',')[0].substring(0, 12) : '',
          String(p.age),
          p.gender
        ]);

        formsEndY = drawTable(
          doc,
          leftX,
          yPos,
          ['Pos', 'Name', 'School', 'Age', 'Gender'],
          formsRows,
          [30, columnWidth - 170, 80, 30, 30],
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

            const rowsA = participantsA.map(p => [
              p.sparringRankOrder ? String(p.sparringRankOrder * 10) : '-',
              `${p.firstName} ${p.lastName}`,
              p.schoolId ? p.schoolId.split(',')[0].substring(0, 12) : '',
              String(p.age),
              p.gender,
              `${p.heightFeet}'${p.heightInches}"`
            ]);

            yPos = drawTable(
              doc,
              rightX,
              yPos,
              ['Pos', 'Name', 'School', 'Age', 'Gender', 'Height'],
              rowsA,
              [30, columnWidth - 210, 70, 30, 40, 40],
              columnWidth
            ) + 10;
          }

          // Alt Ring B
          if (participantsB.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Alt Ring B (${participantsB.length})`, rightX, yPos);
            yPos += 12;

            const rowsB = participantsB.map(p => [
              p.sparringRankOrder ? String(p.sparringRankOrder * 10) : '-',
              `${p.firstName} ${p.lastName}`,
              p.schoolId ? p.schoolId.split(',')[0].substring(0, 12) : '',
              String(p.age),
              p.gender,
              `${p.heightFeet}'${p.heightInches}"`
            ]);

            sparringEndY = drawTable(
              doc,
              rightX,
              yPos,
              ['Pos', 'Name', 'School', 'Age', 'Gender', 'Height'],
              rowsB,
              [30, columnWidth - 210, 70, 30, 40, 40],
              columnWidth
            );
          } else {
            sparringEndY = yPos;
          }
        } else {
          doc.text(`Participants: ${sparringParticipants.length}`, rightX, yPos);
          yPos += 15;

          const sparringRows = sparringParticipants.map(p => [
            p.sparringRankOrder ? String(p.sparringRankOrder * 10) : '-',
            `${p.firstName} ${p.lastName}`,
            p.schoolId ? p.schoolId.split(',')[0].substring(0, 12) : '',
            String(p.age),
            p.gender,
            `${p.heightFeet}'${p.heightInches}"`
          ]);

          sparringEndY = drawTable(
            doc,
            rightX,
            yPos,
            ['Pos', 'Name', 'School', 'Age', 'Gender', 'Height'],
            sparringRows,
            [30, columnWidth - 200, 70, 30, 30, 40],
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
