import { EventEmitter } from 'events';
import { KeystrokeEvent } from '../domain/models';
import type { UiohookKeyboardEvent } from 'uiohook-napi';
import { ErrorLogger } from './ErrorLogger';

/**
 * KeyboardListener captures global keyboard events using uiohook-napi
 * and publishes them as KeystrokeEvent objects.
 */
export class KeyboardListener extends EventEmitter {
  private uiohook: any = null;
  private isRunning: boolean = false;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 2000; // 2 seconds
  private errorLogger: ErrorLogger;
  private lastEventTimestamp: number = 0;
  private lastEventKeyCode: number = -1;
  private readonly MIN_EVENT_INTERVAL: number = 200; // 200ms to aggressively filter duplicates
  private eventCache: Map<string, number> = new Map(); // Cache to track recent events
  private readonly CACHE_CLEANUP_INTERVAL: number = 1000; // Clean cache every second
  private processingEvent: boolean = false; // Flag to prevent concurrent processing

  constructor(errorLogger?: ErrorLogger) {
    super();
    this.errorLogger = errorLogger || new ErrorLogger();
    
    // Periodically clean up old entries from event cache
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.eventCache.entries()) {
        if (now - timestamp > this.MIN_EVENT_INTERVAL * 2) {
          this.eventCache.delete(key);
        }
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Start listening to global keyboard events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.errorLogger.logWarning('KeyboardListener is already running', 'KeyboardListener.start');
      return;
    }

    try {
      // Dynamically import uiohook-napi
      const { uIOhook } = await import('uiohook-napi');
      this.uiohook = uIOhook;

      // Stop the hook first if it's already running
      try {
        await this.uiohook.stop();
      } catch (e) {
        // Ignore errors if hook wasn't running
      }

      // Remove all existing listeners to prevent duplicates
      this.uiohook.removeAllListeners();

      // Register keydown event handler
      this.uiohook.on('keydown', (event: UiohookKeyboardEvent) => {
        this.handleKeyEvent(event);
      });

      // Start the hook
      await this.uiohook.start();
      this.isRunning = true;
      this.retryCount = 0;
      console.log('KeyboardListener started successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'KeyboardListener.start');
      await this.handleStartError(error);
    }
  }

  /**
   * Stop listening to keyboard events
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.uiohook) {
      this.errorLogger.logWarning('KeyboardListener is not running', 'KeyboardListener.stop');
      return;
    }

    try {
      await this.uiohook.stop();
      this.isRunning = false;
      this.uiohook = null;
      console.log('KeyboardListener stopped successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'KeyboardListener.stop');
      throw err;
    }
  }

  /**
   * Handle keyboard events and emit keystroke events
   */
  private handleKeyEvent(event: UiohookKeyboardEvent): void {
    // Prevent concurrent event processing
    if (this.processingEvent) {
      console.log(`Event dropped: concurrent processing (keyCode=${event.keycode})`);
      return;
    }

    this.processingEvent = true;

    try {
      const now = Date.now();
      
      // Filter out invalid key codes (system events, mouse events, etc.)
      if (!isValidKeyCode(event.keycode)) {
        console.log(`Invalid keycode filtered: ${event.keycode}`);
        return;
      }
      
      // Create a unique key for this event
      const eventKey = `${event.keycode}`;
      
      // Check if we've seen this exact event recently
      const lastSeenTime = this.eventCache.get(eventKey);
      if (lastSeenTime && (now - lastSeenTime) < this.MIN_EVENT_INTERVAL) {
        console.log(`Duplicate event filtered: keyCode=${event.keycode}, timeDiff=${now - lastSeenTime}ms`);
        return;
      }
      
      // Additional check: same key as last event and too close in time
      if (event.keycode === this.lastEventKeyCode && 
          (now - this.lastEventTimestamp) < this.MIN_EVENT_INTERVAL) {
        console.log(`Sequential duplicate filtered: keyCode=${event.keycode}, timeDiff=${now - this.lastEventTimestamp}ms`);
        return;
      }
      
      // Update cache and last event tracking
      this.eventCache.set(eventKey, now);
      this.lastEventTimestamp = now;
      this.lastEventKeyCode = event.keycode;
      
      const keyName = keyCodeToName(event.keycode);
      const keystrokeEvent: KeystrokeEvent = {
        keyCode: event.keycode,
        keyName: keyName,
        timestamp: now
      };

      console.log(`✓ Keystroke emitted: ${keyName} (${event.keycode}) at ${now}`);
      this.emit('keystroke', keystrokeEvent);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'KeyboardListener.handleKeyEvent');
      this.emit('error', err);
    } finally {
      this.processingEvent = false;
    }
  }

  /**
   * Handle errors during start with retry logic
   */
  private async handleStartError(error: unknown): Promise<void> {
    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      this.errorLogger.logWarning(
        `Retrying to start KeyboardListener (${this.retryCount}/${this.maxRetries})`,
        'KeyboardListener.handleStartError'
      );
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      await this.start();
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const finalError = new Error(
        `Failed to start KeyboardListener after ${this.maxRetries} attempts: ${errorMessage}`
      );
      this.errorLogger.logError(finalError, 'KeyboardListener.handleStartError');
      this.emit('error', finalError);
      throw finalError;
    }
  }

  /**
   * Check if the listener is currently running
   */
  isListening(): boolean {
    return this.isRunning;
  }
}

/**
 * Key code mapping table
 * Maps uiohook key codes to human-readable key names
 */
