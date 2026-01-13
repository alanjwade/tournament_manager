/**
 * Ring color utilities for PDF generation
 */

// Physical ring color map - ring number to hex color
export const RING_COLOR_MAP: { [ringNumber: number]: string } = {
  1: "#ff0000", // red
  2: "#ffa500", // orange
  3: "#ffff00", // yellow
  4: "#34a853", // green
  5: "#0000ff", // blue
  6: "#fd2670", // pink
  7: "#8441be", // purpleish
  8: "#999999", // gray
  9: "#000000", // black
  10: "#b68a46", // brown
  11: "#f78db3", // light pink
  12: "#6fa8dc", // light blue
  13: "#b6d7a8", // light green
  14: "#b4a7d6", // light purple
};

// Dark backgrounds that need white text
const DARK_BACKGROUNDS = ["#000000", "#0000ff", "#8441be"];

/**
 * Get ring color by ring number (ignores group suffix like 'a', 'b')
 * @param ringNumber - The ring number (1-14)
 * @returns Hex color string or undefined if not found
 */
export function getRingColor(ringNumber: number): string | undefined {
  return RING_COLOR_MAP[ringNumber];
}

/**
 * Get ring color from physical ring name (e.g., "PR1", "PR5a", "PR12b")
 * @param physicalRingName - Physical ring name like "PR1" or "PR5a"
 * @returns Hex color string or undefined if not found
 */
export function getRingColorFromName(physicalRingName: string): string | undefined {
  const match = physicalRingName.match(/PR(\d+)/i);
  if (!match) return undefined;
  const ringNumber = parseInt(match[1], 10);
  return getRingColor(ringNumber);
}

/**
 * Get foreground color (text color) based on background color
 * @param backgroundColor - Hex color string for background
 * @returns "#ffffff" for dark backgrounds, "#000000" for light backgrounds
 */
export function getForegroundColor(backgroundColor: string): string {
  if (DARK_BACKGROUNDS.includes(backgroundColor.toLowerCase())) {
    return "#ffffff"; // white
  }
  return "#000000"; // black
}

/**
 * Convert hex color to RGB object
 * @param hex - Hex color string (with or without #)
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 200, g: 200, b: 200 }; // Default gray
}

/**
 * Get ring number from physical ring name
 * @param physicalRingName - Physical ring name like "PR1" or "PR5a"
 * @returns Ring number or undefined
 */
export function getRingNumber(physicalRingName: string): number | undefined {
  const match = physicalRingName.match(/PR(\d+)/i);
  if (!match) return undefined;
  return parseInt(match[1], 10);
}
