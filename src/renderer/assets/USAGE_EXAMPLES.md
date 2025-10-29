// Example Asset Usage Configuration
// Copy this to your components as needed

// ============================================
// EXAMPLE 1: Using Logos in PDF Generation
// ============================================

// In your PDF generator file (e.g., src/renderer/utils/pdfGenerators/nameTags.ts)
import tournamentLogo from '@/assets/logos/nametag-symbol.png';
import watermarkImage from '@/assets/logos/watermark.png';

export function generateNameTags() {
  // Add logo to name tag
  doc.addImage(tournamentLogo, 'PNG', 10, 10, 30, 30);
  
  // Add watermark
  doc.addImage(watermarkImage, 'PNG', x, y, width, height, undefined, 'FAST');
}

// ============================================
// EXAMPLE 2: Using in React Components
// ============================================

// In your component file
import React from 'react';
import appLogo from '@/assets/logos/tournament-logo.png';

export function Header() {
  return (
    <header>
      <img src={appLogo} alt="Tournament Logo" style={{ height: '50px' }} />
    </header>
  );
}

// ============================================
// EXAMPLE 3: Setting Default Watermark
// ============================================

// In Configuration.tsx or similar
import defaultWatermark from '@/assets/logos/watermark.png';
import { useTournamentStore } from '@/store/tournamentStore';

export function Configuration() {
  const updateConfig = useTournamentStore((state) => state.updateConfig);
  
  const setDefaultWatermark = () => {
    // Convert to base64 if needed, or use directly
    updateConfig({ watermarkImage: defaultWatermark });
  };
  
  return (
    <button onClick={setDefaultWatermark}>
      Use Default Watermark
    </button>
  );
}

// ============================================
// EXAMPLE 4: Using SVG Icons
// ============================================

// If using SVG files
import { ReactComponent as TrophyIcon } from '@/assets/icons/trophy.svg';

export function Awards() {
  return (
    <div>
      <TrophyIcon style={{ width: '24px', height: '24px' }} />
    </div>
  );
}

// ============================================
// EXAMPLE 5: Dynamic Import for Large Images
// ============================================

// For large images that shouldn't block initial load
export async function loadHiResLogo() {
  const logo = await import('@/assets/logos/high-res-logo.png');
  return logo.default;
}

// ============================================
// TypeScript Type Declarations
// ============================================

// If TypeScript complains about importing images, add to vite-env.d.ts:
/*
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
*/
