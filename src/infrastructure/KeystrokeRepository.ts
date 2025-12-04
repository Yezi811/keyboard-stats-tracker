import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Keystroke, KeyStats } from '../domain/models';
import { ErrorLogger } from './ErrorLogger';

export class KeystrokeRepository {
  private db: sqlite3.Database | null = null;
  private dbPath: string;
  private errorLogger: ErrorLogger;

  constructor(dbPath: string = './keyboard-stats.db', errorLogger?: ErrorLogger) {
    this.dbPath = dbPath;
    this.errorLogger = errorLogger || new ErrorLogger();
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.errorLogger.logError(err, 'KeystrokeRepository.initialize - Database connection');
          reject(err);
          return;
        }

        // Read and execute schema
        // Try multiple possible locations for schema.sql
        const possiblePaths = [
          path.join(__dirname, 'schema.sql'),
          path.join(__dirname, '../../src/infrastructure/schema.sql'),
          path.join(process.cwd(), 'src/infrastructure/schema.sql'),
          path.join(process.resourcesPath || '', 'schema.sql'), // For packaged app
        ];
        
        let schemaPath: string | null = null;
        for (const tryPath of possiblePaths) {
          if (fs.existsSync(tryPath)) {
            schemaPath = tryPath;
            break;
          }
        }
        
        if (!schemaPath) {
          const error = new Error(`schema.sql not found. Tried paths: ${possiblePaths.join(', ')}`);
          this.errorLogger.logError(error, 'KeystrokeRepository.initialize - Schema file not found');
          reject(error);
          return;
        }
        
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        this.db!.exec(schema, (execErr) => {
          if (execErr) {
            this.errorLogger.logError(execErr, 'KeystrokeRepository.initialize - Schema execution');
            reject(execErr);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Save keystrokes to database in batch
   */
  async save(keystrokes: Keystroke[]): Promise<void> {
    if (!this.db) {
      const error = new Error('Database not initialized');
      this.errorLogger.logError(error, 'KeystrokeRepository.save');
      throw error;
    }

    if (keystrokes.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare(
        'INSERT INTO keystrokes (key_code, key_name, timestamp, date, hour) VALUES (?, ?, ?, ?, ?)'
      );

      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        for (const keystroke of keystrokes) {
          const date = new Date(keystroke.timestamp);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
          const hour = date.getUTCHours(); // Use UTC hours to match UTC date

          stmt.run(
            keystroke.keyCode,
            keystroke.keyName,
            keystroke.timestamp,
            dateStr,
            hour,
            (err: Error | null) => {
              if (err) {
                this.errorLogger.logError(err, 'KeystrokeRepository.save - Insert');
                this.db!.run('ROLLBACK');
                reject(err);
              }
            }
          );
        }

        stmt.finalize();

        this.db!.run('COMMIT', (err) => {
          if (err) {
            this.errorLogger.logError(err, 'KeystrokeRepository.save - Commit');
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Get keystrokes within a date range
   */
  async getByDateRange(start: Date, end: Date): Promise<Keystroke[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const startTimestamp = start.getTime();
      const endTimestamp = end.getTime();

      this.db!.all(
        'SELECT id, key_code as keyCode, key_name as keyName, timestamp FROM keystrokes WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp',
        [startTimestamp, endTimestamp],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows as Keystroke[]);
        }
      );
    });
  }

  /**
   * Get statistics by period (day, month, or year)
   * Optimized to use range queries instead of LIKE for better index utilization
   */
  async getStatsByPeriod(
    period: 'day' | 'month' | 'year',
    date: Date
  ): Promise<KeyStats[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query: string;
    let params: any[];

    if (period === 'day') {
      // Use exact match for day - this uses idx_date index efficiently
      const dateStr = date.toISOString().split('T')[0];
      query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date = ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      params = [dateStr];
    } else if (period === 'month') {
      // Use range query instead of LIKE for better index utilization
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
      // Calculate last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date >= ? AND date <= ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      params = [startDate, endDate];
    } else {
      // Use range query instead of LIKE for better index utilization
      const year = date.getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date >= ? AND date <= ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      params = [startDate, endDate];
    }

    return new Promise((resolve, reject) => {
      this.db!.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as KeyStats[]);
      });
    });
  }

  /**
   * Clear all keystroke data
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM keystrokes', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Create a backup of the database
   */
  async backup(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const timestamp = Date.now();
    const backupPath = `${this.dbPath}.backup.${timestamp}`;

    return new Promise((resolve, reject) => {
      // Copy database file
      fs.copyFile(this.dbPath, backupPath, (copyErr) => {
        if (copyErr) {
          reject(copyErr);
          return;
        }

        // Record backup in database
        this.db!.run(
          'INSERT INTO backups (backup_path, created_at) VALUES (?, ?)',
          [backupPath, timestamp],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(backupPath);
            }
          }
        );
      });
    });
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Check if backup file exists
      if (!fs.existsSync(backupPath)) {
        reject(new Error(`Backup file not found: ${backupPath}`));
        return;
      }

      // Close current database connection
      this.db!.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }

        // Copy backup file to main database
        fs.copyFile(backupPath, this.dbPath, (copyErr) => {
          if (copyErr) {
            reject(copyErr);
            return;
          }

          // Reopen database
          this.initialize()
            .then(() => resolve())
            .catch((initErr) => reject(initErr));
        });
      });
    });
  }

  /**
   * Get list of available backups
   */
  async getBackups(): Promise<Array<{ backupPath: string; createdAt: number }>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT backup_path as backupPath, created_at as createdAt FROM backups ORDER BY created_at DESC',
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          // Filter to only include backups that still exist on disk
          const existingBackups = rows.filter(row => fs.existsSync(row.backupPath));
          resolve(existingBackups);
        }
      );
    });
  }

  /**
   * Analyze query performance using EXPLAIN QUERY PLAN
   * This helps verify that indexes are being used correctly
   */
  async analyzeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(`EXPLAIN QUERY PLAN ${query}`, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Get database statistics for monitoring
   */
  async getStats(): Promise<{
    totalKeystrokes: number;
    oldestKeystroke: number | null;
    newestKeystroke: number | null;
    uniqueKeys: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        `SELECT 
          COUNT(*) as total,
          MIN(timestamp) as oldest,
          MAX(timestamp) as newest,
          COUNT(DISTINCT key_name) as uniqueKeys
        FROM keystrokes`,
        [],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            totalKeystrokes: row.total || 0,
            oldestKeystroke: row.oldest,
            newestKeystroke: row.newest,
            uniqueKeys: row.uniqueKeys || 0
          });
        }
      );
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }
}