const KEY_CODE_MAP: Record<number, string> = {
  // Letters (A-Z)
  30: 'A', 48: 'B', 46: 'C', 32: 'D', 18: 'E', 33: 'F', 34: 'G', 35: 'H',
  23: 'I', 36: 'J', 37: 'K', 38: 'L', 50: 'M', 49: 'N', 24: 'O', 25: 'P',
  16: 'Q', 19: 'R', 31: 'S', 20: 'T', 22: 'U', 47: 'V', 17: 'W', 45: 'X',
  21: 'Y', 44: 'Z',

  // Numbers (0-9) - top row
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',

  // Function keys (F1-F12)
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6',
  65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',

  // Modifier keys
  42: 'Shift', 29: 'Ctrl', 56: 'Alt', 3675: 'Meta', // Left modifiers
  54: 'RightShift', 3613: 'RightCtrl', 3640: 'RightAlt',

  // Special keys (corrected based on actual testing)
  28: 'Enter', 57: 'Space', 14: 'Backspace', 15: 'Tab', 1: 'Escape',
  58: 'CapsLock', 
  3657: 'PageUp',      // TESTED
  3665: 'PageDown',    // TESTED
  3666: 'Insert',      // TESTED
  3667: 'Delete',      // TESTED
  3655: 'Home',        // TESTED
  3663: 'End',         // TESTED
  3639: 'PrintScreen', // TESTED
  3653: 'Pause',       // TESTED

  // Arrow keys (logical mapping - by function)
  57416: 'Up',
  57424: 'Down',
  57419: 'Left',
  57421: 'Right',

  // Symbols and punctuation
  12: '-', 13: '=', 26: '[', 27: ']', 43: '\\', 39: ';', 40: "'", 41: '`',
  51: ',', 52: '.', 53: '/',

  // Numpad (with NumLock on)
  82: 'Numpad0', 79: 'Numpad1', 80: 'Numpad2', 81: 'Numpad3',
  75: 'Numpad4', 76: 'Numpad5', 77: 'Numpad6', 71: 'Numpad7',
  72: 'Numpad8', 73: 'Numpad9',
  55: 'NumpadMultiply', 74: 'NumpadMinus', 78: 'NumpadPlus',
  3612: 'NumpadEnter', 83: 'NumpadDecimal', 3637: 'NumpadDivide',
  69: 'NumLock',
  
  // Numpad with NumLock OFF - logical mapping (by function, not physical key)
  61010: 'Insert',     // Numpad 0 when NumLock off
  61007: 'End',        // Numpad 1 when NumLock off
  61008: 'Down',       // Numpad 2 when NumLock off
  61009: 'PageDown',   // Numpad 3 when NumLock off
  61003: 'Left',       // Numpad 4 when NumLock off
  57420: 'Clear',      // Numpad 5 when NumLock off (no standard function)
  61005: 'Right',      // Numpad 6 when NumLock off
  60999: 'Home',       // Numpad 7 when NumLock off
  61000: 'Up',         // Numpad 8 when NumLock off
  61001: 'PageUp',     // Numpad 9 when NumLock off
  61011: 'Delete',     // Numpad . when NumLock off

  // Media keys
  57378: 'MediaPlayPause', 57380: 'MediaStop', 57360: 'MediaPrevious', 57369: 'MediaNext',
  57390: 'VolumeMute', 57392: 'VolumeDown', 57391: 'VolumeUp',

  // Other
  70: 'ScrollLock'
};

/**
 * Check if a key code is valid (represents an actual keyboard key)
 * @param keyCode - The uiohook key code
 * @returns true if the key code is valid, false otherwise
 */
export function isValidKeyCode(keyCode: number): boolean {
  // Key code 0 is invalid (often system events)
  if (keyCode === 0) {
    return false;
  }
  
  // Only accept key codes that are in our mapping table
  // This ensures we only track actual keyboard keys
  return keyCode in KEY_CODE_MAP;
}

/**
 * Convert a key code to a human-readable key name
 * @param keyCode - The uiohook key code
 * @returns The human-readable key name
 */
export function keyCodeToName(keyCode: number): string {
  // Check if we have a mapping for this key code
  if (keyCode in KEY_CODE_MAP) {
    return KEY_CODE_MAP[keyCode];
  }

  // Return a generic identifier for unknown keys
  return `Key${keyCode}`;
}

/**
 * Get the category of a key based on its name
 * @param keyName - The key name
 * @returns The category: 'letter', 'number', 'symbol', 'function', 'modifier', 'special', or 'unknown'
 */
export function getKeyCategory(keyName: string): string {
  // Letters
  if (/^[A-Z]$/.test(keyName)) {
    return 'letter';
  }

  // Numbers
  if (/^[0-9]$/.test(keyName) || keyName.startsWith('Numpad')) {
    return 'number';
  }

  // Function keys
  if (/^F\d+$/.test(keyName)) {
    return 'function';
  }

  // Modifier keys
  if (['Shift', 'Ctrl', 'Alt', 'Meta', 'RightShift', 'RightCtrl', 'RightAlt'].includes(keyName)) {
    return 'modifier';
  }

  // Special keys
  if (['Enter', 'Space', 'Backspace', 'Tab', 'Escape', 'CapsLock', 'Delete', 
       'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Up', 'Down', 'Left', 'Right',
       'NumLock', 'ScrollLock', 'Pause', 'PrintScreen'].includes(keyName)) {
    return 'special';
  }

  // Symbols
  if (['-', '=', '[', ']', '\\', ';', "'", '`', ',', '.', '/'].includes(keyName)) {
    return 'symbol';
  }

  // Media keys
  if (keyName.startsWith('Media') || keyName.startsWith('Volume')) {
    return 'special';
  }

  return 'unknown';
}
