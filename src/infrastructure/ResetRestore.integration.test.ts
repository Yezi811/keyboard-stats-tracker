import * as fs from 'fs';
import * as path from 'path';
import { KeystrokeRepository } from './KeystrokeRepository';
import { Keystroke } from '../domain/models';

/**
 * Integration tests for reset and restore functionality
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */
describe('Reset and Restore Integration Tests', () => {
  const testDbPath = './test-reset-restore.db';
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
   * Test complete reset workflow
   * Requirements: 10.1, 10.2, 10.3
   */
  it('should create backup before clearing data during reset', async () => {
    // Add some test data
    const testData: Keystroke[] = [
      { keyCode: 65, keyName: 'A', timestamp: Date.now() },
      { keyCode: 66, keyName: 'B', timestamp: Date.now() + 1000 },
      { keyCode: 67, keyName: 'C', timestamp: Date.now() + 2000 }
    ];
    
    await repository.save(testData);
    
    // Verify data exists
    const beforeReset = await repository.getByDateRange(
      new Date(0),
      new Date(Date.now() + 10000)
    );
    expect(beforeReset.length).toBe(3);
    
    // Create backup (simulating reset step 1)
    const backupPath = await repository.backup();
    expect(fs.existsSync(backupPath)).toBe(true);
    
    // Clear data (simulating reset step 2)
    await repository.clear();
    
    // Verify data is cleared
    const afterReset = await repository.getByDateRange(
      new Date(0),
      new Date(Date.now() + 10000)
    );
    expect(afterReset.length).toBe(0);
    
    // Verify backup still exists
    expect(fs.existsSync(backupPath)).toBe(true);
    
    // Clean up
    fs.unlinkSync(backupPath);
  });

  /**
   * Test complete restore workflow
   * Requirements: 10.5
   */
  it('should restore data from backup and update state', async () => {
    // Add some test data
    const testData: Keystroke[] = [
      { keyCode: 65, keyName: 'A', timestamp: Date.now() },
      { keyCode: 66, keyName: 'B', timestamp: Date.now() + 1000 },
      { keyCode: 67, keyName: 'C', timestamp: Date.now() + 2000 }
    ];
    
    await repository.save(testData);
    
    // Create backup
    const backupPath = await repository.backup();
    
    // Clear data
    await repository.clear();
    
    // Verify data is cleared
    const afterClear = await repository.getByDateRange(
      new Date(0),
      new Date(Date.now() + 10000)
    );
    expect(afterClear.length).toBe(0);
    
    // Restore from backup
    await repository.restore(backupPath);
    
    // Verify data is restored
    const afterRestore = await repository.getByDateRange(
      new Date(0),
      new Date(Date.now() + 10000)
    );
    expect(afterRestore.length).toBe(3);
    expect(afterRestore[0].keyName).toBe('A');
    expect(afterRestore[1].keyName).toBe('B');
    expect(afterRestore[2].keyName).toBe('C');
    
    // Clean up
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
  });

  /**
   * Test getting list of backups
   */
  it('should list available backups', async () => {
    // Add some test data
    const testData: Keystroke[] = [
      { keyCode: 65, keyName: 'A', timestamp: Date.now() }
    ];
    
    await repository.save(testData);
    
    // Create multiple backups
    const backup1 = await repository.backup();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
    const backup2 = await repository.backup();
    
    // Get list of backups
    const backups = await repository.getBackups();
    
    // Should have at least 2 backups
    expect(backups.length).toBeGreaterThanOrEqual(2);
    
    // Backups should be sorted by creation time (newest first)
    expect(backups[0].createdAt).toBeGreaterThanOrEqual(backups[1].createdAt);
    
    // Clean up
    fs.unlinkSync(backup1);
    fs.unlinkSync(backup2);
  });

  /**
   * Test that new keystrokes are counted after reset
   * Requirements: 10.4
   */
  it('should count new keystrokes from zero after reset', async () => {
    // Add initial data
    const initialData: Keystroke[] = [
      { keyCode: 65, keyName: 'A', timestamp: Date.now() }
    ];
    
    await repository.save(initialData);
    
    // Create backup and clear
    const backupPath = await repository.backup();
    await repository.clear();
    
    // Add new data after reset
    const newData: Keystroke[] = [
      { keyCode: 66, keyName: 'B', timestamp: Date.now() + 1000 }
    ];
    
    await repository.save(newData);
    
    // Verify only new data exists
    const afterReset = await repository.getByDateRange(
      new Date(0),
      new Date(Date.now() + 10000)
    );
    expect(afterReset.length).toBe(1);
    expect(afterReset[0].keyName).toBe('B');
    
    // Clean up
    fs.unlinkSync(backupPath);
  });
});
