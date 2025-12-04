import * as fs from 'fs';
import * as path from 'path';
import { Keystroke } from '../domain/models';
import { ErrorLogger } from './ErrorLogger';

export class ExportService {
  private errorLogger: ErrorLogger;

  constructor(errorLogger?: ErrorLogger) {
    this.errorLogger = errorLogger || new ErrorLogger();
  }
  /**
   * Export any data to JSON format (supports both Keystroke[] and statistics data)
   * @param data Array of records to export
   * @param filePath Destination file path
   * @param startDate Optional start date for filtering (only for Keystroke[])
   * @param endDate Optional end date for filtering (only for Keystroke[])
   */
  async exportToJSON(
    data: any[],
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    try {
      // Check if data is Keystroke[] (has timestamp property) or statistics data
      let filteredData = data;
      if (data.length > 0 && 'timestamp' in data[0]) {
        // Filter keystroke data by date range if provided
        filteredData = this.filterByDateRange(data as Keystroke[], startDate, endDate);
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert to JSON with proper formatting
      const jsonContent = JSON.stringify(filteredData, null, 2);

      // Write to file
      await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'ExportService.exportToJSON');
      throw new Error(
        `Failed to export to JSON: ${err.message}`
      );
    }
  }

  /**
   * Export data to CSV format (supports both Keystroke[] and statistics data)
   * @param data Array of records to export
   * @param filePath Destination file path
   * @param startDate Optional start date for filtering (only for Keystroke[])
   * @param endDate Optional end date for filtering (only for Keystroke[])
   */
  async exportToCSV(
    data: any[],
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let csvContent: string;

      // Check if data is Keystroke[] or statistics data
      if (data.length > 0 && 'timestamp' in data[0]) {
        // Export keystroke records
        const filteredData = this.filterByDateRange(data as Keystroke[], startDate, endDate);
        const header = 'id,keyCode,keyName,timestamp,date,time\n';
        const rows = filteredData.map((keystroke) => {
          const date = new Date(keystroke.timestamp);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toISOString().split('T')[1].split('.')[0];
          
          return `${keystroke.id || ''},${keystroke.keyCode},"${this.escapeCSV(keystroke.keyName)}",${keystroke.timestamp},${dateStr},${timeStr}`;
        }).join('\n');
        csvContent = header + rows;
      } else {
        // Export statistics data
        const header = 'keyName,count,percentage\n';
        const rows = data.map((item: any) => {
          return `"${this.escapeCSV(item.keyName)}",${item.count},${item.percentage}`;
        }).join('\n');
        csvContent = header + rows;
      }

      // Write to file
      await fs.promises.writeFile(filePath, csvContent, 'utf-8');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'ExportService.exportToCSV');
      throw new Error(
        `Failed to export to CSV: ${err.message}`
      );
    }
  }

  /**
   * Filter keystrokes by date range
   * @param data Array of keystroke records
   * @param startDate Optional start date
   * @param endDate Optional end date
   * @returns Filtered array of keystrokes
   */
  private filterByDateRange(
    data: Keystroke[],
    startDate?: Date,
    endDate?: Date
  ): Keystroke[] {
    if (!startDate && !endDate) {
      return data;
    }

    return data.filter((keystroke) => {
      const timestamp = keystroke.timestamp;
      
      if (startDate && timestamp < startDate.getTime()) {
        return false;
      }
      
      if (endDate && timestamp > endDate.getTime()) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Escape special characters in CSV fields
   * @param value String value to escape
   * @returns Escaped string
   */
  private escapeCSV(value: string): string {
    // Escape double quotes by doubling them
    return value.replace(/"/g, '""');
  }
}
