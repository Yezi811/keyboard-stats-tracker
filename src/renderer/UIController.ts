import { DailyStats, MonthlyStats, YearlyStats } from '../domain/models';
import { ChartRenderer } from './ChartRenderer';

/**
 * UIController manages the user interface and coordinates between
 * user interactions and data display.
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */
export class UIController {
  private chartRenderer: ChartRenderer | null = null;
  private currentPeriod: 'day' | 'month' | 'year' = 'day';
  private currentDate: Date = new Date();
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 1000; // 1 second for real-time data updates
  private lastTotalKeystrokes: number = 0; // Track last known total to detect changes
  private lastStatsSnapshot: string = ''; // JSON snapshot of last stats for comparison
  private currentStats: DailyStats | MonthlyStats | YearlyStats | null = null; // Cache current stats

  // DOM elements
  private periodSelect!: HTMLSelectElement;
  private datePicker!: HTMLInputElement;
  private exportJsonBtn!: HTMLButtonElement;
  private exportCsvBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private restoreBtn!: HTMLButtonElement;
  private refreshChartBtn!: HTMLButtonElement;
  private loadingIndicator!: HTMLElement;
  private chartCanvas!: HTMLCanvasElement;
  private statsTableBody!: HTMLTableSectionElement;
  private totalKeystrokesEl!: HTMLElement;
  private keySearchInput!: HTMLInputElement;
  private searchConfirmBtn!: HTMLButtonElement;
  private searchResetBtn!: HTMLButtonElement;
  private currentSearchTerm: string = ''; // Store current search term

