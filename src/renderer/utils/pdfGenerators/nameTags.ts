import jsPDF from 'jspdf';
import { Participant, PhysicalRing, PhysicalRingMapping, Cohort } from '../../types/tournament';
import { getSchoolAbbreviation } from '../schoolAbbreviations';

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
  cohorts?: Cohort[]
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
    // 25% of tag height, square, with 1/8" (3.175mm) margin from edges
    if (logo) {
      try {
        const logoSize = config.height * 0.25; // 25% of height, square
        const marginMm = 3.175; // 1/8 inch = 3.175mm
        // Position inside the tag: bottom right corner
        const logoX = x + config.width - logoSize - marginMm; // From right edge
        const logoY = y + config.height - logoSize - marginMm; // From bottom edge
        
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
    
    // Get physical ring from cohort ring mapping - use cohort NAME not ID
    if (participant.formsCohortRing && participant.formsCohortId && physicalRingMappings && cohorts) {
      // Find the cohort to get its name
      const formsCohort = cohorts.find(c => c.id === participant.formsCohortId);
      
      if (formsCohort) {
        const cohortRingName = `${formsCohort.name}_${participant.formsCohortRing}`;
        
        const mapping = physicalRingMappings.find(m => m.cohortRingName === cohortRingName);
        
        if (mapping) {
          physicalRingName = mapping.physicalRingName;
          
          // Extract ring number from physicalRingName (e.g., "PR5" or "PR5a" -> 5)
          const ringNumberMatch = physicalRingName.match(/PR(\d+)/);
          if (ringNumberMatch) {
            const ringNumber = parseInt(ringNumberMatch[1], 10);
            // Physical rings are stored as "Ring 1", "Ring 2", etc. or by index
            const ring = physicalRings.find((r) => 
              r.name === `Ring ${ringNumber}` || r.id === `ring-${ringNumber}`
            );
            if (ring) {
              ringColor = ring.color;
            }
          }
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

    // Physical Ring with colored background (match GAS ringDesignator with fg/bg colors)
    if (physicalRingName && ringColor) {
      textY += 12; // Larger spacing for 24pt font
      
      // Draw text with colored background - just show ring name (e.g., "PR9")
      const ringText = physicalRingName;
      const textWidth = doc.getTextWidth(ringText);
      
      // Convert hex color to RGB for background
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 200, g: 200, b: 200 };
      };
      
      const bgColor = hexToRgb(ringColor);
      
      // Draw colored background rectangle
      doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      doc.rect(x + 4, textY - 6, textWidth + 4, 8, 'F');
      
      // Determine text color (white for dark backgrounds, black for light)
      const brightness = (bgColor.r * 299 + bgColor.g * 587 + bgColor.b * 114) / 1000;
      doc.setTextColor(brightness > 128 ? 0 : 255);
      
      doc.setFont('helvetica', 'bold');
      doc.text(ringText, x + 5, textY);
      
      // Reset text color to black
      doc.setTextColor(0);
    }

    currentPosition++;
  });

  return doc;
}
