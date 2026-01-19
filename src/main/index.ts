import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let backupInterval: NodeJS.Timeout | null = null;

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

  // Start periodic backups while the app is running
  startBackupScheduler();

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

app.on('before-quit', () => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
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
// For portable builds, prefer saving in the app directory if possible
function getDataPath(): string {
  // PRIMARY: Check for PORTABLE_EXECUTABLE_DIR env var (set by electron-builder portable)
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const dataDir = path.join(portableDir, 'tournament-data');
    
    // Create directory if it doesn't exist
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    } catch (error) {
      console.error('Error creating portable data directory:', error);
    }
  }
  
  // FALLBACK: Check if "portable" is in the exe name or path
  const exePath = app.getPath('exe');
  const lowerExePath = exePath.toLowerCase();
  if (lowerExePath.includes('portable') && app.isPackaged) {
    const appDir = path.dirname(exePath);
    const dataDir = path.join(appDir, 'tournament-data');
    
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    } catch (error) {
      console.error('Error creating fallback portable directory:', error);
    }
  }
  
  // DEFAULT: use userData directory
  return app.getPath('userData');
}

function getAppBasePath(): string {
  return process.env.NODE_ENV === 'development'
    ? app.getAppPath()
    : path.dirname(app.getPath('exe'));
}

function getBackupDir(): string {
  const basePath = getAppBasePath();
  return path.join(basePath, 'backups');
}

function formatBackupTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function cleanupOldBackups(backupDir: string) {
  if (!fs.existsSync(backupDir)) {
    return;
  }

  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fullPath = path.join(backupDir, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) {
    return;
  }

  const recent = files.filter((entry) => entry.mtimeMs >= cutoff);
  const old = files.filter((entry) => entry.mtimeMs < cutoff);

  if (recent.length > 0) {
    old.forEach((entry) => fs.unlinkSync(entry.fullPath));
    return;
  }

  // All backups are older than cutoff; keep the newest one
  const [newest, ...rest] = files;
  rest.forEach((entry) => fs.unlinkSync(entry.fullPath));
}

function runBackupJob() {
  try {
    const dataPath = getDataPath();
    const autosavePath = path.join(dataPath, 'tournament-autosave.json');
    if (!fs.existsSync(autosavePath)) {
      return;
    }

    const backupDir = getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = formatBackupTimestamp(new Date());
    const backupFileName = `backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);
    fs.copyFileSync(autosavePath, backupPath);

    cleanupOldBackups(backupDir);
  } catch (error) {
    console.error('Error running backup job:', error);
  }
}

function startBackupScheduler() {
  runBackupJob();
  const intervalMs = 20 * 60 * 1000;
  backupInterval = setInterval(runBackupJob, intervalMs);
}

ipcMain.handle('save-autosave', async (event, data: string) => {
  try {
    const dataPath = getDataPath();
    
    // Ensure directory exists before writing
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
      console.log('Created data directory:', dataPath);
    }
    
    const autosavePath = path.join(dataPath, 'tournament-autosave.json');
    fs.writeFileSync(autosavePath, data, 'utf8');
    console.log('Saved tournament data to:', autosavePath);
    return { success: true, path: autosavePath };
  } catch (error) {
    console.error('Error saving autosave:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-autosave', async () => {
  try {
    const dataPath = getDataPath();
    const autosavePath = path.join(dataPath, 'tournament-autosave.json');
    console.log('Loading tournament data from:', autosavePath);
    
    if (fs.existsSync(autosavePath)) {
      const data = fs.readFileSync(autosavePath, 'utf8');
      console.log('Autosave file loaded successfully');
      return { success: true, data, path: autosavePath };
    }
    console.log('No autosave file found at:', autosavePath);
    return { success: true, data: null, path: autosavePath };
  } catch (error) {
    console.error('Error loading autosave:', error);
    return { success: false, error: String(error), path: 'unknown' };
  }
});

ipcMain.handle('list-backups', async () => {
  try {
    const backupDir = getBackupDir();
    if (!fs.existsSync(backupDir)) {
      return { success: true, data: [] };
    }

    const files = fs.readdirSync(backupDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const fullPath = path.join(backupDir, file);
        const stat = fs.statSync(fullPath);
        return { fileName: file, path: fullPath, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    return { success: true, data: files };
  } catch (error) {
    console.error('Error listing backups:', error);
    return { success: false, error: String(error), data: [] };
  }
});

ipcMain.handle('load-backup', async (event, fileName: string) => {
  try {
    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, fileName);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Backup file not found' };
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data), path: filePath };
  } catch (error) {
    console.error('Error loading backup:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('save-pdf', async (event, pdfData: { fileName: string; data: Uint8Array; outputDirectory?: string }) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  
  // Determine output directory
  let outputDir = pdfData.outputDirectory;
  
  // If no outputDirectory provided, use default pdf_outputs folder next to exe
  if (!outputDir) {
    // Get the directory where the app is running from
    // In production, this is the directory containing the .exe on Windows
    // In development, this is the project root
    const appPath = process.env.NODE_ENV === 'development' 
      ? app.getAppPath() 
      : path.dirname(app.getPath('exe'));
    
    outputDir = path.join(appPath, 'pdf_outputs');
  }
  
  const filePath = path.join(outputDir, pdfData.fileName);
  
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
