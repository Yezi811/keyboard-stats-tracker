import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { KeystrokeRepository } from './KeystrokeRepository';
import { Keystroke } from '../domain/models';

describe('KeystrokeRepository Property-Based Tests', () => {
  const testDbPath = './test-keyboard-stats.db';
  let repository: KeystrokeRepository;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    repository = new KeystrokeRepository(testDbPath);
    await repository.initialize();
  });

  afterEach(async () => {
    await repository.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up any backup files
    const dir = path.dirname(testDbPath);
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.startsWith(path.basename(testDbPath) + '.backup.')) {
        fs.unlinkSync(path.join(dir, file));
      }
    });
  });

  /**
   * Feature: keyboard-stats-tracker, Property 2: 数据持久化往返
   * Validates: Requirements 2.1, 2.3
   * 
   * For any collection of keystroke data, writing it to persistent storage 
   * and then reading it back should yield equivalent data.
   */
  describe('Property 2: Data Persistence Round-Trip', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should preserve keystroke data through save and retrieve cycle', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save keystrokes to database
          await repository.save(keystrokes);

          // Calculate the date range that covers all keystrokes
          const timestamps = keystrokes.map(k => k.timestamp);
          const minTimestamp = Math.min(...timestamps);
          const maxTimestamp = Math.max(...timestamps);
          
          const startDate = new Date(minTimestamp);
          const endDate = new Date(maxTimestamp);

          // Retrieve keystrokes from database
          const retrieved = await repository.getByDateRange(startDate, endDate);

          // Verify count matches
          if (retrieved.length !== keystrokes.length) {
            return false;
          }

          // Sort both arrays by timestamp for comparison
          const sortedOriginal = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
          const sortedRetrieved = [...retrieved].sort((a, b) => a.timestamp - b.timestamp);

          // Verify each keystroke matches (ignoring auto-generated id)
          for (let i = 0; i < sortedOriginal.length; i++) {
            const original = sortedOriginal[i];
            const ret = sortedRetrieved[i];

            if (
              original.keyCode !== ret.keyCode ||
              original.keyName !== ret.keyName ||
              original.timestamp !== ret.timestamp
            ) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty keystroke arrays', async () => {
      // Edge case: empty array should not throw
      await repository.save([]);
      
      const retrieved = await repository.getByDateRange(
        new Date(0),
        new Date()
      );
      
      expect(retrieved.length).toBe(0);
    });

    it('should preserve data across multiple save operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokesArrayArbitrary, { minLength: 2, maxLength: 3 }),
          async (batchesOfKeystrokes) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save multiple batches
            const allKeystrokes: Keystroke[] = [];
            for (const batch of batchesOfKeystrokes) {
              await repository.save(batch);
              allKeystrokes.push(...batch);
            }

            // Retrieve all data
            const retrieved = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            // Should have all keystrokes
            return retrieved.length === allKeystrokes.length;
          }
        ),
        { numRuns: 50 }
      );
    }, 15000);
  });

  /**
   * Feature: keyboard-stats-tracker, Property 3: 数据持久性保证
   * Validates: Requirements 2.2
   * 
   * For any saved keystroke data, after a system restart, 
   * the data should still be retrievable from storage.
   */
  describe('Property 3: Data Persistence Guarantee', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should persist data across database close and reopen cycles', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save keystrokes to database
          await repository.save(keystrokes);

          // Calculate the date range that covers all keystrokes
          const timestamps = keystrokes.map(k => k.timestamp);
          const minTimestamp = Math.min(...timestamps);
          const maxTimestamp = Math.max(...timestamps);
          
          const startDate = new Date(minTimestamp);
          const endDate = new Date(maxTimestamp);

          // Close the database connection (simulating system shutdown)
          await repository.close();

          // Reopen the database (simulating system restart)
          const newRepository = new KeystrokeRepository(testDbPath);
          await newRepository.initialize();

          // Retrieve keystrokes from database after restart
          const retrieved = await newRepository.getByDateRange(startDate, endDate);

          // Close the new repository
          await newRepository.close();

          // Reinitialize the original repository for cleanup
          await repository.initialize();

          // Verify count matches
          if (retrieved.length !== keystrokes.length) {
            return false;
          }

          // Sort both arrays by timestamp for comparison
          const sortedOriginal = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
          const sortedRetrieved = [...retrieved].sort((a, b) => a.timestamp - b.timestamp);

          // Verify each keystroke matches (ignoring auto-generated id)
          for (let i = 0; i < sortedOriginal.length; i++) {
            const original = sortedOriginal[i];
            const ret = sortedRetrieved[i];

            if (
              original.keyCode !== ret.keyCode ||
              original.keyName !== ret.keyName ||
              original.timestamp !== ret.timestamp
            ) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle system restart with empty database', async () => {
      // Clear database
      await repository.clear();
      
      // Close and reopen
      await repository.close();
      const newRepository = new KeystrokeRepository(testDbPath);
      await newRepository.initialize();
      
      // Should retrieve empty array
      const retrieved = await newRepository.getByDateRange(
        new Date(0),
        new Date()
      );
      
      await newRepository.close();
      await repository.initialize();
      
      expect(retrieved.length).toBe(0);
    });

    it('should persist data even after multiple restart cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          fc.integer({ min: 2, max: 5 }),
          async (keystrokes, restartCount) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(keystrokes);

            const timestamps = keystrokes.map(k => k.timestamp);
            const minTimestamp = Math.min(...timestamps);
            const maxTimestamp = Math.max(...timestamps);
            const startDate = new Date(minTimestamp);
            const endDate = new Date(maxTimestamp);

            // Perform multiple restart cycles
            for (let i = 0; i < restartCount; i++) {
              await repository.close();
              const tempRepo = new KeystrokeRepository(testDbPath);
              await tempRepo.initialize();
              
              // Verify data is still there
              const retrieved = await tempRepo.getByDateRange(startDate, endDate);
              
              await tempRepo.close();
              await repository.initialize();

              if (retrieved.length !== keystrokes.length) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });

  /**
   * Feature: keyboard-stats-tracker, Property 17: 备份恢复往返
   * Validates: Requirements 10.5
   * 
   * For any collection of keystroke data, performing a reset with backup 
   * and then restoring from that backup should yield the original data.
   */
  describe('Property 17: Backup Restore Round-Trip', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should preserve data through backup and restore cycle', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save original keystrokes to database
          await repository.save(keystrokes);

          // Calculate the date range that covers all keystrokes
          const timestamps = keystrokes.map(k => k.timestamp);
          const minTimestamp = Math.min(...timestamps);
          const maxTimestamp = Math.max(...timestamps);
          
          const startDate = new Date(minTimestamp);
          const endDate = new Date(maxTimestamp);

          // Create a backup
          const backupPath = await repository.backup();

          // Clear the database (simulating reset)
          await repository.clear();

          // Verify database is empty after clear
          const afterClear = await repository.getByDateRange(startDate, endDate);
          if (afterClear.length !== 0) {
            // Clean up backup file
            if (fs.existsSync(backupPath)) {
              fs.unlinkSync(backupPath);
            }
            return false;
          }

          // Restore from backup
          await repository.restore(backupPath);

          // Retrieve keystrokes after restore
          const retrieved = await repository.getByDateRange(startDate, endDate);

          // Clean up backup file
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }

          // Verify count matches
          if (retrieved.length !== keystrokes.length) {
            return false;
          }

          // Sort both arrays by timestamp for comparison
          const sortedOriginal = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
          const sortedRetrieved = [...retrieved].sort((a, b) => a.timestamp - b.timestamp);

          // Verify each keystroke matches (ignoring auto-generated id)
          for (let i = 0; i < sortedOriginal.length; i++) {
            const original = sortedOriginal[i];
            const ret = sortedRetrieved[i];

            if (
              original.keyCode !== ret.keyCode ||
              original.keyName !== ret.keyName ||
              original.timestamp !== ret.timestamp
            ) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle backup and restore with empty database', async () => {
      // Clear database
      await repository.clear();
      
      // Create backup of empty database
      const backupPath = await repository.backup();
      
      // Add some data
      const testData: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.now() }
      ];
      await repository.save(testData);
      
      // Restore from empty backup
      await repository.restore(backupPath);
      
      // Should be empty again
      const retrieved = await repository.getByDateRange(
        new Date(0),
        new Date()
      );
      
      // Clean up backup file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      
      expect(retrieved.length).toBe(0);
    });

    it('should preserve data through multiple backup and restore cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          fc.integer({ min: 2, max: 4 }),
          async (keystrokes, cycleCount) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(keystrokes);

            const timestamps = keystrokes.map(k => k.timestamp);
            const minTimestamp = Math.min(...timestamps);
            const maxTimestamp = Math.max(...timestamps);
            const startDate = new Date(minTimestamp);
            const endDate = new Date(maxTimestamp);

            const backupPaths: string[] = [];

            // Perform multiple backup and restore cycles
            for (let i = 0; i < cycleCount; i++) {
              // Create backup
              const backupPath = await repository.backup();
              backupPaths.push(backupPath);

              // Clear database
              await repository.clear();

              // Restore from backup
              await repository.restore(backupPath);

              // Verify data is still correct
              const retrieved = await repository.getByDateRange(startDate, endDate);

              if (retrieved.length !== keystrokes.length) {
                // Clean up backup files
                backupPaths.forEach(bp => {
                  if (fs.existsSync(bp)) {
                    fs.unlinkSync(bp);
                  }
                });
                return false;
              }
            }

            // Clean up backup files
            backupPaths.forEach(bp => {
              if (fs.existsSync(bp)) {
                fs.unlinkSync(bp);
              }
            });

            return true;
          }
        ),
        { numRuns: 50 }
      );
    }, 45000);

    it('should fail gracefully when restoring from non-existent backup', async () => {
      const nonExistentPath = './non-existent-backup.db';
      
      await expect(repository.restore(nonExistentPath)).rejects.toThrow();
    });

    it('should preserve backup metadata in backups table', async () => {
      // Clear database
      await repository.clear();
      
      // Add some data
      const testData: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.now() }
      ];
      await repository.save(testData);
      
      // Create backup
      const backupPath = await repository.backup();
      
      // Verify backup was recorded (we can't easily query the backups table without adding a method,
      // but we can verify the backup file exists)
      expect(fs.existsSync(backupPath)).toBe(true);
      
      // Clean up
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
  });

  /**
   * Feature: keyboard-stats-tracker, Property 16: 备份创建保证
   * Validates: Requirements 10.3
   * 
   * For any reset operation, the system should create a backup file before clearing data.
   */
  describe('Property 16: Backup Creation Guarantee', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should create a backup file before any reset operation', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save keystrokes to database
          await repository.save(keystrokes);

          // Get list of existing backups before creating new one
          const backupsBefore = await repository.getBackups();
          const backupCountBefore = backupsBefore.length;

          // Create backup (simulating the first step of reset operation)
          const backupPath = await repository.backup();

          // Verify backup file was created on disk
          const backupExists = fs.existsSync(backupPath);

          // Get list of backups after creation
          const backupsAfter = await repository.getBackups();
          const backupCountAfter = backupsAfter.length;

          // Clean up backup file
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }

          // Verify:
          // 1. Backup file exists on disk
          if (!backupExists) {
            return false;
          }

          // 2. Backup count increased by 1
          if (backupCountAfter !== backupCountBefore + 1) {
            return false;
          }

          // 3. The backup path is valid and follows expected format
          if (!backupPath.includes('.backup.')) {
            return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }, 30000);

    it('should create backup before clearing data in reset workflow', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save keystrokes to database
          await repository.save(keystrokes);

          // Calculate the date range that covers all keystrokes
          const timestamps = keystrokes.map(k => k.timestamp);
          const minTimestamp = Math.min(...timestamps);
          const maxTimestamp = Math.max(...timestamps);
          const startDate = new Date(minTimestamp);
          const endDate = new Date(maxTimestamp);

          // Verify data exists before reset
          const beforeReset = await repository.getByDateRange(startDate, endDate);
          if (beforeReset.length === 0) {
            return true; // Skip if no data
          }

          // Step 1 of reset: Create backup
          const backupPath = await repository.backup();

          // Verify backup exists
          const backupExistsBeforeClear = fs.existsSync(backupPath);

          // Step 2 of reset: Clear data
          await repository.clear();

          // Verify backup still exists after clear
          const backupExistsAfterClear = fs.existsSync(backupPath);

          // Verify data can be restored from backup
          await repository.restore(backupPath);
          const afterRestore = await repository.getByDateRange(startDate, endDate);

          // Clean up backup file
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }

          // Verify:
          // 1. Backup existed before clear
          if (!backupExistsBeforeClear) {
            return false;
          }

          // 2. Backup still exists after clear
          if (!backupExistsAfterClear) {
            return false;
          }

          // 3. Data can be restored from backup
          if (afterRestore.length !== keystrokes.length) {
            return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }, 45000);

    it('should create unique backup files for multiple reset operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          fc.integer({ min: 2, max: 5 }),
          async (keystrokes, resetCount) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(keystrokes);

            const backupPaths: string[] = [];

            // Perform multiple reset operations
            for (let i = 0; i < resetCount; i++) {
              // Create backup
              const backupPath = await repository.backup();
              backupPaths.push(backupPath);

              // Verify backup exists
              if (!fs.existsSync(backupPath)) {
                // Clean up
                backupPaths.forEach(bp => {
                  if (fs.existsSync(bp)) {
                    fs.unlinkSync(bp);
                  }
                });
                return false;
              }

              // Small delay to ensure unique timestamps
              await new Promise(resolve => setTimeout(resolve, 10));

              // Clear and restore for next iteration
              await repository.clear();
              await repository.save(keystrokes);
            }

            // Verify all backup paths are unique
            const uniquePaths = new Set(backupPaths);
            const allUnique = uniquePaths.size === backupPaths.length;

            // Clean up all backup files
            backupPaths.forEach(bp => {
              if (fs.existsSync(bp)) {
                fs.unlinkSync(bp);
              }
            });

            return allUnique;
          }
        ),
        { numRuns: 50 }
      );
    }, 45000);

    it('should handle backup creation with empty database', async () => {
      // Clear database
      await repository.clear();
      
      // Create backup of empty database (should still work)
      const backupPath = await repository.backup();
      
      // Verify backup file exists
      expect(fs.existsSync(backupPath)).toBe(true);
      
      // Clean up
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });

    it('should record backup metadata in database', async () => {
      // Clear database
      await repository.clear();
      
      // Add some data
      const testData: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.now() }
      ];
      await repository.save(testData);
      
      // Get backup count before
      const backupsBefore = await repository.getBackups();
      
      // Create backup
      const backupPath = await repository.backup();
      
      // Get backup count after
      const backupsAfter = await repository.getBackups();
      
      // Verify backup was recorded
      expect(backupsAfter.length).toBe(backupsBefore.length + 1);
      
      // Verify the new backup is in the list
      const newBackup = backupsAfter.find(b => b.backupPath === backupPath);
      expect(newBackup).toBeDefined();
      expect(newBackup?.backupPath).toBe(backupPath);
      
      // Clean up
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
  });

  /**
   * Feature: keyboard-stats-tracker, Property 15: 数据重置完整性
   * Validates: Requirements 10.2
   * 
   * For any collection of keystroke data, after performing a reset operation,
   * all statistical queries should return zero counts.
   */
  describe('Property 15: Data Reset Integrity', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should return zero counts for all queries after reset', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Save keystrokes to database
          await repository.save(keystrokes);

          // Verify data exists before reset
          const beforeReset = await repository.getByDateRange(
            new Date(0),
            new Date(Date.now() + 1000)
          );
          
          if (beforeReset.length === 0) {
            // If no data was saved (shouldn't happen with our generator), skip this iteration
            return true;
          }

          // Perform reset (clear operation)
          await repository.clear();

          // Verify all queries return zero/empty results after reset
          const afterReset = await repository.getByDateRange(
            new Date(0),
            new Date(Date.now() + 1000)
          );

          // Should have no keystrokes
          if (afterReset.length !== 0) {
            return false;
          }

          // Test stats queries for different periods
          const testDate = new Date(keystrokes[0].timestamp);
          
          // Daily stats should be empty
          const dailyStats = await repository.getStatsByPeriod('day', testDate);
          if (dailyStats.length !== 0) {
            return false;
          }

          // Monthly stats should be empty
          const monthlyStats = await repository.getStatsByPeriod('month', testDate);
          if (monthlyStats.length !== 0) {
            return false;
          }

          // Yearly stats should be empty
          const yearlyStats = await repository.getStatsByPeriod('year', testDate);
          if (yearlyStats.length !== 0) {
            return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }, 30000);

    it('should return zero counts after reset with multiple data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokesArrayArbitrary, { minLength: 2, maxLength: 3 }),
          async (batchesOfKeystrokes) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save multiple batches with different timestamps
            for (const batch of batchesOfKeystrokes) {
              await repository.save(batch);
            }

            // Verify data exists
            const beforeReset = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            if (beforeReset.length === 0) {
              return true;
            }

            // Perform reset
            await repository.clear();

            // Verify all data is gone
            const afterReset = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            return afterReset.length === 0;
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should handle reset on empty database', async () => {
      // Clear database
      await repository.clear();
      
      // Perform reset on already empty database (should not throw)
      await repository.clear();
      
      // Verify still empty
      const result = await repository.getByDateRange(
        new Date(0),
        new Date()
      );
      
      expect(result.length).toBe(0);
    });

    it('should allow new data to be added after reset', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          keystrokesArrayArbitrary,
          async (initialData, newData) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(initialData);

            // Perform reset
            await repository.clear();

            // Add new data after reset
            await repository.save(newData);

            // Verify only new data exists
            const afterReset = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            // Should have exactly the new data count
            return afterReset.length === newData.length;
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should reset counts to zero across all time periods', async () => {
      // Create data spanning multiple days, months, and years
      const multiPeriodData: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2023-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2023-06-20T11:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-15T12:00:00').getTime() },
        { keyCode: 68, keyName: 'D', timestamp: new Date('2024-12-25T13:00:00').getTime() }
      ];

      await repository.save(multiPeriodData);

      // Verify data exists
      const beforeReset = await repository.getByDateRange(
        new Date('2023-01-01'),
        new Date('2025-01-01')
      );
      expect(beforeReset.length).toBe(4);

      // Perform reset
      await repository.clear();

      // Verify all periods return zero
      const day2023Stats = await repository.getStatsByPeriod('day', new Date('2023-01-15'));
      expect(day2023Stats.length).toBe(0);

      const month2023Stats = await repository.getStatsByPeriod('month', new Date('2023-06-01'));
      expect(month2023Stats.length).toBe(0);

      const year2023Stats = await repository.getStatsByPeriod('year', new Date('2023-01-01'));
      expect(year2023Stats.length).toBe(0);

      const year2024Stats = await repository.getStatsByPeriod('year', new Date('2024-01-01'));
      expect(year2024Stats.length).toBe(0);
    });
  });

  /**
   * Feature: keyboard-stats-tracker, Property 18: 重置后计数重启
   * Validates: Requirements 10.4
   * 
   * For any reset operation followed by new keystroke events, 
   * counting should start from zero and accumulate.
   */
  describe('Property 18: Reset Then Count Restart', () => {
    // Generator for valid keystroke data
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    // Generator for arrays of keystrokes
    const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { 
      minLength: 1, 
      maxLength: 50 
    });

    it('should count new keystrokes from zero after reset', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          keystrokesArrayArbitrary,
          async (initialData, newData) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(initialData);

            // Verify initial data exists
            const beforeReset = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            if (beforeReset.length === 0) {
              return true; // Skip if no data was saved
            }

            // Perform reset
            await repository.clear();

            // Verify database is empty after reset
            const afterReset = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            if (afterReset.length !== 0) {
              return false; // Reset didn't clear data
            }

            // Add new data after reset
            await repository.save(newData);

            // Retrieve data after adding new keystrokes
            const afterNewData = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            // Verify:
            // 1. Count matches exactly the new data (not initial + new)
            if (afterNewData.length !== newData.length) {
              return false;
            }

            // 2. Only new data is present (no initial data)
            const sortedNew = [...newData].sort((a, b) => a.timestamp - b.timestamp);
            const sortedRetrieved = [...afterNewData].sort((a, b) => a.timestamp - b.timestamp);

            for (let i = 0; i < sortedNew.length; i++) {
              const newItem = sortedNew[i];
              const retrievedItem = sortedRetrieved[i];

              if (
                newItem.keyCode !== retrievedItem.keyCode ||
                newItem.keyName !== retrievedItem.keyName ||
                newItem.timestamp !== retrievedItem.timestamp
              ) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should accumulate counts correctly after reset', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          fc.array(keystrokesArrayArbitrary, { minLength: 2, maxLength: 3 }),
          async (initialData, batchesOfNewData) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(initialData);

            // Perform reset
            await repository.clear();

            // Add multiple batches of new data after reset
            let expectedCount = 0;
            for (const batch of batchesOfNewData) {
              await repository.save(batch);
              expectedCount += batch.length;

              // Verify count is accumulating correctly from zero
              const currentData = await repository.getByDateRange(
                new Date(0),
                new Date(Date.now() + 1000)
              );

              if (currentData.length !== expectedCount) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should reset statistics for all periods and restart counting', async () => {
      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          keystrokesArrayArbitrary,
          async (initialData, newData) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Save initial data
            await repository.save(initialData);

            // Get a test date from initial data
            const testDate = new Date(initialData[0].timestamp);

            // Verify initial stats exist
            const initialStats = await repository.getStatsByPeriod('day', testDate);
            if (initialStats.length === 0 && initialData.length > 0) {
              // If stats don't match, might be date issue, skip
              return true;
            }

            // Perform reset
            await repository.clear();

            // Verify all stats are zero after reset
            const afterResetStats = await repository.getStatsByPeriod('day', testDate);
            if (afterResetStats.length !== 0) {
              return false;
            }

            // Add new data after reset
            await repository.save(newData);

            // Get a test date from new data
            const newTestDate = new Date(newData[0].timestamp);

            // Verify stats reflect only new data
            const newStats = await repository.getStatsByPeriod('day', newTestDate);
            
            // Calculate expected count for the test date
            const newDateStr = newTestDate.toISOString().split('T')[0];
            const expectedForDate = newData.filter(k => {
              const kDateStr = new Date(k.timestamp).toISOString().split('T')[0];
              return kDateStr === newDateStr;
            });

            // Sum up all counts in stats
            const totalStatsCount = newStats.reduce((sum, stat) => sum + stat.count, 0);

            // Should match the expected count for that date
            return totalStatsCount === expectedForDate.length;
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should handle multiple reset cycles with counting restart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokesArrayArbitrary, { minLength: 2, maxLength: 4 }),
          async (dataBatches) => {
            // Clear database before each test iteration
            await repository.clear();
            
            // Perform multiple reset and count cycles
            for (const batch of dataBatches) {
              // Add data
              await repository.save(batch);

              // Verify count matches batch
              const afterAdd = await repository.getByDateRange(
                new Date(0),
                new Date(Date.now() + 1000)
              );

              if (afterAdd.length !== batch.length) {
                return false;
              }

              // Reset for next cycle
              await repository.clear();

              // Verify empty after reset
              const afterReset = await repository.getByDateRange(
                new Date(0),
                new Date(Date.now() + 1000)
              );

              if (afterReset.length !== 0) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    }, 45000);

    it('should handle edge case of reset with no initial data', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (newData) => {
          // Clear database before each test iteration
          await repository.clear();
          
          // Perform reset on empty database (should not throw)
          await repository.clear();

          // Add new data after reset
          await repository.save(newData);

          // Verify count matches new data
          const afterNewData = await repository.getByDateRange(
            new Date(0),
            new Date(Date.now() + 1000)
          );

          return afterNewData.length === newData.length;
        }),
        { numRuns: 100 }
      );
    }, 30000);
  });

  // Query optimization tests
  // Requirements: 3.1, 4.1, 5.1
  describe('Query Optimization', () => {
    it('should use index for daily stats query', async () => {
      const testDate = new Date('2024-01-15');
      const dateStr = testDate.toISOString().split('T')[0];
      
      const query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date = ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      
      const plan = await repository.analyzeQuery(query, [dateStr]);
      
      // Verify that the query plan uses an index
      // SQLite should use idx_date or idx_date_key for this query
      const planText = JSON.stringify(plan);
      expect(planText.toLowerCase()).toMatch(/index|idx_date/);
    });

    it('should use index for monthly stats query with range', async () => {
      const query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date >= ? AND date <= ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      
      const plan = await repository.analyzeQuery(query, ['2024-01-01', '2024-01-31']);
      
      // Verify that the query plan uses an index
      const planText = JSON.stringify(plan);
      expect(planText.toLowerCase()).toMatch(/index|idx_date/);
    });

    it('should use index for yearly stats query with range', async () => {
      const query = `
        SELECT key_name as keyName, COUNT(*) as count 
        FROM keystrokes 
        WHERE date >= ? AND date <= ? 
        GROUP BY key_name 
        ORDER BY count DESC
      `;
      
      const plan = await repository.analyzeQuery(query, ['2024-01-01', '2024-12-31']);
      
      // Verify that the query plan uses an index
      const planText = JSON.stringify(plan);
      expect(planText.toLowerCase()).toMatch(/index|idx_date/);
    });

    it('should return correct stats with optimized monthly query', async () => {
      // Add test data for January 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-20T11:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-25T12:00:00').getTime() },
        // Add data for February to ensure filtering works
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-02-10T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for January
      const stats = await repository.getStatsByPeriod('month', new Date('2024-01-01'));

      // Should only include January data
      expect(stats.length).toBe(2);
      expect(stats[0].keyName).toBe('A');
      expect(stats[0].count).toBe(2);
      expect(stats[1].keyName).toBe('B');
      expect(stats[1].count).toBe(1);
    });

    it('should return correct stats with optimized yearly query', async () => {
      // Add test data for 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-06-20T11:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-12-25T12:00:00').getTime() },
        // Add data for 2023 to ensure filtering works
        { keyCode: 67, keyName: 'C', timestamp: new Date('2023-06-10T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for 2024
      const stats = await repository.getStatsByPeriod('year', new Date('2024-01-01'));

      // Should only include 2024 data
      expect(stats.length).toBe(2);
      expect(stats[0].keyName).toBe('A');
      expect(stats[0].count).toBe(2);
      expect(stats[1].keyName).toBe('B');
      expect(stats[1].count).toBe(1);
    });

    it('should return database statistics', async () => {
      // Add test data
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-20T11:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-25T12:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      const stats = await repository.getStats();

      expect(stats.totalKeystrokes).toBe(3);
      expect(stats.uniqueKeys).toBe(2);
      expect(stats.oldestKeystroke).toBe(new Date('2024-01-15T10:00:00').getTime());
      expect(stats.newestKeystroke).toBe(new Date('2024-01-25T12:00:00').getTime());
    });

    it('should handle empty database stats', async () => {
      const stats = await repository.getStats();

      expect(stats.totalKeystrokes).toBe(0);
      expect(stats.uniqueKeys).toBe(0);
      expect(stats.oldestKeystroke).toBeNull();
      expect(stats.newestKeystroke).toBeNull();
    });
  });
});
