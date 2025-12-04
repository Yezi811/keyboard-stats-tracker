const { ipcRenderer } = require('electron');

/**
 * Preload script for IPC communication
 * Exposes API to the renderer process
 * 
 * Note: contextIsolation is disabled for simplicity
 */

// Expose electronAPI on window object
(window as any).electronAPI = {
  /**
   * Get statistics for a specific period and date
   */
  getStats: (period: 'day' | 'month' | 'year', date: Date) => {
    // Validate inputs
    if (!['day', 'month', 'year'].includes(period)) {
      throw new Error('Invalid period');
    }
    if (!(date instanceof Date) && typeof date !== 'string') {
      throw new Error('Invalid date');
    }
    return ipcRenderer.invoke('get-stats', period, date);
  },

  /**
   * Export data in the specified format
   */
  exportData: (format: 'json' | 'csv', period: 'day' | 'month' | 'year', date: Date) => {
    // Validate inputs
    if (!['json', 'csv'].includes(format)) {
      throw new Error('Invalid format');
    }
    if (!['day', 'month', 'year'].includes(period)) {
      throw new Error('Invalid period');
    }
    if (!(date instanceof Date) && typeof date !== 'string') {
      throw new Error('Invalid date');
    }
    return ipcRenderer.invoke('export-data', format, period, date);
  },

  /**
   * Reset all statistics data
   */
  resetData: () => {
    return ipcRenderer.invoke('reset-data');
  },

  /**
   * Get list of available backups
   */
  getBackups: () => {
    return ipcRenderer.invoke('get-backups');
  },

  /**
   * Restore data from a backup
   */
  restoreData: (backupPath: string) => {
    // Validate input
    if (typeof backupPath !== 'string' || backupPath.length === 0) {
      throw new Error('Invalid backup path');
    }
    return ipcRenderer.invoke('restore-data', backupPath);
  },

  /**
   * Clear statistics cache
   */
  clearCache: () => {
    return ipcRenderer.invoke('clear-cache');
  },

  /**
   * Listen for data update notifications
   */
  onDataUpdated: (callback: () => void) => {
    ipcRenderer.on('data-updated', callback);
  },

  /**
   * Remove data update listener
   */
  removeDataUpdatedListener: (callback: () => void) => {
    ipcRenderer.removeListener('data-updated', callback);
  }
};
