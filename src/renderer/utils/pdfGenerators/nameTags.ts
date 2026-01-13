import jsPDF from 'jspdf';
import { Participant, PhysicalRing, PhysicalRingMapping, Category } from '../../types/tournament';
import { getSchoolAbbreviation } from '../schoolAbbreviations';
import { getEffectiveFormsInfo } from '../computeRings';
import { getRingColorFromName, getForegroundColor, hexToRgb } from '../ringColors';

export interface NameTagConfig {
  width: number; // in mm
  height: number; // in mm
  fontSize: number;
  marginX: number;
  marginY: number;
}

// Name tag dimensions:
// width: 3 3/8" = 3.375 inches = 85.725 mm
// height: 2 1/3" = 2.333 inches = 59.27 mm
// leftMargin: 7/8" = 0.875 inches = 22.225 mm
// topMargin: 3/4" = 0.75 inches = 19.05 mm
const DEFAULT_NAME_TAG_CONFIG: NameTagConfig = {
  width: 85.725,  // 3 3/8 inches
  height: 59.27,  // 2 1/3 inches
  fontSize: 24,   // 24pt Calibri to match GAS
  marginX: 22.225, // 7/8 inches (left margin to first column)
  marginY: 19.05,  // 3/4 inches (top margin to first row)
};

export function generateNameTags(
  participants: Participant[],
  division: string,
  physicalRings: PhysicalRing[],
  watermark?: string,
  config: NameTagConfig = DEFAULT_NAME_TAG_CONFIG,
  physicalRingMappings?: PhysicalRingMapping[],
  schoolAbbreviations?: { [schoolName: string]: string },
  logo?: string,
  categories?: Category[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 215.9; // Letter width in mm
  const pageHeight = 279.4; // Letter height in mm
  const cols = 2;
  const rows = 4;
  
  // Spacing between tags: 3/8" between columns, 3/16" between rows
  const columnSpacing = 9.525; // 3/8 inches = 9.525 mm
  const rowSpacing = 4.7625;   // 3/16 inches = 4.7625 mm
  
  // Filter participants by division - check formsDivision, sparringDivision, or legacy division field
  const divisionParticipants = participants.filter((p) => {
    return p.formsDivision === division || 
           p.sparringDivision === division || 
           p.division === division;
  });
  
  let currentPage = 0;
  let currentPosition = 0;

  divisionParticipants.forEach((participant, index) => {
    const col = currentPosition % cols;
    const row = Math.floor(currentPosition / cols) % rows;

    // Add new page if needed
    if (currentPosition > 0 && currentPosition % (cols * rows) === 0) {
      doc.addPage();
      currentPage++;
    }

    // Position: start at margin, then add (tag width + spacing) for each column/row
    const x = config.marginX + col * (config.width + columnSpacing);
    const y = config.marginY + row * (config.height + rowSpacing);

    // Draw border (black box around each name tag)
    doc.setDrawColor(0, 0, 0); // Black border
    doc.setLineWidth(0.5);
    doc.rect(x, y, config.width, config.height);

    // Add logo to bottom right inside the tag if provided
    // 27.5% of tag height (25% + 10% bigger), square, positioned to align with division text
    if (logo) {
      try {
        const logoSize = config.height * 0.275; // 27.5% of height (25% * 1.1 for 10% bigger), square
        const marginMm = 3.175; // 1/8 inch = 3.175mm from right edge
        // Position inside the tag: right side, vertically centered on the division text
        // Division text is at y + 39, so center logo there
        const logoX = x + config.width - logoSize - marginMm; // From right edge
        const logoY = y + 30.85; // Center logo around division text line (y + 39 - logoSize/2)
        
        doc.addImage(
          logo,
          'PNG',
          logoX,
          logoY,
          logoSize,
          logoSize,
          undefined,
          'NONE'
        );
      } catch (e) {
        console.error('Error adding logo:', e);
      }
    }

    // Get physical ring info (match GAS version which uses virtToPhysMap)
    let physicalRingName = '';
    let ringColor = '';
    
    // Get physical ring from pool mapping - use effective forms info (resolves "same as sparring")
    const effectiveForms = getEffectiveFormsInfo(participant);
    if (effectiveForms.pool && effectiveForms.categoryId && physicalRingMappings && categories) {
      // Find the category to get its name
      const formsCategory = categories.find(c => c.id === effectiveForms.categoryId);
      
      if (formsCategory) {
        const categoryRingName = `${formsCategory.name}_${effectiveForms.pool}`;
        
        const mapping = physicalRingMappings.find(m => 
          (m.categoryPoolName || m.cohortRingName) === categoryRingName
        );
        
        if (mapping) {
          physicalRingName = mapping.physicalRingName;
          // Get color from ring number using color map
          ringColor = getRingColorFromName(physicalRingName) || '';
        }
      }
    }

    // Add text content - Match GAS layout: Name, School, Division, Ring
    // Using 24pt font (Helvetica as closest to Calibri - jsPDF doesn't support Calibri by default)
    let textY = y + 15; // Start higher for better spacing with larger font
    
    // Name (bold, 24pt like GAS)
    doc.setFontSize(config.fontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(`${participant.firstName} ${participant.lastName}`, x + 5, textY);

    textY += 12; // Larger spacing for 24pt font
    doc.setFont('helvetica', 'normal');
    
    // School - Use abbreviation based on branch field (or school if no branch)
    const schoolKey = participant.branch || participant.school;
    const schoolDisplay = getSchoolAbbreviation(schoolKey, schoolAbbreviations);
    doc.text(schoolDisplay, x + 5, textY);

    textY += 12; // Larger spacing for 24pt font
    
    // Division
    const displayDivision = participant.formsDivision || participant.sparringDivision || participant.division || division;
    doc.text(displayDivision, x + 5, textY);

    // Physical Ring with colored background
    if (physicalRingName && ringColor) {
      textY += 12; // Larger spacing for 24pt font
      
      // Convert physical ring name format (e.g., "PR1" -> "Ring 1", "PR1a" -> "Ring 1 Group A")
      const convertRingName = (prName: string): string => {
        const match = prName.match(/^PR(\d+)([a-z]?)$/i);
        if (!match) return prName;
        
        const ringNum = match[1];
        const suffix = match[2].toLowerCase();
        
        if (!suffix) {
          return `Ring ${ringNum}`;
        }
        
        const groupMap: { [key: string]: string } = {
          'a': 'Group A',
          'b': 'Group B',
          'c': 'Group C',
          'd': 'Group D',
        };
        
        return `Ring ${ringNum} ${groupMap[suffix] || suffix}`;
      };
      
      const ringText = convertRingName(physicalRingName);
      const textWidth = doc.getTextWidth(ringText);
      
      const bgColor = hexToRgb(ringColor);
      const fgColor = getForegroundColor(ringColor);
      const fgRgb = hexToRgb(fgColor);
      
      // Draw colored background rectangle
      doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      doc.rect(x + 4, textY - 6, textWidth + 4, 8, 'F');
      
      // Set text color based on background
      doc.setTextColor(fgRgb.r, fgRgb.g, fgRgb.b);
      
      doc.setFont('helvetica', 'bold');
      doc.text(ringText, x + 5, textY);
      
      // Reset text color to black
      doc.setTextColor(0);
    }

    currentPosition++;
  });

  return doc;
}
