import { app, BrowserWindow, ipcMain, dialog, systemPreferences, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { KeystrokeService } from '../infrastructure/KeystrokeService';
import { KeystrokeRepository } from '../infrastructure/KeystrokeRepository';
import { StatisticsService } from '../domain/services';
import { ExportService } from '../infrastructure/ExportService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let keystrokeService: KeystrokeService | null = null;
let repository: KeystrokeRepository | null = null;
let statisticsService: StatisticsService | null = null;
let exportService: ExportService | null = null;
let isQuitting = false;

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // This is the first instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    console.log('Second instance detected, focusing existing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });
}

/**
 * Create the main application window
 */
function createWindow(): void {
  // Load window icon
  let windowIcon: Electron.NativeImage | undefined;
  try {
    // In production (packaged), use process.resourcesPath
    // In development, use relative path from __dirname
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'build', 'tray-icon.ico')
      : path.join(__dirname, '../../build/tray-icon.ico');
    
    if (require('fs').existsSync(iconPath)) {
      windowIcon = nativeImage.createFromPath(iconPath);
      console.log('Loaded window icon from:', iconPath);
    } else {
      console.log('Window icon file not found at:', iconPath);
      console.log('app.isPackaged:', app.isPackaged);
      console.log('process.resourcesPath:', process.resourcesPath);
      console.log('__dirname:', __dirname);
    }
  } catch (error) {
    console.error('Error loading window icon:', error);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '键盘统计追踪器',
    icon: windowIcon, // Set window icon explicitly
    webPreferences: {
      preload: path.join(__dirname, '../main/preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  // Load the renderer HTML
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(htmlPath).catch(error => {
    console.error('Failed to load renderer HTML:', error);
    dialog.showErrorBox('启动错误', '无法加载应用界面，请重新启动应用。');
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle minimize to tray
  mainWindow.on('minimize', (event: any) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create a simple tray icon programmatically
 */
function createSimpleTrayIcon(): Electron.NativeImage {
  // Simple 16x16 keyboard icon in base64
  const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE5SURBVDiNpZMxTsNAEEXfbGzHJoQiUqQgJaJBokGiQaLhAFyAK3AFjsAVuAJH4AYcgQNQUFBQIAoKCgoKRBHZTmzP0mzWG0dJgZBGWu3O7Mz/M/+PBfxTSiml/osUwBhjjDFSSqWUUv8ElFJKKaWUUsYYo5RS6q+EUkqp/yKllDLGKGOMUkr9FSml lFJKKWOMUsYYpZT6K1JKKaWUUsYYpYwxSin1V6SUUkop5YwxyhhllFL/RUopJZRSzhijjDFKKfVXpJRSQinljDHKGKOUUv9FSikllFLOGKOMMUop9V+klFJCKeWMMcoYo5RS/0VKKSWUUs4Yo4wxSin1V6SUUkIp5YwxyhhllFL/RUopJZRSzhijjDFKKfVXpJRSQinljDHKGKOUUv9FSikllFLOGKOMMUop9VeklFJCKeWMMcoYo5RS/0VKKSWUUs4Yo4wxSin1X/QJVHunVbR3YSQAAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(iconData);
}

/**
 * Create system tray icon
 */
function createTray(): void {
  // Try to load icon from assets folder, fallback to a simple generated icon
  let icon: Electron.NativeImage;
  
  try {
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    if (require('fs').existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
      console.log('Loaded tray icon from:', iconPath);
    } else {
      // Fallback: create a simple icon with text
      icon = createSimpleTrayIcon();
      console.log('Using generated tray icon (icon file not found)');
    }
  } catch (error) {
    console.error('Error loading tray icon:', error);
    icon = createSimpleTrayIcon();
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked
        });
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('键盘统计追踪器');
  tray.setContextMenu(contextMenu);

  // Double click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

/**
 * Check and request keyboard listening permissions (macOS specific)
 */
async function checkPermissions(): Promise<boolean> {
  if (process.platform === 'darwin') {
    // On macOS, check for accessibility permissions
    const status = systemPreferences.isTrustedAccessibilityClient(false);
    
    if (!status) {
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: '需要辅助功能权限',
        message: '键盘统计追踪器需要辅助功能权限才能监听键盘输入。',
        detail: '请在系统偏好设置 > 安全性与隐私 > 隐私 > 辅助功能中授予权限，然后重启应用。',
        buttons: ['打开系统偏好设置', '退出'],
        defaultId: 0,
        cancelId: 1
      });

      if (result.response === 0) {
        // Prompt for permission
        systemPreferences.isTrustedAccessibilityClient(true);
      }
      
      return false;
    }
  }
  
  return true;
}

/**
 * Initialize the keystroke service and related services
 */
async function initializeKeystrokeService(): Promise<void> {
  try {
    // Check permissions first
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      throw new Error('Insufficient permissions for keyboard listening');
    }

    // Create repository with database path in user data directory
    const dbPath = path.join(app.getPath('userData'), 'keystrokes.db');
    console.log('Initializing database at:', dbPath);
    repository = new KeystrokeRepository(dbPath);

    // Initialize statistics and export services first
    statisticsService = new StatisticsService(repository);
    exportService = new ExportService();

    // Create and start the keystroke service
    keystrokeService = new KeystrokeService(repository);
    
    // Set up data update callback to notify renderer
    keystrokeService.setDataUpdateCallback(() => {
      // Clear statistics cache to ensure fresh data
      if (statisticsService) {
        statisticsService.clearCache();
        console.log('Statistics cache cleared');
      }
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Notifying renderer of data update');
        mainWindow.webContents.send('data-updated');
      }
    });
    
    await keystrokeService.start();

    console.log('Keystroke service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize keystroke service:', error);
    
    // Show error dialog to user
    dialog.showErrorBox(
      '初始化错误',
      '无法启动键盘监听服务。请确保应用有足够的权限访问键盘输入。\n\n错误详情: ' + (error instanceof Error ? error.message : String(error))
    );
    
    throw error;
  }
}

/**
 * Cleanup function to ensure buffer is flushed before app closes
 */
async function cleanup(): Promise<void> {
  if (keystrokeService) {
    try {
      console.log('Stopping keystroke service and flushing buffer...');
      await keystrokeService.stop();
      console.log('Keystroke service stopped successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// IPC Handlers

/**
 * Handle get-stats IPC call
 */
ipcMain.handle('get-stats', async (_event, period: 'day' | 'month' | 'year', date: Date | string) => {
  if (!statisticsService) {
    throw new Error('Statistics service not initialized');
  }

  try {
    // Handle both Date objects and date strings
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (period === 'day') {
      return await statisticsService.getDailyStats(dateObj);
    } else if (period === 'month') {
      return await statisticsService.getMonthlyStats(dateObj.getFullYear(), dateObj.getMonth() + 1);
    } else {
      return await statisticsService.getYearlyStats(dateObj.getFullYear());
    }
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
});

/**
 * Handle clear-cache IPC call
 */
ipcMain.handle('clear-cache', async () => {
  if (!statisticsService) {
    throw new Error('Statistics service not initialized');
  }

  try {
    statisticsService.clearCache();
    return { success: true };
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
});

/**
 * Handle export-data IPC call
 */
ipcMain.handle('export-data', async (_event, format: 'json' | 'csv', period: 'day' | 'month' | 'year', date: Date | string) => {
  if (!statisticsService || !exportService) {
    throw new Error('Services not initialized');
  }

  try {
    // Handle both Date objects and date strings
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Get statistics data instead of raw keystrokes
    let stats;
    if (period === 'day') {
      stats = await statisticsService.getDailyStats(dateObj);
    } else if (period === 'month') {
      stats = await statisticsService.getMonthlyStats(dateObj.getFullYear(), dateObj.getMonth() + 1);
    } else {
      stats = await statisticsService.getYearlyStats(dateObj.getFullYear());
    }

    // Convert stats to exportable format (key breakdown with counts)
    const exportData = stats.keyBreakdown.map(item => ({
      keyName: item.keyName,
      count: item.count,
      percentage: ((item.count / stats.totalKeystrokes) * 100).toFixed(2) + '%'
    }));

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出数据',
      defaultPath: path.join(app.getPath('downloads'), `keystroke-stats-${period}-${dateObj.toISOString().split('T')[0]}.${format}`),
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (result.canceled || !result.filePath) {
      throw new Error('Export canceled');
    }

    // Export statistics data
    if (format === 'json') {
      await exportService.exportToJSON(exportData, result.filePath);
    } else {
      await exportService.exportToCSV(exportData, result.filePath);
    }

    return result.filePath;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
});

/**
 * Handle reset-data IPC call
 */
ipcMain.handle('reset-data', async () => {
  if (!repository) {
    throw new Error('Repository not initialized');
  }

  try {
    // Create backup before clearing (Requirement 10.3)
    const backupPath = await repository.backup();
    console.log('Backup created at:', backupPath);

    // Clear all data (Requirement 10.2)
    await repository.clear();

    return backupPath;
  } catch (error) {
    console.error('Error resetting data:', error);
    throw error;
  }
});

/**
 * Handle get-backups IPC call
 */
ipcMain.handle('get-backups', async () => {
  if (!repository) {
    throw new Error('Repository not initialized');
  }

  try {
    const backups = await repository.getBackups();
    return backups;
  } catch (error) {
    console.error('Error getting backups:', error);
    throw error;
  }
});

/**
 * Handle restore-data IPC call
 */
ipcMain.handle('restore-data', async (_event, backupPath: string) => {
  if (!repository) {
    throw new Error('Repository not initialized');
  }

  try {
    // Restore from backup (Requirement 10.5)
    await repository.restore(backupPath);
    console.log('Data restored from:', backupPath);

    return;
  } catch (error) {
    console.error('Error restoring data:', error);
    throw error;
  }
});

// App lifecycle events

app.on('ready', async () => {
  try {
    // Set Content Security Policy
    const { session } = require('electron');
    session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
          ]
        }
      });
    });

    await initializeKeystrokeService();
    createWindow();
    createTray();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep running in tray
  // User must explicitly quit from tray menu
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// Ensure cleanup happens before app quits
app.on('before-quit', async (event) => {
  if (keystrokeService && !isQuitting) {
    event.preventDefault();
    isQuitting = true;
    await cleanup();
    keystrokeService = null;
    app.quit();
  }
});

// Handle unexpected exits
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});
