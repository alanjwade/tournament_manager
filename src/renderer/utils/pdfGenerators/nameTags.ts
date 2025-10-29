import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';

export interface NameTagConfig {
  width: number; // in mm
  height: number; // in mm
  fontSize: number;
  marginX: number;
  marginY: number;
}

const DEFAULT_NAME_TAG_CONFIG: NameTagConfig = {
  width: 100,
  height: 65,
  fontSize: 12,
  marginX: 5,
  marginY: 5,
};

export function generateNameTags(
  participants: Participant[],
  division: string,
  physicalRings: PhysicalRing[],
  watermark?: string,
  config: NameTagConfig = DEFAULT_NAME_TAG_CONFIG
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
  
  const divisionParticipants = participants.filter((p) => p.division === division);
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

    const x = config.marginX + col * (config.width + config.marginX);
    const y = config.marginY + row * (config.height + config.marginY);

    // Draw border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, config.width, config.height);

    // Add watermark if provided
    if (watermark) {
      try {
        doc.addImage(
          watermark,
          'PNG',
          x + 5,
          y + 5,
          config.width - 10,
          config.height - 10,
          undefined,
          'NONE',
          0.1
        );
      } catch (e) {
        console.error('Error adding watermark:', e);
      }
    }

    // Get ring color
    let ringColor = '';
    const formsRing = participant.formsRingId;
    if (formsRing) {
      const physicalRingId = formsRing.split('-').pop();
      const ring = physicalRings.find((r) => r.id === physicalRingId);
      if (ring) {
        ringColor = ring.color;
      }
    }

    // Add text content
    let textY = y + 15;
    doc.setFontSize(config.fontSize + 2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${participant.firstName} ${participant.lastName}`, x + 5, textY);

    textY += 8;
    doc.setFontSize(config.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(`Division: ${participant.division}`, x + 5, textY);

    textY += 6;
    doc.text(`School: ${participant.school}`, x + 5, textY);

    if (participant.branch) {
      textY += 6;
      doc.text(`Branch: ${participant.branch}`, x + 5, textY);
    }

    if (ringColor) {
      textY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Ring: ${ringColor}`, x + 5, textY);
      
      // Draw color indicator
      const colorMap: { [key: string]: number[] } = {
        red: [255, 0, 0],
        blue: [0, 0, 255],
        green: [0, 255, 0],
        yellow: [255, 255, 0],
        orange: [255, 165, 0],
        purple: [128, 0, 128],
        black: [0, 0, 0],
        white: [255, 255, 255],
      };
      
      const color = colorMap[ringColor.toLowerCase()] || [128, 128, 128];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(x + config.width - 15, textY - 2, 3, 'F');
    }

    currentPosition++;
  });

  return doc;
}
