import { KeystrokeBuffer } from './KeystrokeBuffer';
import { KeystrokeRepository } from './KeystrokeRepository';
import { Keystroke } from '../domain/models';
import * as fs from 'fs';

describe('KeystrokeBuffer', () => {
  let buffer: KeystrokeBuffer;
  let repository: KeystrokeRepository;
  const testDbPath = './test-buffer.db';

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    repository = new KeystrokeRepository(testDbPath);
    await repository.initialize();
    buffer = new KeystrokeBuffer(repository);
  });

  afterEach(async () => {
    // Stop buffer first (while repository is still open)
    if (buffer) {
      await buffer.stop();
    }
    
    // Wait a bit to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then close repository
    if (repository) {
      await repository.close();
    }
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }, 20000); // Increase timeout for afterEach to handle retries

  describe('add', () => {
    it('should add keystroke to buffer', () => {
      const keystroke: Keystroke = {
        keyCode: 30,
        keyName: 'A',
        timestamp: Date.now()
      };

      buffer.add(keystroke);
      expect(buffer.size()).toBe(1);
    });

    it('should trigger flush when buffer reaches max size', async () => {
      const keystrokes: Keystroke[] = [];
      const baseTime = Date.now();
      
      // Add 100 keystrokes (max size)
      for (let i = 0; i < 100; i++) {
        keystrokes.push({
          keyCode: 30,
          keyName: 'A',
          timestamp: baseTime + i
        });
      }

      // Add all keystrokes - the 100th one should trigger a flush
      for (const keystroke of keystrokes) {
        buffer.add(keystroke);
      }

      // Wait for async flush to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Buffer should be empty after flush
      expect(buffer.size()).toBe(0);

      // Verify data was written to database
      const saved = await repository.getByDateRange(
        new Date(baseTime - 1000),
        new Date(baseTime + 2000)
      );
      expect(saved.length).toBe(100);
    });
  });

  describe('flush', () => {
    it('should flush buffer to database', async () => {
      const keystroke: Keystroke = {
        keyCode: 30,
        keyName: 'A',
        timestamp: Date.now()
      };

      buffer.add(keystroke);
      expect(buffer.size()).toBe(1);

      await buffer.flush();
      expect(buffer.size()).toBe(0);

      // Verify data was written
      const saved = await repository.getByDateRange(
        new Date(Date.now() - 1000),
        new Date(Date.now() + 1000)
      );
      expect(saved.length).toBe(1);
      expect(saved[0].keyName).toBe('A');
    });

    it('should handle empty buffer', async () => {
      expect(buffer.size()).toBe(0);
      await expect(buffer.flush()).resolves.not.toThrow();
    });

    it('should retry on write failure', async () => {
      // Close repository to simulate failure
      await repository.close();

      const keystroke: Keystroke = {
        keyCode: 30,
        keyName: 'A',
        timestamp: Date.now()
      };

      buffer.add(keystroke);
      
      // Flush will fail and retry, then put data back in buffer
      await buffer.flush();

      // Data should be back in buffer after failed retries
      expect(buffer.size()).toBeGreaterThan(0);
    }, 10000); // Increase timeout to 10 seconds to account for retries (1s + 2s + 4s = 7s)
  });

  describe('periodic flush', () => {
    it('should flush buffer after 5 seconds', async () => {
      const keystroke: Keystroke = {
        keyCode: 30,
        keyName: 'A',
        timestamp: Date.now()
      };

      buffer.add(keystroke);
      expect(buffer.size()).toBe(1);

      // Wait for 5+ seconds for automatic flush
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Buffer should be empty after automatic flush
      expect(buffer.size()).toBe(0);

      // Verify data was written
      const saved = await repository.getByDateRange(
        new Date(Date.now() - 10000),
        new Date(Date.now() + 1000)
      );
      expect(saved.length).toBe(1);
    }, 10000); // Increase test timeout
  });

  describe('stop', () => {
    it('should flush buffer on stop', async () => {
      const keystroke: Keystroke = {
        keyCode: 30,
        keyName: 'A',
        timestamp: Date.now()
      };

      buffer.add(keystroke);
      expect(buffer.size()).toBe(1);

      await buffer.stop();
      expect(buffer.size()).toBe(0);

      // Verify data was written
      const saved = await repository.getByDateRange(
        new Date(Date.now() - 1000),
        new Date(Date.now() + 1000)
      );
      expect(saved.length).toBe(1);
    });
  });
});
