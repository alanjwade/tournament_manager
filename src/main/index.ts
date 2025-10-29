import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Don't show until ready
  });

  // Maximize after creation
  mainWindow.maximize();
  mainWindow.show();

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-file', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileData = fs.readFileSync(filePath);
  return {
    path: filePath,
    data: Array.from(fileData)
  };
});

ipcMain.handle('save-pdf', async (event, pdfData: { fileName: string; data: Uint8Array }) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: pdfData.fileName,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    fs.writeFileSync(result.filePath, Buffer.from(pdfData.data));
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('select-image', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileData = fs.readFileSync(filePath);
  return {
    path: filePath,
    data: Array.from(fileData)
  };
});

ipcMain.handle('save-tournament-state', async (event, state: any) => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'tournament-state.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(state, null, 2));
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('Error saving state:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-tournament-state', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const fileData = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: JSON.parse(fileData) };
  } catch (error) {
    console.error('Error loading state:', error);
    return { success: false, error: String(error) };
  }
});
