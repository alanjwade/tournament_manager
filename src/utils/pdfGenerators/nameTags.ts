import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../../types/tournament';

export interface NameTagConfig {
  width: number; // in mm
  height: number; // in mm
  marginX: number; // horizontal margin
  marginY: number; // vertical margin
  fontSize: number;
  columns: number;
  rows: number;
}

const DEFAULT_CONFIG: NameTagConfig = {
  width: 95, // ~half of A4 width
  height: 65, // for 4 rows
  marginX: 10,
  marginY: 10,
  fontSize: 14,
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
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  let currentTag = 0;

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

    const x = config.marginX + col * config.width;
    const y = config.marginY + row * config.height;

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
