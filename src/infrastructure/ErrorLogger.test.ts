import { ErrorLogger } from './ErrorLogger';
import * as fs from 'fs';
import * as path from 'path';

describe('ErrorLogger', () => {
  const testLogPath = './test-error.log';
  let logger: ErrorLogger;

  beforeEach(() => {
    // Clean up any existing test log file
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
    logger = new ErrorLogger(testLogPath);
  });

  afterEach(async () => {
    // Ensure shutdown and cleanup
    await logger.shutdown();
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('logError', () => {
    it('should log an error with context', async () => {
      const error = new Error('Test error');
      logger.logError(error, 'TestContext');

      await logger.shutdown();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      expect(content).toContain('ERROR');
      expect(content).toContain('Test error');
      expect(content).toContain('TestContext');
    });

    it('should include stack trace in error logs', async () => {
      const error = new Error('Test error with stack');
      logger.logError(error, 'TestContext');

      await logger.shutdown();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      expect(content).toContain('Error: Test error with stack');
    });
  });

  describe('logWarning', () => {
    it('should log a warning with context', async () => {
      logger.logWarning('Test warning', 'TestContext');

      await logger.shutdown();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      expect(content).toContain('WARNING');
      expect(content).toContain('Test warning');
      expect(content).toContain('TestContext');
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent log entries', async () => {
      logger.logError(new Error('Error 1'), 'Context1');
      logger.logWarning('Warning 1', 'Context2');
      logger.logError(new Error('Error 2'), 'Context3');

      const entries = await logger.getRecentErrors(10);

      expect(entries.length).toBe(3);
      expect(entries[0].message).toBe('Error 1');
      expect(entries[0].level).toBe('error');
      expect(entries[0].context).toBe('Context1');
      expect(entries[1].message).toBe('Warning 1');
      expect(entries[1].level).toBe('warning');
      expect(entries[2].message).toBe('Error 2');
    });

    it('should limit the number of returned entries', async () => {
      for (let i = 0; i < 10; i++) {
        logger.logError(new Error(`Error ${i}`), 'Context');
      }

      const entries = await logger.getRecentErrors(5);

      expect(entries.length).toBe(5);
      expect(entries[0].message).toBe('Error 5');
      expect(entries[4].message).toBe('Error 9');
    });

    it('should return empty array when log file is empty', async () => {
      const entries = await logger.getRecentErrors(10);
      expect(entries).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should clear the log file', async () => {
      logger.logError(new Error('Test error'), 'Context');
      await logger.shutdown();

      await logger.clearLogs();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      expect(content).toBe('');
    });
  });

  describe('buffer flushing', () => {
    it('should flush buffer when max size is reached', async () => {
      // Log more than maxBufferSize (10) entries
      for (let i = 0; i < 15; i++) {
        logger.logError(new Error(`Error ${i}`), 'Context');
      }

      // Give some time for async writes
      await new Promise(resolve => setTimeout(resolve, 100));

      const content = fs.readFileSync(testLogPath, 'utf-8');
      expect(content).toContain('Error 0');
      expect(content).toContain('Error 9');
    });
  });
});
