import { KeystrokeService } from './KeystrokeService';
import { KeystrokeRepository } from './KeystrokeRepository';
import * as fs from 'fs';

describe('KeystrokeService', () => {
  let service: KeystrokeService;
  let repository: KeystrokeRepository;
  const testDbPath = './test-service.db';

  beforeEach(async () => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    repository = new KeystrokeRepository(testDbPath);
    service = new KeystrokeService(repository);
  });

  afterEach(async () => {
    if (service.isServiceRunning()) {
      await service.stop();
    }
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clean up backup files
    const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('test-service.db.backup'));
    backupFiles.forEach(f => fs.unlinkSync(f));
  });

  describe('start', () => {
    it('should initialize database and start listener', async () => {
      await service.start();
      expect(service.isServiceRunning()).toBe(true);
    });

    it('should not start if already running', async () => {
      await service.start();
      
      // Try to start again
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('KeystrokeService is already running');
      consoleSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should flush buffer and stop listener', async () => {
      await service.start();
      expect(service.isServiceRunning()).toBe(true);

      await service.stop();
      expect(service.isServiceRunning()).toBe(false);
    });

    it('should not stop if not running', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith('KeystrokeService is not running');
      consoleSpy.mockRestore();
    });
  });

  describe('integration', () => {
    it('should capture keystrokes and buffer them', async () => {
      await service.start();

      // The buffer should be empty initially
      expect(service.getBufferSize()).toBe(0);

      // Note: We can't easily simulate actual keyboard events in tests
      // This test verifies the service starts correctly
      // Real keyboard event testing would require integration tests
    });

    it('should flush buffer on demand', async () => {
      await service.start();
      
      // Manually flush
      await service.flush();
      
      expect(service.getBufferSize()).toBe(0);
    });
  });
});
