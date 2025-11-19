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

// Autosave handlers
ipcMain.handle('save-autosave', async (event, data: string) => {
  try {
    const autosavePath = path.join(app.getPath('userData'), 'tournament-autosave.json');
    fs.writeFileSync(autosavePath, data, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving autosave:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-autosave', async () => {
  try {
    const autosavePath = path.join(app.getPath('userData'), 'tournament-autosave.json');
    if (fs.existsSync(autosavePath)) {
      const data = fs.readFileSync(autosavePath, 'utf8');
      return { success: true, data };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error loading autosave:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('save-pdf', async (event, pdfData: { fileName: string; data: Uint8Array; outputDirectory?: string }) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  
  // If outputDirectory is provided, save directly without dialog
  if (pdfData.outputDirectory) {
    const filePath = path.join(pdfData.outputDirectory, pdfData.fileName);
    
    try {
      // Ensure the directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file directly, overwriting if exists
      fs.writeFileSync(filePath, Buffer.from(pdfData.data));
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Error saving PDF:', error);
      return { success: false, error: String(error) };
    }
  }
  
  // If no outputDirectory, show save dialog (fallback)
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
    // Ensure the directory exists
    const dir = path.dirname(result.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
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

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
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

// Checkpoint handlers
ipcMain.handle('save-checkpoint', async (event, checkpoint: any) => {
  try {
    const checkpointsDir = path.join(app.getPath('userData'), 'checkpoints');
    
    // Create checkpoints directory if it doesn't exist
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }
    
    const filePath = path.join(checkpointsDir, `${checkpoint.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf8');
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving checkpoint:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-checkpoints', async () => {
  try {
    const checkpointsDir = path.join(app.getPath('userData'), 'checkpoints');
    
    // Return empty array if checkpoints directory doesn't exist
    if (!fs.existsSync(checkpointsDir)) {
      return { success: true, data: [] };
    }
    
    const files = fs.readdirSync(checkpointsDir);
    const checkpoints = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(checkpointsDir, file);
          const fileData = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(fileData);
        } catch (error) {
          console.error(`Error reading checkpoint file ${file}:`, error);
          return null;
        }
      })
      .filter(checkpoint => checkpoint !== null);
    
    return { success: true, data: checkpoints };
  } catch (error) {
    console.error('Error loading checkpoints:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('delete-checkpoint', async (event, checkpointId: string) => {
  try {
    const checkpointsDir = path.join(app.getPath('userData'), 'checkpoints');
    const filePath = path.join(checkpointsDir, `${checkpointId}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return { success: false, error: String(error) };
  }
});
