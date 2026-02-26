import jsPDF from 'jspdf';
import { Participant, CompetitionRing, PhysicalRing } from '../../types/tournament';
import { generateFormsScoringSheets } from './formsScoringSheet';
import { generateSparringBrackets } from './sparringBracket';

/**
 * Generates a combined "score sheets per division" PDF.
 *
 * The PDF contains, for each physical ring (in order):
 *   1. Forms scoring sheet(s) for that ring's category pools
 *   2. Sparring bracket(s) for that ring's category pools
 *
 * Physical rings are sorted numerically (e.g. Ring 1a, Ring 1b, Ring 2, …).
 * Competition rings that have no physical-ring mapping are appended at the end.
 */
export function generateScoreSheetsPerDivision(
  participants: Participant[],
  competitionRings: CompetitionRing[],
  physicalRings: PhysicalRing[],
  division: string,
  watermark?: string,
  physicalRingMappings?: { categoryPoolName: string; physicalRingName: string }[],
  schoolAbbreviations?: { [schoolName: string]: string }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  // ── 1. Filter to this division ─────────────────────────────────────────────
  const divisionRings = competitionRings.filter((r) => r.division === division);

  // ── 2. Determine physical-ring → sort-key mapping ─────────────────────────
  const physicalRingOrder = new Map<string, number>();

  if (physicalRingMappings) {
    const physicalNamesInDivision = new Set<string>();
    divisionRings.forEach((ring) => {
      if (ring.name) {
        const m = physicalRingMappings.find((m) => m.categoryPoolName === ring.name);
        if (m) physicalNamesInDivision.add(m.physicalRingName);
      }
    });

    const sorted = Array.from(physicalNamesInDivision).sort((a, b) => {
      const mA = a.match(/(\d+)([a-z]?)/i);
      const mB = b.match(/(\d+)([a-z]?)/i);
      if (!mA || !mB) return a.localeCompare(b);
      const numA = parseInt(mA[1], 10);
      const numB = parseInt(mB[1], 10);
      if (numA !== numB) return numA - numB;
      return (mA[2] || '').localeCompare(mB[2] || '');
    });

    sorted.forEach((name, i) => physicalRingOrder.set(name, i));
  }

  // ── 3. Group competition rings by physical ring name ───────────────────────
  interface RingGroup {
    physicalRingName: string;
    sortOrder: number;
    formsRings: CompetitionRing[];
    sparringRings: CompetitionRing[];
  }

  const groupMap = new Map<string, RingGroup>();

  divisionRings.forEach((ring) => {
    let physicalRingName = '__unassigned__';
    if (ring.name && physicalRingMappings) {
      const m = physicalRingMappings.find((m) => m.categoryPoolName === ring.name);
      if (m) physicalRingName = m.physicalRingName;
    }

    if (!groupMap.has(physicalRingName)) {
      groupMap.set(physicalRingName, {
        physicalRingName,
        sortOrder: physicalRingOrder.get(physicalRingName) ?? 9999,
        formsRings: [],
        sparringRings: [],
      });
    }

    const group = groupMap.get(physicalRingName)!;
    if (ring.type === 'forms') {
      group.formsRings.push(ring);
    } else if (ring.type === 'sparring') {
      group.sparringRings.push(ring);
    }
  });

  // ── 4. Sort groups by physical ring order ──────────────────────────────────
  const sortedGroups = Array.from(groupMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  // ── 5. For each group: forms pages then sparring pages ────────────────────
  //
  // Both existing generators support a `masterPdf` param that causes them to
  // append onto the supplied jsPDF document and add one trailing blank page as
  // a "hand-off" signal.  We exploit this: each generator's trailing blank page
  // becomes the starting page for the next generator.
  //
  // Page sequence for two groups each with forms + sparring:
  //   [group1-forms] [group1-sparring] [group2-forms] [group2-sparring] [trailing-blank]
  // We delete the trailing blank at the end.

  for (const group of sortedGroups) {
    if (group.formsRings.length > 0) {
      generateFormsScoringSheets(
        participants,
        group.formsRings,
        physicalRings,
        division,
        watermark,
        physicalRingMappings,
        doc,          // masterPdf – appends to shared document
        undefined,    // titleOverride
        false,        // isCustomRing
        schoolAbbreviations
      );
    }

    if (group.sparringRings.length > 0) {
      generateSparringBrackets(
        participants,
        group.sparringRings,
        physicalRings,
        division,
        watermark,
        physicalRingMappings,
        doc           // masterPdf – appends to shared document
      );
    }
  }

  // ── 6. Remove the trailing blank page left by the last generator ──────────
  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    doc.deletePage(totalPages);
  }

  return doc;
}
