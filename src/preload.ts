import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  savePDF: (data: { fileName: string; data: Uint8Array }) => ipcRenderer.invoke('save-pdf', data),
  selectImage: () => ipcRenderer.invoke('select-image'),
  saveTournamentState: (state: any) => ipcRenderer.invoke('save-tournament-state', state),
  loadTournamentState: () => ipcRenderer.invoke('load-tournament-state'),
});
