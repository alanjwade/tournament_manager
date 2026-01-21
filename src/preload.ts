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
  listBackups: () => ipcRenderer.invoke('list-backups'),
  loadBackup: (fileName: string) => ipcRenderer.invoke('load-backup', fileName),
  getFileLocations: () => ipcRenderer.invoke('get-file-locations'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openDownloadPage: () => ipcRenderer.invoke('open-download-page'),
  onShowAboutDialog: (callback: () => void) => ipcRenderer.on('show-about-dialog', callback),
  onCheckForUpdates: (callback: () => void) => ipcRenderer.on('check-for-updates', callback),
});
