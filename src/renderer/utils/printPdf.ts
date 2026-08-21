import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
// Vite bundles the worker as a separate asset; point pdfjs at it so page
// rendering happens off the main thread.
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * How the PDF should be printed.
 * - 'dialog': open the PDF in a preview window and show the OS print dialog
 *   (lets the user pick the printer/options each time).
 * - 'now': print silently to the last-used/default printer without showing a
 *   dialog.
 */
export type PrintMode = 'dialog' | 'now';

/**
 * The two label variants shown on a print button. Default labels are
 * 'Print...' (dialog) and 'Print Now' (silent).
 */
export const PRINT_MODE_LABELS: { [k in PrintMode]: string } = {
  dialog: 'Print...',
  now: 'Print Now',
};

/**
 * Print an already-generated jsPDF document using the requested mode.
 *
 * - 'dialog' keeps the existing flow: open a preview window, then trigger the
 *   print dialog (and close the window after printing).
 * - 'now' rasterizes each page of the PDF to an image and silently prints an
 *   HTML page of those images via the main process. This is reliable, unlike
 *   asking Chromium to silently print a PDF through its built-in viewer (which
 *   frequently results in a solid black page).
 */
export async function printPdf(pdf: jsPDF, mode: PrintMode): Promise<void> {
  if (mode === 'now') {
    try {
      const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
      const html = await rasterizePdfToPrintHtml(pdfBytes);
      const result = await window.electronAPI.printHTML(html);
      if (!result.success) {
        alert(`Print failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Print failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    return;
  }

  // 'dialog' mode — preview window + print dialog (original behavior)
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl);
  if (printWindow) {
    await new Promise<void>((resolve) => {
      printWindow.addEventListener('load', () => {
        printWindow.addEventListener('afterprint', () => printWindow.close());
        printWindow.print();
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          resolve();
        }, 500);
      });
    });
  } else {
    URL.revokeObjectURL(pdfUrl);
  }
}

// Standard US Letter page size, used to size each rasterized page for print.
const LETTER_IN = { width: 8.5, height: 11 };

/**
 * Render every page of a PDF (as bytes) to a rasterized image and assemble a
 * standalone HTML document sized to US Letter, one page per print page.
 * The images are embedded as JPEG data URLs so no external file is needed.
 */
async function rasterizePdfToPrintHtml(pdfBytes: Uint8Array): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes,
    // Keep standard PDF fonts crisp without external font resources.
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex++) {
      const page = await doc.getPage(pageIndex);
      // 2x resolution for decent print sharpness.
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      pages.push(
        `<div class="page"><img src="${dataUrl}" alt="" /></div>`
      );
      page.cleanup();
    }

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Print</title>
<style>
  @page { size: ${LETTER_IN.width}in ${LETTER_IN.height}in; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page {
    width: ${LETTER_IN.width}in;
    height: ${LETTER_IN.height}in;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .page img { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
  } finally {
    await doc.destroy();
  }
}
