import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../../types/tournament';

export interface NameTagConfig {
  width: number; // in inches
  height: number; // in inches
  marginX: number; // horizontal margin in inches
  marginY: number; // vertical margin in inches
  fontSize: number;
  columns: number;
  rows: number;
}

const DEFAULT_CONFIG: NameTagConfig = {
  width: 3.375, // 3 3/8 inches
  height: 2.333, // 2 1/3 inches
  marginX: 0.875, // 7/8 inch left margin
  marginY: 0.75, // 3/4 inch top margin
  fontSize: 24,
  columns: 2,
  rows: 4,
};

export function generateNameTags(
  participants: Participant[],
  rings: CompetitionRing[],
  physicalRings: PhysicalRing[],
  divisionName: string,
  config: NameTagConfig = DEFAULT_CONFIG
): jsPDF {
  const pdf = new jsPDF('portrait', 'in', 'letter'); // Use inches and letter format
  let currentTag = 0;
  
  const columnSpacing = 0.375; // 3/8 inch between columns
  const rowSpacing = 0.1875; // 3/16 inch between rows

  participants.forEach((participant) => {
    // Find the ring for this participant
    const formsRing = rings.find((r) => r.id === participant.formsRingId);
    const physicalRing = physicalRings.find((pr) => pr.id === formsRing?.physicalRingId);
    const ringColor = physicalRing?.color || 'N/A';

    const col = currentTag % config.columns;
    const row = Math.floor(currentTag / config.columns) % config.rows;

    // Add new page if needed
    if (currentTag > 0 && currentTag % (config.columns * config.rows) === 0) {
      pdf.addPage();
    }

    const x = config.marginX + col * (config.width + columnSpacing);
    const y = config.marginY + row * (config.height + rowSpacing);

    // Draw border
    pdf.rect(x, y, config.width, config.height);

    // Add text
    pdf.setFontSize(config.fontSize + 2);
    pdf.text(`${participant.firstName} ${participant.lastName}`, x + 5, y + 15);

    pdf.setFontSize(config.fontSize);
    pdf.text(`Division: ${divisionName}`, x + 5, y + 25);
    pdf.text(`School: ${participant.school}`, x + 5, y + 35);
    pdf.text(`Ring: ${ringColor}`, x + 5, y + 45);

    // Color indicator (filled rectangle)
    pdf.setFillColor(ringColor === 'Red' ? '#FF0000' : 
                      ringColor === 'Blue' ? '#0000FF' :
                      ringColor === 'Green' ? '#00FF00' :
                      ringColor === 'Yellow' ? '#FFFF00' :
                      ringColor === 'Orange' ? '#FFA500' :
                      ringColor === 'Purple' ? '#800080' :
                      '#CCCCCC');
    pdf.rect(x + config.width - 20, y + 5, 15, 10, 'F');

    currentTag++;
  });

  return pdf;
}