  /**
   * Initialize the UI controller and set up event listeners
   * Requirements: 8.1
   */
  initialize(): void {
    // Get DOM elements
    this.periodSelect = document.getElementById('period-select') as HTMLSelectElement;
    this.datePicker = document.getElementById('date-picker') as HTMLInputElement;
    this.exportJsonBtn = document.getElementById('export-json-btn') as HTMLButtonElement;
    this.exportCsvBtn = document.getElementById('export-csv-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement;
    this.refreshChartBtn = document.getElementById('refresh-chart-btn') as HTMLButtonElement;
    this.loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    this.chartCanvas = document.getElementById('stats-chart') as HTMLCanvasElement;
    this.statsTableBody = document.getElementById('stats-table-body') as HTMLTableSectionElement;
    this.totalKeystrokesEl = document.getElementById('total-keystrokes') as HTMLElement;
    this.keySearchInput = document.getElementById('key-search') as HTMLInputElement;
    this.searchConfirmBtn = document.getElementById('search-confirm-btn') as HTMLButtonElement;
    this.searchResetBtn = document.getElementById('search-reset-btn') as HTMLButtonElement;

    // Set initial date picker value to today
    this.datePicker.valueAsDate = this.currentDate;

    // Set up event listeners
    this.periodSelect.addEventListener('change', () => {
      this.currentPeriod = this.periodSelect.value as 'day' | 'month' | 'year';
      this.onPeriodChange(this.currentPeriod, this.currentDate);
    });

    this.datePicker.addEventListener('change', () => {
      this.currentDate = this.datePicker.valueAsDate || new Date();
      this.onPeriodChange(this.currentPeriod, this.currentDate);
    });

    this.exportJsonBtn.addEventListener('click', () => {
      this.onExportRequest('json');
    });

    this.exportCsvBtn.addEventListener('click', () => {
      this.onExportRequest('csv');
    });

    this.resetBtn.addEventListener('click', () => {
      this.onResetRequest();
    });

    this.restoreBtn.addEventListener('click', () => {
      this.onRestoreRequest();
    });

    this.refreshChartBtn.addEventListener('click', () => {
      this.onRefreshChartRequest();
    });

    // Set up search functionality
    this.searchConfirmBtn.addEventListener('click', () => {
      this.performSearch();
    });

    this.searchResetBtn.addEventListener('click', () => {
      this.resetSearch();
    });

    // Allow Enter key to trigger search
    this.keySearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Initialize chart renderer
    this.chartRenderer = new ChartRenderer();

    // Load initial data
    this.onPeriodChange(this.currentPeriod, this.currentDate);

    // Set up real-time data update listener
    this.setupDataUpdateListener();

    // Start auto-refresh as backup
    this.startAutoRefresh();
  }

  /**
   * Set up listener for real-time data updates from main process
   */
  private setupDataUpdateListener(): void {
    if (window.electronAPI && window.electronAPI.onDataUpdated) {
      window.electronAPI.onDataUpdated(() => {
        console.log('Received data update notification');
        this.refreshDataImmediately();
      });
    }
  }

  /**
   * Immediately refresh data without checking for changes
   */
  private async refreshDataImmediately(): Promise<void> {
    if (!window.electronAPI) {
      return;
    }

    try {
      const stats = await window.electronAPI.getStats(this.currentPeriod, this.currentDate);
      
      // Check if data actually changed
      if (stats.totalKeystrokes !== this.lastTotalKeystrokes) {
        console.log(`Real-time update: ${this.lastTotalKeystrokes} -> ${stats.totalKeystrokes}`);
        this.lastTotalKeystrokes = stats.totalKeystrokes;
        this.currentStats = stats;
        this.updateDataOnly(stats);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  /**
   * Start automatic data refresh
   */
  private startAutoRefresh(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Set up new interval - only refresh if data changed
    this.refreshInterval = setInterval(async () => {
      console.log('Checking for data changes...');
      await this.refreshIfDataChanged();
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Stop automatic data refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh data only (total and table) without updating chart
   */
  private async refreshIfDataChanged(): Promise<void> {
    if (!window.electronAPI) {
      return;
    }

    try {
      // Get current stats without updating UI yet
      const stats = await window.electronAPI.getStats(this.currentPeriod, this.currentDate);
      
      // Check if total keystrokes changed
      if (stats.totalKeystrokes !== this.lastTotalKeystrokes) {
        console.log(`Data changed: ${this.lastTotalKeystrokes} -> ${stats.totalKeystrokes}`);
        this.lastTotalKeystrokes = stats.totalKeystrokes;
        this.currentStats = stats; // Cache the stats
        
        // Update only total and table, NOT the chart
        this.updateDataOnly(stats);
      } else {
        console.log('No data changes detected');
      }
    } catch (error) {
      console.error('Failed to check for data changes:', error);
    }
  }

  /**
   * Update only the data display (total and table), not the chart
   */
  private updateDataOnly(stats: DailyStats | MonthlyStats | YearlyStats): void {
    // Update total keystrokes
    this.totalKeystrokesEl.textContent = stats.totalKeystrokes.toString();

    // Update table
    this.updateTable(stats.keyBreakdown, stats.totalKeystrokes);
  }

  /**
   * Handle manual chart refresh request
   */
  private onRefreshChartRequest(): void {
    if (this.currentStats) {
      console.log('Manually refreshing chart...');
      this.updateChart(this.currentStats);
    }
  }

  /**
   * Handle period change events
   * Requirements: 8.2
   */
  onPeriodChange(period: 'day' | 'month' | 'year', date: Date): void {
    console.log('onPeriodChange called:', { period, date: date.toISOString() });
    this.showLoading();

    // Request data from main process via IPC
    if (window.electronAPI) {
      console.log('Requesting stats from main process...');
      window.electronAPI.getStats(period, date)
        .then((stats: DailyStats | MonthlyStats | YearlyStats) => {
          console.log('Received stats:', stats);
          this.updateDisplay(stats);
          this.hideLoading();
        })
        .catch((error: Error) => {
          console.error('Failed to get stats:', error);
          this.hideLoading();
          alert('获取统计数据失败: ' + error.message);
        });
    } else {
      console.error('window.electronAPI is not available!');
      this.hideLoading();
    }
  }

  /**
   * Handle export requests
   * Requirements: 8.3
   */
  onExportRequest(format: 'json' | 'csv'): void {
    this.showLoading();

    if (window.electronAPI) {
      window.electronAPI.exportData(format, this.currentPeriod, this.currentDate)
        .then((filePath: string) => {
          this.hideLoading();
          alert(`数据已导出到: ${filePath}`);
        })
        .catch((error: Error) => {
          console.error('Failed to export data:', error);
          this.hideLoading();
          alert('导出数据失败: ' + error.message);
        });
    }
  }

  /**
   * Handle reset requests
   * Requirements: 8.3, 10.1, 10.2, 10.3
   */
  onResetRequest(): void {
    // Show confirmation dialog (Requirement 10.1)
    const confirmed = confirm(
      '确定要重置所有统计数据吗？\n\n此操作将清除所有历史记录，但会创建备份以便恢复。'
    );

    if (!confirmed) {
      return;
    }

    this.showLoading();

    if (window.electronAPI) {
      window.electronAPI.resetData()
        .then((backupPath: string) => {
          this.hideLoading();
          alert(`数据已重置。备份已创建: ${backupPath}\n\n您可以使用"恢复数据"按钮恢复此备份。`);
          // Refresh display (Requirement 10.4 - show empty statistics)
          this.onPeriodChange(this.currentPeriod, this.currentDate);
        })
        .catch((error: Error) => {
          console.error('Failed to reset data:', error);
          this.hideLoading();
          alert('重置数据失败: ' + error.message);
        });
    }
  }

  /**
   * Handle restore requests
   * Requirements: 10.5
   */
  onRestoreRequest(): void {
    this.showLoading();

    if (window.electronAPI) {
      // First, get list of available backups
      window.electronAPI.getBackups()
        .then((backups: Array<{ backupPath: string; createdAt: number }>) => {
          this.hideLoading();

          if (backups.length === 0) {
            alert('没有可用的备份。');
            return;
          }

          // Show backup selection dialog
          let message = '选择要恢复的备份:\n\n';
          backups.forEach((backup, index) => {
            const date = new Date(backup.createdAt);
            message += `${index + 1}. ${date.toLocaleString('zh-CN')} - ${backup.backupPath}\n`;
          });
          message += '\n请输入备份编号 (1-' + backups.length + '):';

          const selection = prompt(message);
          
          if (!selection) {
            return;
          }

          const index = parseInt(selection) - 1;
          
          if (isNaN(index) || index < 0 || index >= backups.length) {
            alert('无效的备份编号。');
            return;
          }

          const selectedBackup = backups[index];

          // Confirm restore
          const confirmed = confirm(
            `确定要从以下备份恢复数据吗？\n\n` +
            `备份时间: ${new Date(selectedBackup.createdAt).toLocaleString('zh-CN')}\n` +
            `备份路径: ${selectedBackup.backupPath}\n\n` +
            `此操作将覆盖当前所有数据。`
          );

          if (!confirmed) {
            return;
          }

          this.showLoading();

          // Restore from selected backup
          window.electronAPI!.restoreData(selectedBackup.backupPath)
            .then(() => {
              this.hideLoading();
              alert('数据已成功恢复！');
              // Refresh display (Requirement 10.5 - update UI after restore)
              this.onPeriodChange(this.currentPeriod, this.currentDate);
            })
            .catch((error: Error) => {
              console.error('Failed to restore data:', error);
              this.hideLoading();
              alert('恢复数据失败: ' + error.message);
            });
        })
        .catch((error: Error) => {
          console.error('Failed to get backups:', error);
          this.hideLoading();
          alert('获取备份列表失败: ' + error.message);
        });
    }
  }

  /**
   * Update the display with new statistics data (including chart)
   * Requirements: 8.1, 8.2
   */
  updateDisplay(stats: DailyStats | MonthlyStats | YearlyStats): void {
    // Save stats for future use
    this.lastTotalKeystrokes = stats.totalKeystrokes;
    this.currentStats = stats;
    
    // Update total keystrokes
    this.totalKeystrokesEl.textContent = stats.totalKeystrokes.toString();

    // Update table
    this.updateTable(stats.keyBreakdown, stats.totalKeystrokes);

    // Update chart
    this.updateChart(stats);
  }

  /**
   * Update the data table
   */
  private updateTable(keyBreakdown: Array<{ keyName: string; count: number }>, total: number): void {
    // Clear existing rows
    this.statsTableBody.innerHTML = '';

    // Add rows for each key
    keyBreakdown.forEach(stat => {
      const row = document.createElement('tr');
      
      const keyCell = document.createElement('td');
      keyCell.textContent = stat.keyName;
      
      const countCell = document.createElement('td');
      countCell.textContent = stat.count.toString();
      
      const percentCell = document.createElement('td');
      const percent = total > 0 ? ((stat.count / total) * 100).toFixed(2) : '0.00';
      percentCell.textContent = `${percent}%`;
      
      row.appendChild(keyCell);
      row.appendChild(countCell);
      row.appendChild(percentCell);
      
      this.statsTableBody.appendChild(row);
    });

    // Show message if no data
    if (keyBreakdown.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = '暂无数据';
      cell.style.textAlign = 'center';
      cell.style.color = '#999';
      row.appendChild(cell);
      this.statsTableBody.appendChild(row);
    }

    // Re-apply search filter if there's an active search
    if (this.currentSearchTerm) {
      this.applySearchFilter();
    }
  }

  /**
   * Perform exact search for a specific key
   */
  private performSearch(): void {
    const searchTerm = this.keySearchInput.value.trim();
    
    if (!searchTerm) {
      this.showSearchMessage('请输入要搜索的按键名称');
      this.keySearchInput.classList.add('error');
      setTimeout(() => {
        this.keySearchInput.classList.remove('error');
      }, 2000);
      return;
    }

    this.currentSearchTerm = searchTerm;
    this.applySearchFilter();
  }

  /**
   * Show a temporary message without using alert
   */
  private showSearchMessage(message: string): void {
    // Remove any existing message
    const existingMessage = document.querySelector('.search-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message element
    const messageEl = document.createElement('div');
    messageEl.className = 'search-message';
    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    // Remove after 2 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 2000);
  }

  /**
   * Apply search filter to table rows
   */
  private applySearchFilter(): void {
    const rows = this.statsTableBody.getElementsByTagName('tr');
    let found = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const keyCell = row.getElementsByTagName('td')[0];
      
      if (keyCell) {
        const keyName = keyCell.textContent || '';
        // Exact match (case-insensitive)
        if (keyName.toLowerCase() === this.currentSearchTerm.toLowerCase()) {
          row.style.display = '';
          found = true;
        } else {
          row.style.display = 'none';
        }
      }
    }

    if (!found && this.currentSearchTerm) {
      const searchTerm = this.currentSearchTerm;
      this.resetSearch();
      
      // Show message without using alert
      this.showSearchMessage(`未找到按键 "${searchTerm}" 的统计信息`);
      this.keySearchInput.classList.add('error');
      setTimeout(() => {
        this.keySearchInput.classList.remove('error');
      }, 2000);
    }
  }

  /**
   * Reset search and show all rows
   */
  private resetSearch(): void {
    this.currentSearchTerm = '';
    this.keySearchInput.value = '';
    this.keySearchInput.classList.remove('error');
    
    const rows = this.statsTableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      rows[i].style.display = '';
    }
  }

  /**
   * Update the chart based on statistics type
   */
  private updateChart(stats: DailyStats | MonthlyStats | YearlyStats): void {
    if (!this.chartRenderer) {
      return;
    }

    // Destroy existing chart
    this.chartRenderer.destroy();

    if ('date' in stats) {
      // Daily stats - use bar chart (Requirement 6.2)
      this.chartRenderer.renderBarChart(stats.keyBreakdown, this.chartCanvas);
    } else if ('month' in stats) {
      // Monthly stats - use line chart (Requirement 6.3)
      const trendData = stats.dailyTrend.map(item => ({
        label: item.date.toLocaleDateString('zh-CN', { day: 'numeric' }),
        value: item.count
      }));
      this.chartRenderer.renderLineChart(trendData, this.chartCanvas);
    } else {
      // Yearly stats - use line chart (Requirement 6.4)
      const trendData = stats.monthlyTrend.map(item => ({
        label: `${item.month}月`,
        value: item.count
      }));
      this.chartRenderer.renderLineChart(trendData, this.chartCanvas);
    }
  }

  /**
   * Show loading indicator
   * Requirements: 8.5
   */
  private showLoading(): void {
    this.loadingIndicator.classList.remove('hidden');
  }

  /**
   * Hide loading indicator
   * Requirements: 8.5
   */
  private hideLoading(): void {
    this.loadingIndicator.classList.add('hidden');
  }
}

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      getStats: (period: 'day' | 'month' | 'year', date: Date) => Promise<DailyStats | MonthlyStats | YearlyStats>;
      exportData: (format: 'json' | 'csv', period: 'day' | 'month' | 'year', date: Date) => Promise<string>;
      resetData: () => Promise<string>;
      getBackups: () => Promise<Array<{ backupPath: string; createdAt: number }>>;
      restoreData: (backupPath: string) => Promise<void>;
      onDataUpdated: (callback: () => void) => void;
      removeDataUpdatedListener: (callback: () => void) => void;
    };
  }
}
