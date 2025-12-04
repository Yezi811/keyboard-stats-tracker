import { KeyboardListener } from './KeyboardListener';
import { KeystrokeBuffer } from './KeystrokeBuffer';
import { KeystrokeRepository } from './KeystrokeRepository';
import { KeystrokeEvent } from '../domain/models';

/**
 * KeystrokeService integrates KeyboardListener and KeystrokeBuffer
 * to capture keyboard events and buffer them for batch database writes.
 * 
 * This service ensures:
 * - Keyboard events are captured and buffered
 * - Buffer is flushed on application shutdown
 * - Proper cleanup of resources
 * - Emits 'data-updated' event when data is written to database
 */
export class KeystrokeService {
  private listener: KeyboardListener;
  private buffer: KeystrokeBuffer;
  private repository: KeystrokeRepository;
  private isRunning: boolean = false;
  private onDataUpdated: (() => void) | null = null;

  constructor(repository: KeystrokeRepository) {
    this.repository = repository;
    this.listener = new KeyboardListener();
    this.buffer = new KeystrokeBuffer(repository);
    
    // Forward buffer flush events
    this.buffer.on('flushed', (count: number) => {
      console.log(`Data updated: ${count} keystrokes written`);
      if (this.onDataUpdated) {
        this.onDataUpdated();
      }
    });
  }

  /**
   * Start the keystroke capture service
   * Initializes database, starts keyboard listener, and connects events to buffer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('KeystrokeService is already running');
      return;
    }

    try {
      // Initialize database
      await this.repository.initialize();

      // Connect keyboard events to buffer
      this.listener.on('keystroke', (event: KeystrokeEvent) => {
        this.handleKeystroke(event);
      });

      // Handle listener errors
      this.listener.on('error', (error: Error) => {
        console.error('KeyboardListener error:', error);
      });

      // Start keyboard listener
      await this.listener.start();

      this.isRunning = true;
      console.log('KeystrokeService started successfully');
    } catch (error) {
      console.error('Failed to start KeystrokeService:', error);
      throw error;
    }
  }

  /**
   * Stop the keystroke capture service
   * Ensures buffer is flushed before stopping
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('KeystrokeService is not running');
      return;
    }

    try {
      // Stop keyboard listener
      await this.listener.stop();

      // Flush buffer and stop timer
      await this.buffer.stop();

      // Close database connection
      await this.repository.close();

      this.isRunning = false;
      console.log('KeystrokeService stopped successfully');
    } catch (error) {
      console.error('Failed to stop KeystrokeService:', error);
      throw error;
    }
  }

  /**
   * Handle keystroke events from the listener
   * Converts KeystrokeEvent to Keystroke and adds to buffer
   */
  private handleKeystroke(event: KeystrokeEvent): void {
    try {
      // Convert KeystrokeEvent to Keystroke (without id)
      const keystroke = {
        keyCode: event.keyCode,
        keyName: event.keyName,
        timestamp: event.timestamp
      };

      this.buffer.add(keystroke);
    } catch (error) {
      console.error('Error handling keystroke:', error);
    }
  }

  /**
   * Get the current buffer size
   */
  getBufferSize(): number {
    return this.buffer.size();
  }

  /**
   * Manually trigger a buffer flush
   */
  async flush(): Promise<void> {
    await this.buffer.flush();
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set callback for data update notifications
   */
  setDataUpdateCallback(callback: () => void): void {
    this.onDataUpdated = callback;
  }
}
