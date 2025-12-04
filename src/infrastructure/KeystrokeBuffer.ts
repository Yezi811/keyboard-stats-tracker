import { EventEmitter } from 'events';
import { Keystroke } from '../domain/models';
import { KeystrokeRepository } from './KeystrokeRepository';

/**
 * KeystrokeBuffer manages in-memory buffering of keystroke events
 * and performs batch writes to the database for performance optimization.
 * 
 * Flushes occur when:
 * - Buffer reaches 100 events
 * - 1 second has elapsed since last flush
 * - Manual flush is requested
 * 
 * Emits 'flushed' event after successful database write
 */
export class KeystrokeBuffer extends EventEmitter {
  private buffer: Keystroke[] = [];
  private readonly maxSize: number = 100;
  private readonly flushInterval: number = 1000; // 1 second for real-time updates
  private flushTimer: NodeJS.Timeout | null = null;
  private repository: KeystrokeRepository;
  private isFlushingInProgress: boolean = false;
  private readonly maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second initial delay

  constructor(repository: KeystrokeRepository) {
    super();
    this.repository = repository;
    this.startFlushTimer();
  }

  /**
   * Add a keystroke to the buffer
   * Triggers immediate flush for real-time updates
   */
  add(keystroke: Keystroke): void {
    this.buffer.push(keystroke);

    // Trigger immediate flush for real-time UI updates
    // Note: flush is async but we don't wait for it to avoid blocking keystroke capture
    this.flush().catch(err => {
      console.error('Failed to flush buffer:', err);
    });
  }

  /**
   * Flush all buffered keystrokes to the database
   * Implements retry logic for failed writes
   */
  async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushingInProgress) {
      return;
    }

    // Nothing to flush
    if (this.buffer.length === 0) {
      return;
    }

    this.isFlushingInProgress = true;

    // Take a snapshot of current buffer and clear it
    const keystrokesToFlush = [...this.buffer];
    this.buffer = [];

    // Reset the timer since we're flushing now
    this.resetFlushTimer();

    try {
      await this.flushWithRetry(keystrokesToFlush, 0);
    } catch (error) {
      // If all retries failed, put the data back in the buffer
      console.error('Failed to flush after all retries, data returned to buffer:', error);
      this.buffer.unshift(...keystrokesToFlush);
    } finally {
      this.isFlushingInProgress = false;
    }
  }

  /**
   * Flush with exponential backoff retry logic
   */
  private async flushWithRetry(keystrokes: Keystroke[], attempt: number): Promise<void> {
    try {
      await this.repository.save(keystrokes);
      // Emit event after successful flush
      this.emit('flushed', keystrokes.length);
      console.log(`✓ Flushed ${keystrokes.length} keystrokes to database`);
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Flush attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.flushWithRetry(keystrokes, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the current size of the buffer
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Failed to flush buffer on timer:', err);
      });
    }, this.flushInterval);
  }

  /**
   * Reset the flush timer
   */
  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
  }

  /**
   * Stop the flush timer and perform final flush
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Perform final flush
    await this.flush();
  }
}
