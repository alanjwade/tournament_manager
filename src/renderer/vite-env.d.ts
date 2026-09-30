/// <reference types="vite/client" />

// Vite provides ambient declarations for asset imports (`*.png`, `*?url`, etc.)
// and `import.meta.env`. Keeping this reference in the renderer's own typecheck
// config is what lets `tsc -p tsconfig.renderer.json` pass without Vite running.
