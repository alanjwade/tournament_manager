import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { HistoryStore } from './history/store';
import type { OperationHint } from '../shared/history';

let mainWindow: BrowserWindow | null = null;
let historyStore: HistoryStore | null = null;

/**
 * Load the renderer into `win`, retrying until the bundle is available.
 *
 * `npm run dev` starts the Vite watcher and Electron in parallel, and Vite
 * empties `dist/renderer` at the start of every build. The previous
 * `index.html` can therefore be missing (or deleted mid-load) when Electron
 * asks for it, which fails with ERR_FILE_NOT_FOUND and leaves a blank window.
 * Waiting/retrying makes startup independent of which process wins the race.
 */
async function loadRenderer(win: BrowserWindow) {
  if (process.env.NODE_ENV === 'development') {
    await win.loadURL('http://localhost:5173');
    return;
  }

  const rendererFile = path.join(__dirname, '../../renderer/index.html');
  const retryDelayMs = 500;
  const maxAttempts = 60; // ~30 seconds

  for (let attempt = 1; attempt <= maxAttempts && !win.isDestroyed(); attempt++) {
    if (fs.existsSync(rendererFile)) {
      try {
        await win.loadFile(rendererFile);
        return;
      } catch (error) {
        console.error(`Failed to load renderer (attempt ${attempt}/${maxAttempts}):`, error);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  if (!win.isDestroyed()) {
    console.error(`Renderer still unavailable after ${maxAttempts} attempts: ${rendererFile}`);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Don't show until the renderer has loaded
  });
  mainWindow = win;

  let rendererLoaded = false;

  // Show only once the renderer has both loaded and painted. Guarding on
  // `rendererLoaded` prevents a failed load from showing an empty window.
  const showWhenReady = () => {
    if (!rendererLoaded || win.isDestroyed()) return;
    win.removeListener('ready-to-show', showWhenReady);
    win.maximize();
    win.show();
  };
  win.on('ready-to-show', showWhenReady);

  loadRenderer(win)
    .then(() => {
      rendererLoaded = true;
      showWhenReady();
    })
    .catch((error) => {
      console.error('Failed to load renderer:', error);
      // Show the window anyway so the failure is at least visible.
      if (!win.isDestroyed()) {
        win.show();
      }
    });

  win.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // Initialize the git-like history store (commit journal + snapshots).
  try {
    historyStore = new HistoryStore(getDataPath());
    historyStore.init();
    // First run: import legacy scheduled backups + checkpoints as the initial chain.
    const imported = historyStore.seedFromLegacy();
    if (imported > 0) {
      console.log(`[history] Imported ${imported} legacy snapshot(s) into history.`);
    }
    historyStore.pruneOrphanSnapshots();
  } catch (error) {
    console.error('Failed to initialize history store:', error);
    historyStore = null;
  }

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
// Use the standard userData directory for installed apps
function getDataPath(): string {
  // Use userData directory (on Windows: %APPDATA%/TournamentManager)
  return app.getPath('userData');
}

/**
 * Write a file atomically: write to a temporary sibling and then rename it over
 * the destination. rename() is atomic on the same volume, so a crash or power
 * loss mid-write can never leave a truncated/corrupt file behind (which would
 * otherwise silently discard the whole tournament on the next load).
 */
function writeFileAtomic(filePath: string, data: string): void {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, data, 'utf8');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // ignore cleanup failure
    }
    throw error;
  }
}

