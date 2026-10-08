import { contextBridge, ipcRenderer } from 'electron';
import type { OperationHint } from './shared/history';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  savePDF: (data: { fileName: string; data: Uint8Array; outputDirectory?: string }) => ipcRenderer.invoke('save-pdf', data),
  printHTML: (html: string) => ipcRenderer.invoke('print-html', html),
  selectImage: () => ipcRenderer.invoke('select-image'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openDirectory: (directoryPath: string) => ipcRenderer.invoke('open-directory', directoryPath),
  // Fire-and-forget: this uses a one-way channel (send/on) instead of
  // invoke/handle. Opening a folder has no meaningful return value, and avoiding
  // the invoke reply channel sidesteps Electron's intermittent
  // "reply was never sent" error (a GC-timing issue with async handlers whose
  // reply is still pending when the reply channel is collected).
  openPDFFolder: (directoryPath: string) => ipcRenderer.send('open-pdf-folder', directoryPath),
  saveTournamentState: (state: any) => ipcRenderer.invoke('save-tournament-state', state),
  loadTournamentState: () => ipcRenderer.invoke('load-tournament-state'),
  saveAutosave: (data: string, hint?: OperationHint) => ipcRenderer.invoke('save-autosave', { data, hint }),
  loadAutosave: () => ipcRenderer.invoke('load-autosave'),
  historyLog: () => ipcRenderer.invoke('history-log'),
  historyShow: (commitId: string) => ipcRenderer.invoke('history-show', commitId),
  historyCheckout: (commitId: string) => ipcRenderer.invoke('history-checkout', commitId),
  historyTags: () => ipcRenderer.invoke('history-tags'),
  historyAddTag: (name: string, commitId: string) => ipcRenderer.invoke('history-add-tag', { name, commitId }),
  historyRemoveTag: (tagId: string) => ipcRenderer.invoke('history-remove-tag', tagId),
  getFileLocations: () => ipcRenderer.invoke('get-file-locations'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openDownloadPage: () => ipcRenderer.invoke('open-download-page'),
  onShowAboutDialog: (callback: () => void) => ipcRenderer.on('show-about-dialog', callback),
  onCheckForUpdates: (callback: () => void) => ipcRenderer.on('check-for-updates', callback),
  onShowHelp: (callback: (topic: string) => void) => ipcRenderer.on('show-help', (_event, topic: string) => callback(topic)),
  onMenuImportExcel: (callback: () => void) => ipcRenderer.on('menu-import-excel', callback),
  onMenuExportDatabase: (callback: () => void) => ipcRenderer.on('menu-export-database', callback),
  onMenuImportDatabase: (callback: () => void) => ipcRenderer.on('menu-import-database', callback),
});
