import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';
import { getFullyQualifiedRingName, getPhysicalRingId, formatPdfTimestamp, formatPoolNameForDisplay } from '../ringNameFormatter';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';

export function generateFormsScoringSheets(
  participants: Participant[],
  competitionRings: CompetitionRing[],
  physicalRings: PhysicalRing[],
  division: string,
  watermark?: string,
  physicalRingMappings?: { categoryPoolName: string; physicalRingName: string }[],
  masterPdf?: jsPDF
): jsPDF {
  const doc = masterPdf || new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });
  
  // Track the initial page count - if creating new PDF it's 1, if master PDF it's whatever it already is
  const initialPageCount = doc.getNumberOfPages();
  let isFirstRing = true; // Track if this is the first ring being added

  const pageWidth = 8.5; // Letter width in inches
  const pageHeight = 11; // Letter height in inches
  const margin = 0.5; // 1/2 inch margins
  const timestamp = formatPdfTimestamp(); // Generate once for all pages

  const divisionRings = competitionRings
    .filter((r) => r.division === division && r.type === 'forms')
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

  divisionRings.forEach((ring) => {
    // Only add a new page if this is NOT the very first ring AND we're starting fresh
    // If masterPdf is provided, we add a page for all rings
    // If masterPdf is NOT provided and this is the first ring, DON'T add a page
    if (!isFirstRing || masterPdf) {
      doc.addPage();
    }
    isFirstRing = false;

    // Get physical ring ID from mapping using the pool name
    const physicalRingId = ring.name && physicalRingMappings 
      ? getPhysicalRingId(ring.name, physicalRingMappings)
      : null;
    
    const fullyQualifiedRingName = getFullyQualifiedRingName(division, physicalRingId, physicalRings);
    
    // Get ring color for title styling
    let ringColor = '';
    if (physicalRingId) {
      ringColor = getRingColorFromName(physicalRingId) || '';
    }

    // Add watermark if provided - centered, as large as possible without cutting off
    if (watermark) {
      try {
        console.log('Adding watermark to forms scoring sheet, length:', watermark.length);
        console.log('Watermark starts with:', watermark.substring(0, 50));
        
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
        console.log('Watermark added successfully');
      } catch (e) {
        console.error('Error adding watermark:', e);
      }
    } else {
      console.log('No watermark provided');
    }

    // Title with colored background using ring color
    const titleText = `${fullyQualifiedRingName} Forms Scoring Sheet`;
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
    
    // Category ring name subtitle - add space below
    if (ring.name) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPoolNameForDisplay(ring.name), margin, margin + 0.5);
    }

    // Table - increased spacing below subtitle
    let y = margin + 0.9; // Start below title with extra spacing
    const colWidths = {
      name: 2.5,
      school: 2.0,
      judge1: 0.8,
      judge2: 0.8,
      judge3: 0.8,
      final: 0.8,
    };
    
    const tableWidth = colWidths.name + colWidths.school + colWidths.judge1 + 
                       colWidths.judge2 + colWidths.judge3 + colWidths.final;

    // Headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let x = margin;
    
    // Shade the Final column header
    const finalX = margin + colWidths.name + colWidths.school + colWidths.judge1 + 
                   colWidths.judge2 + colWidths.judge3;
    doc.setFillColor(220, 220, 220); // Light gray
    doc.rect(finalX, y - 0.15, colWidths.final, 0.2, 'F');
    
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
    y += 0.05;
    doc.setLineWidth(0.02);
    doc.line(margin, y, margin + tableWidth, y);

    // Participants
    y += 0.25;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const ringParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));

    ringParticipants.forEach((participant) => {
      // Check if we need a new page (leave room for placement table)
      if (y > pageHeight - 2.5) {
        doc.addPage();
        y = margin + 0.3;
        
        // Add watermark to new page
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
            
            doc.saveGraphicsState();
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.15 })); // 15% opacity
            doc.addImage(watermark, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
            doc.restoreGraphicsState();
          } catch (e) {
            console.error('Error adding watermark:', e);
          }
        }
        
        // Repeat title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${fullyQualifiedRingName} Forms Scoring Sheet (cont.)`, margin, y);
        y += 0.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      x = margin;
      
      // Shade the Final column for this row
      const finalX = margin + colWidths.name + colWidths.school + colWidths.judge1 + 
                     colWidths.judge2 + colWidths.judge3;
      doc.setFillColor(240, 240, 240); // Very light gray for data rows
      doc.rect(finalX, y - 0.12, colWidths.final, 0.3, 'F');
      
      doc.text(`${participant.firstName} ${participant.lastName}`, x, y);
      x += colWidths.name;
      doc.text(participant.school.substring(0, 25), x, y);
      x += colWidths.school;
      
      // Draw score boxes for judges and final
      for (let i = 0; i < 4; i++) {
        doc.setLineWidth(0.01);
        doc.rect(x + 0.05, y - 0.12, 0.6, 0.2);
        x += i < 3 ? (i === 0 ? colWidths.judge1 : colWidths.judge2) : colWidths.final;
      }

      // Draw thin line under each row for easy following
      y += 0.18;
      doc.setLineWidth(0.005);
      doc.setDrawColor(200, 200, 200); // Light gray line
      doc.line(margin, y, margin + tableWidth, y);
      doc.setDrawColor(0, 0, 0); // Reset to black
      
      y += 0.12;
    });

    // Final places table
    y += 0.3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Final Places:', margin, y);
    
    y += 0.25;
    doc.setFontSize(10);
    const finalPlaces = ['1st Place:', '2nd Place:', '3rd Place:'];
    finalPlaces.forEach((place) => {
      doc.text(place, margin, y);
      doc.setLineWidth(0.01);
      doc.line(margin + 1.0, y, margin + 4.5, y);
      y += 0.3;
    });
  });

  // Add timestamp to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128); // Gray text
    doc.text(timestamp, margin, pageHeight - 0.25);
    doc.setTextColor(0, 0, 0); // Reset to black
  }

  return doc;
}
