import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  savePDF: (data: { fileName: string; data: Uint8Array; outputDirectory?: string }) => ipcRenderer.invoke('save-pdf', data),
  selectImage: () => ipcRenderer.invoke('select-image'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveTournamentState: (state: any) => ipcRenderer.invoke('save-tournament-state', state),
  loadTournamentState: () => ipcRenderer.invoke('load-tournament-state'),
  saveAutosave: (data: string) => ipcRenderer.invoke('save-autosave', data),
  loadAutosave: () => ipcRenderer.invoke('load-autosave'),
  saveCheckpoint: (checkpoint: any) => ipcRenderer.invoke('save-checkpoint', checkpoint),
  loadCheckpoints: () => ipcRenderer.invoke('load-checkpoints'),
  deleteCheckpoint: (checkpointId: string) => ipcRenderer.invoke('delete-checkpoint', checkpointId),
});
