export interface ElectronAPI {
  selectFile: () => Promise<{ path: string; data: number[] } | null>;
  savePDF: (data: { fileName: string; data: Uint8Array }) => Promise<{ success: boolean; path?: string; error?: string }>;
  selectImage: () => Promise<{ path: string; data: number[] } | null>;
  saveTournamentState: (state: any) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadTournamentState: () => Promise<{ success: boolean; data?: any; error?: string } | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
