export interface ElectronAPI {
  selectFile: () => Promise<{ path: string; data: number[] } | null>;
  savePDF: (data: { fileName: string; data: Uint8Array; outputDirectory?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  selectImage: () => Promise<{ path: string; data: number[] } | null>;
  selectDirectory: () => Promise<string | null>;
  saveTournamentState: (state: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadTournamentState: () => Promise<{ success: boolean; data?: any; error?: string } | null>;
  saveAutosave: (data: string) => Promise<{ success: boolean; error?: string; path?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string; path?: string }>;
  saveCheckpoint: (checkpoint: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadCheckpoints: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  deleteCheckpoint: (checkpointId: string) => Promise<{ success: boolean; error?: string }>;
  listBackups: () => Promise<{ success: boolean; data?: { fileName: string; path: string; mtimeMs: number }[]; error?: string }>;
  loadBackup: (fileName: string) => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
  getFileLocations: () => Promise<{ dataPath: string; backupDir: string; autosavePath: string; defaultPdfOutputDir: string; exePath: string }>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; currentVersion: string; latestVersion?: string; updateAvailable?: boolean; downloadUrl?: string; error?: string }>;
  openDownloadPage: () => Promise<{ success: boolean }>;
  onShowAboutDialog: (callback: () => void) => void;
  onCheckForUpdates: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
