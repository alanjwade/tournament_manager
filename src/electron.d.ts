import type { CommitSummary, HistoryTag, OperationHint } from './shared/history';

export interface ElectronAPI {
  selectFile: () => Promise<{ path: string; data: number[] } | null>;
  savePDF: (data: { fileName: string; data: Uint8Array; outputDirectory?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  printHTML: (html: string) => Promise<{ success: boolean; error?: string }>;
  selectImage: () => Promise<{ path: string; data: number[] } | null>;
  selectDirectory: () => Promise<string | null>;
  openDirectory: (directoryPath: string) => Promise<{ success: boolean; error?: string }>;
  openPDFFolder: (directoryPath: string) => Promise<{ success: boolean; error?: string }>;
  saveTournamentState: (state: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadTournamentState: () => Promise<{ success: boolean; data?: any; error?: string } | null>;
  saveAutosave: (data: string, hint?: OperationHint) => Promise<{ success: boolean; error?: string; path?: string }>;
  loadAutosave: () => Promise<{ success: boolean; data?: string | null; error?: string; path?: string }>;
  historyLog: () => Promise<{ success: boolean; data?: CommitSummary[]; headId?: string | null; error?: string }>;
  historyShow: (commitId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  historyCheckout: (commitId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  historyTags: () => Promise<{ success: boolean; data?: HistoryTag[]; error?: string }>;
  historyAddTag: (name: string, commitId: string) => Promise<{ success: boolean; data?: HistoryTag; error?: string }>;
  historyRemoveTag: (tagId: string) => Promise<{ success: boolean; error?: string }>;
  getFileLocations: () => Promise<{ dataPath: string; autosavePath: string; defaultPdfOutputDir: string; exePath: string }>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; currentVersion: string; latestVersion?: string; updateAvailable?: boolean; downloadUrl?: string; error?: string }>;
  openDownloadPage: () => Promise<{ success: boolean }>;
  onShowAboutDialog: (callback: () => void) => void;
  onCheckForUpdates: (callback: () => void) => void;
  onShowHelp: (callback: (topic: string) => void) => void;
  onMenuImportExcel: (callback: () => void) => void;
  onMenuExportDatabase: (callback: () => void) => void;
  onMenuImportDatabase: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