ipcMain.handle('save-autosave', async (event, payload: string | { data: string; hint?: OperationHint }) => {
  try {
    const dataPath = getDataPath();

    // Ensure directory exists before writing
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
      console.log('Created data directory:', dataPath);
    }

    const autosavePath = path.join(dataPath, 'tournament-autosave.json');
    // Support both the legacy string payload and the new { data, hint } payload.
    const raw = typeof payload === 'string' ? payload : payload?.data;
    const hint = typeof payload === 'string' ? undefined : payload?.hint;

    if (historyStore) {
      // Recording the commit also writes the head state atomically.
      const state = JSON.parse(raw);
      historyStore.commit(state, { operationHint: hint });
    } else {
      writeFileAtomic(autosavePath, raw);
    }

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

ipcMain.handle('save-pdf', async (event, pdfData: { fileName: string; data: Uint8Array; outputDirectory?: string }) => {
  if (!mainWindow) {
    throw new Error('Main window not available');
  }
  
  // Determine output directory
  let outputDir = pdfData.outputDirectory;
  
  // If no outputDirectory provided, use default pdf_outputs folder (sibling to backups)
  if (!outputDir) {
    const dataPath = getDataPath();
    outputDir = path.join(dataPath, 'pdf_outputs');
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

// Silent print ("Print Now"): print an HTML document (containing images only)
// to the default/last-used printer without showing the print dialog.
//
// The renderer rasterizes each PDF page to an image with pdfjs-dist and sends
// a self-contained HTML page of those images. Printing plain HTML is reliable
// in silent mode — unlike silently printing a PDF through Chromium's built-in
// PDF viewer, which frequently produces a solid black page. Because the HTML
// references no external resources, we can load it from a data URL in a hidden
// window and print without any visible window or dialogs.
ipcMain.handle('print-html', async (_event, html: string) => {
  let win: BrowserWindow | null = null;

  try {
    win = new BrowserWindow({
      show: false,
      width: 612,
      height: 792,
      webPreferences: {
        sandbox: true,
      },
    });

    if (html.startsWith('data:')) {
      await win.loadURL(html);
    } else {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    }

    // Wait for the (inline) images to finish decoding so they are definitely
    // available to the print capture.
    await win.webContents.executeJavaScript(
      `new Promise((resolve) => {
        const imgs = Array.from(document.images);
        if (imgs.length === 0) return resolve(true);
        let pending = imgs.length;
        const done = () => { if (--pending === 0) resolve(true); };
        imgs.forEach((img) => {
          if (img.complete && img.naturalWidth > 0) return done();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })`
    );

    return await new Promise<{ success: boolean; error?: string }>((resolve) => {
      win!.webContents.print(
        { silent: true, printBackground: true },
        (success, failureReason) => {
          resolve(
            success
              ? { success: true }
              : { success: false, error: failureReason || 'Unknown print error' }
          );
        }
      );
    });
  } catch (error) {
    console.error('Error printing HTML:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    if (win) {
      win.destroy();
      win = null;
    }
  }
});


ipcMain.handle('get-file-locations', async () => {
  const dataPath = getDataPath();
  const autosavePath = path.join(dataPath, 'tournament-autosave.json');
  
  // PDF output directory is a sibling to backups, not next to exe
  const defaultPdfOutputDir = path.join(dataPath, 'pdf_outputs');
  
  // Get executable path
  const exePath = process.env.NODE_ENV === 'development'
    ? app.getAppPath()
    : app.getPath('exe');
  
  return {
    dataPath,
    autosavePath,
    defaultPdfOutputDir,
    exePath
  };
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

ipcMain.handle('open-directory', async (event, directoryPath: string) => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    await shell.openPath(directoryPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening directory:', error);
    return { success: false, error: String(error) };
  }
});

// One-way handler (paired with ipcRenderer.send in the preload): there is no
// reply channel, so the intermittent Electron "reply was never sent" error
// (triggered when an invoke reply channel is garbage-collected before the async
// handler replies) cannot happen here. Any OS error is logged instead.
ipcMain.on('open-pdf-folder', (_event, directoryPath: string) => {
  try {
    if (!directoryPath) {
      console.error('Error opening PDF folder: no directory path provided');
      return;
    }
    // Ensure directory exists
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    // Fire-and-forget: launching the OS file manager can take a moment, so we
    // do not block on it. shell.openPath resolves with an error string on
    // failure (it does not reject).
    void shell
      .openPath(directoryPath)
      .then((errorMessage) => {
        if (errorMessage) {
          console.error('Error opening PDF folder:', errorMessage);
        }
      })
      .catch((error) => {
        console.error('Error opening PDF folder:', error);
      });
  } catch (error) {
    console.error('Error opening PDF folder:', error);
  }
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
    writeFileAtomic(result.filePath, JSON.stringify(state, null, 2));
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

// History (git-like commit journal) handlers
ipcMain.handle('history-log', async () => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable', data: [] };
  }
  try {
    return {
      success: true,
      data: historyStore.listCommits(),
      headId: historyStore.getHeadId(),
    };
  } catch (error) {
    console.error('Error reading history log:', error);
    return { success: false, error: String(error), data: [] };
  }
});

ipcMain.handle('history-show', async (event, commitId: string) => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable' };
  }
  try {
    return { success: true, data: historyStore.resolveState(commitId) };
  } catch (error) {
    console.error('Error resolving commit:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('history-checkout', async (event, commitId: string) => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable' };
  }
  try {
    const state = historyStore.checkout(commitId);
    if (!state) return { success: false, error: 'Commit not found' };
    return { success: true, data: state };
  } catch (error) {
    console.error('Error checking out commit:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('history-tags', async () => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable', data: [] };
  }
  return { success: true, data: historyStore.listTags() };
});

ipcMain.handle('history-add-tag', async (event, payload: { name: string; commitId: string }) => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable' };
  }
  try {
    return { success: true, data: historyStore.addTag(payload.name, payload.commitId) };
  } catch (error) {
    console.error('Error adding history tag:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('history-remove-tag', async (event, tagId: string) => {
  if (!historyStore) {
    return { success: false, error: 'History store unavailable' };
  }
  try {
    historyStore.removeTag(tagId);
    return { success: true };
  } catch (error) {
    console.error('Error removing history tag:', error);
    return { success: false, error: String(error) };
  }
});

// Version and Update handlers
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  return new Promise((resolve) => {
    const currentVersion = app.getVersion();
    const options = {
      hostname: 'api.github.com',
      path: '/repos/alanjwade/tournament_manager/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'TournamentManager'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name.replace('v', '');
          const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
          
          resolve({
            success: true,
            currentVersion,
            latestVersion,
            updateAvailable,
            downloadUrl: release.html_url
          });
        } catch (error) {
          resolve({
            success: false,
            error: 'Failed to parse release data',
            currentVersion
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        currentVersion
      });
    });
  });
});

ipcMain.handle('open-download-page', async () => {
  await shell.openExternal('https://github.com/alanjwade/tournament_manager/releases/latest');
  return { success: true };
});

// Helper function to compare version strings
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// Create application menu
function createMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Initial Excel File…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-import-excel');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Database…',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-export-database');
          }
        },
        {
          label: 'Import Database…',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            mainWindow?.webContents.send('menu-import-database');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Overview',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help', 'overview');
            }
          }
        },
        {
          label: 'Pre-Tournament Guide',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help', 'pre-tournament');
            }
          }
        },
        {
          label: 'Tournament Day Guide',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help', 'tournament-day');
            }
          }
        },
        {
          label: 'Quick Reference',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help', 'quick-reference');
            }
          }
        },
        {
          label: 'Day-Of Scenarios',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-help', 'day-of-reference');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About TournamentManager',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about-dialog');
            }
          }
        },
        {
          label: 'Check for Updates...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('check-for-updates');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/alanjwade/tournament_manager');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
