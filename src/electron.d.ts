export interface ElectronAPI {
  selectFile: () => Promise<{ path: string; data: number[] } | null>;
  savePDF: (data: { fileName: string; data: Uint8Array; outputDirectory?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  selectImage: () => Promise<{ path: string; data: number[] } | null>;
  selectDirectory: () => Promise<string | null>;
  saveTournamentState: (state: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadTournamentState: () => Promise<{ success: boolean; data?: any; error?: string } | null>;
  saveAutosave: (data: string) => Promise<{ success: boolean; error?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  saveCheckpoint: (checkpoint: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadCheckpoints: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  deleteCheckpoint: (checkpointId: string) => Promise<{ success: boolean; error?: string }>;
  listBackups: () => Promise<{ success: boolean; data?: { fileName: string; path: string; mtimeMs: number }[]; error?: string }>;
  loadBackup: (fileName: string) => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
