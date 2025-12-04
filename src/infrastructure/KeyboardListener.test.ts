import * as fc from 'fast-check';
import { KeyboardListener, keyCodeToName } from './KeyboardListener';
import { KeystrokeRepository } from './KeystrokeRepository';
import { KeystrokeEvent, Keystroke } from '../domain/models';
import * as fs from 'fs';

describe('KeyboardListener Property-Based Tests', () => {
  const testDbPath = './test-keyboard-listener.db';
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
  });

  /**
   * Feature: keyboard-stats-tracker, Property 1: 按键捕获完整性
   * Validates: Requirements 1.1, 1.4
   * 
   * For any key event, when the system captures that event, 
   * it should record the key identifier and timestamp in the data store.
   */
  describe('Property 1: Key Capture Completeness', () => {
    // Generator for valid key codes (based on the KEY_CODE_MAP in KeyboardListener)
    const validKeyCodeArbitrary = fc.oneof(
      // Letters
      fc.constantFrom(30, 48, 46, 32, 18, 33, 34, 35, 23, 36, 37, 38, 50, 49, 24, 25, 16, 19, 31, 20, 22, 47, 17, 45, 21, 44),
      // Numbers
      fc.constantFrom(11, 2, 3, 4, 5, 6, 7, 8, 9, 10),
      // Function keys
      fc.constantFrom(59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88),
      // Special keys
      fc.constantFrom(28, 57, 14, 15, 1, 58, 3653, 3666, 3667, 3663, 3664, 3657),
      // Arrow keys
      fc.constantFrom(57416, 57424, 57419, 57421),
      // Modifiers
      fc.constantFrom(42, 29, 56, 3675, 54, 3613, 3640)
    );

    // Generator for simulated keystroke events
    const keystrokeEventArbitrary = fc.record({
      keyCode: validKeyCodeArbitrary,
      timestamp: fc.integer({ min: Date.now() - 1000000, max: Date.now() })
    }).map(({ keyCode, timestamp }) => ({
      keyCode,
      keyName: keyCodeToName(keyCode),
      timestamp
    }));

    it('should record key identifier and timestamp for captured events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokeEventArbitrary, { minLength: 1, maxLength: 20 }),
          async (events) => {
            // Clear database before each test iteration
            await repository.clear();

            // Simulate capturing events and storing them
            const keystrokesToSave: Keystroke[] = events.map(event => ({
              keyCode: event.keyCode,
              keyName: event.keyName,
              timestamp: event.timestamp
            }));

            // Save the captured keystrokes
            await repository.save(keystrokesToSave);

            // Calculate the date range that covers all events
            const timestamps = events.map(e => e.timestamp);
            const minTimestamp = Math.min(...timestamps);
            const maxTimestamp = Math.max(...timestamps);
            
            const startDate = new Date(minTimestamp - 1000); // Add buffer
            const endDate = new Date(maxTimestamp + 1000);

            // Retrieve the stored keystrokes
            const retrieved = await repository.getByDateRange(startDate, endDate);

            // Verify that all events were captured and stored
            if (retrieved.length !== events.length) {
              return false;
            }

            // Sort both arrays by timestamp for comparison
            const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
            const sortedRetrieved = [...retrieved].sort((a, b) => a.timestamp - b.timestamp);

            // Verify each event has its key identifier and timestamp recorded
            for (let i = 0; i < sortedEvents.length; i++) {
              const event = sortedEvents[i];
              const stored = sortedRetrieved[i];

              // Check that key identifier (keyCode and keyName) is recorded
              if (stored.keyCode !== event.keyCode) {
                return false;
              }

              if (stored.keyName !== event.keyName) {
                return false;
              }

              // Check that timestamp is recorded
              if (stored.timestamp !== event.timestamp) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle single key event capture', async () => {
      await fc.assert(
        fc.asyncProperty(keystrokeEventArbitrary, async (event) => {
          // Clear database before each test iteration
          await repository.clear();

          // Simulate capturing a single event
          const keystroke: Keystroke = {
            keyCode: event.keyCode,
            keyName: event.keyName,
            timestamp: event.timestamp
          };

          // Save the captured keystroke
          await repository.save([keystroke]);

          // Retrieve the stored keystroke
          const startDate = new Date(event.timestamp - 1000);
          const endDate = new Date(event.timestamp + 1000);
          const retrieved = await repository.getByDateRange(startDate, endDate);

          // Verify the event was captured with key identifier and timestamp
          if (retrieved.length !== 1) {
            return false;
          }

          const stored = retrieved[0];
          return (
            stored.keyCode === event.keyCode &&
            stored.keyName === event.keyName &&
            stored.timestamp === event.timestamp
          );
        }),
        { numRuns: 100 }
      );
    }, 30000);

    it('should preserve key identifiers for all key types', async () => {
      // Test that different key types (letters, numbers, function keys, etc.) 
      // all have their identifiers properly recorded
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokeEventArbitrary, { minLength: 5, maxLength: 15 }),
          async (events) => {
            // Clear database before each test iteration
            await repository.clear();

            // Save all events
            const keystrokes: Keystroke[] = events.map(e => ({
              keyCode: e.keyCode,
              keyName: e.keyName,
              timestamp: e.timestamp
            }));

            await repository.save(keystrokes);

            // Retrieve all events
            const retrieved = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            // Verify all key names are non-empty (identifier is recorded)
            for (const stored of retrieved) {
              if (!stored.keyName || stored.keyName.length === 0) {
                return false;
              }
              
              // Verify keyCode is valid
              if (stored.keyCode < 0) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should record timestamps within reasonable time bounds', async () => {
      // Verify that timestamps are recorded and are reasonable values
      await fc.assert(
        fc.asyncProperty(
          fc.array(keystrokeEventArbitrary, { minLength: 1, maxLength: 10 }),
          async (events) => {
            // Clear database before each test iteration
            await repository.clear();

            // Save events
            const keystrokes: Keystroke[] = events.map(e => ({
              keyCode: e.keyCode,
              keyName: e.keyName,
              timestamp: e.timestamp
            }));

            await repository.save(keystrokes);

            // Retrieve events
            const retrieved = await repository.getByDateRange(
              new Date(0),
              new Date(Date.now() + 1000)
            );

            // Verify all timestamps are positive and reasonable
            for (const stored of retrieved) {
              if (stored.timestamp <= 0) {
                return false;
              }
              
              // Timestamp should be in the past or very recent
              if (stored.timestamp > Date.now() + 10000) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: keyboard-stats-tracker, Property 14: 组合键独立计数
   * Validates: Requirements 9.4
   * 
   * For any combination key event (like Ctrl+C), the system should
   * separately increment the counter for each key.
   */
  describe('Property 14: Combination Key Independent Counting', () => {
    // Generator for modifier keys
    const modifierKeyArbitrary = fc.constantFrom(
      { keyCode: 29, keyName: 'Ctrl' },
      { keyCode: 42, keyName: 'Shift' },
      { keyCode: 56, keyName: 'Alt' },
      { keyCode: 3675, keyName: 'Meta' }
    );

    // Generator for regular keys (letters, numbers)
    const regularKeyArbitrary = fc.oneof(
      fc.constantFrom(30, 48, 46, 32, 18, 33, 34, 35, 23, 36, 37, 38, 50, 49, 24, 25, 16, 19, 31, 20, 22, 47, 17, 45, 21, 44)
        .map(code => ({ keyCode: code, keyName: keyCodeToName(code) })),
      fc.constantFrom(11, 2, 3, 4, 5, 6, 7, 8, 9, 10)
        .map(code => ({ keyCode: code, keyName: keyCodeToName(code) }))
    );

    it('should count each key in a combination independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(modifierKeyArbitrary, regularKeyArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          async (combinations) => {
            // Clear database before each test iteration
            await repository.clear();

            // Simulate combination key presses
            // For each combination (e.g., Ctrl+C), we record both keys separately
            const allKeystrokes: Keystroke[] = [];
            const timestamp = Date.now();

            for (const [modifier, regular] of combinations) {
              // When a combination is pressed, both keys are recorded separately
              allKeystrokes.push({
                keyCode: modifier.keyCode,
                keyName: modifier.keyName,
                timestamp: timestamp
              });
              allKeystrokes.push({
                keyCode: regular.keyCode,
                keyName: regular.keyName,
                timestamp: timestamp + 1
              });
            }

            // Save all keystrokes
            await repository.save(allKeystrokes);

            // Get statistics
            const stats = await repository.getStatsByPeriod('day', new Date(timestamp));

            // Count expected occurrences for each key
            const expectedCounts = new Map<string, number>();
            for (const keystroke of allKeystrokes) {
              const currentCount = expectedCounts.get(keystroke.keyName) || 0;
              expectedCounts.set(keystroke.keyName, currentCount + 1);
            }

            // Verify that each key has its own independent count
            for (const [keyName, expectedCount] of expectedCounts.entries()) {
              const stat = stats.find(s => s.keyName === keyName);
              if (!stat || stat.count !== expectedCount) {
                return false;
              }
            }

            // Verify that the total number of unique keys matches
            if (stats.length !== expectedCounts.size) {
              return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should increment both modifier and regular key counters for combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          modifierKeyArbitrary,
          regularKeyArbitrary,
          fc.integer({ min: 1, max: 20 }),
          async (modifier, regular, repeatCount) => {
            // Clear database before each test iteration
            await repository.clear();

            // Simulate pressing the same combination multiple times
            const keystrokes: Keystroke[] = [];
            const baseTimestamp = Date.now();

            for (let i = 0; i < repeatCount; i++) {
              // Each combination press records both keys
              keystrokes.push({
                keyCode: modifier.keyCode,
                keyName: modifier.keyName,
                timestamp: baseTimestamp + i * 10
              });
              keystrokes.push({
                keyCode: regular.keyCode,
                keyName: regular.keyName,
                timestamp: baseTimestamp + i * 10 + 1
              });
            }

            // Save all keystrokes
            await repository.save(keystrokes);

            // Get statistics
            const stats = await repository.getStatsByPeriod('day', new Date(baseTimestamp));

            // Find the counts for both keys
            const modifierStat = stats.find(s => s.keyName === modifier.keyName);
            const regularStat = stats.find(s => s.keyName === regular.keyName);

            // Both keys should have been counted exactly repeatCount times
            if (!modifierStat || modifierStat.count !== repeatCount) {
              return false;
            }

            if (!regularStat || regularStat.count !== repeatCount) {
              return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle multiple different modifiers with the same key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(modifierKeyArbitrary, { minLength: 2, maxLength: 4 }),
          regularKeyArbitrary,
          async (modifiers, regular) => {
            // Clear database before each test iteration
            await repository.clear();

            // Simulate pressing the same key with different modifiers
            // e.g., Ctrl+C, Shift+C, Alt+C
            const keystrokes: Keystroke[] = [];
            const baseTimestamp = Date.now();

            for (let i = 0; i < modifiers.length; i++) {
              const modifier = modifiers[i];
              keystrokes.push({
                keyCode: modifier.keyCode,
                keyName: modifier.keyName,
                timestamp: baseTimestamp + i * 10
              });
              keystrokes.push({
                keyCode: regular.keyCode,
                keyName: regular.keyName,
                timestamp: baseTimestamp + i * 10 + 1
              });
            }

            // Save all keystrokes
            await repository.save(keystrokes);

            // Get statistics
            const stats = await repository.getStatsByPeriod('day', new Date(baseTimestamp));

            // Count expected occurrences
            const expectedCounts = new Map<string, number>();
            for (const keystroke of keystrokes) {
              const currentCount = expectedCounts.get(keystroke.keyName) || 0;
              expectedCounts.set(keystroke.keyName, currentCount + 1);
            }

            // Verify each key has the correct independent count
            for (const [keyName, expectedCount] of expectedCounts.entries()) {
              const stat = stats.find(s => s.keyName === keyName);
              if (!stat || stat.count !== expectedCount) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should count standalone key presses separately from combination presses', async () => {
      await fc.assert(
        fc.asyncProperty(
          regularKeyArbitrary,
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (key, standaloneCount, combinationCount) => {
            // Clear database before each test iteration
            await repository.clear();

            const keystrokes: Keystroke[] = [];
            const baseTimestamp = Date.now();
            let timestampOffset = 0;

            // Add standalone key presses
            for (let i = 0; i < standaloneCount; i++) {
              keystrokes.push({
                keyCode: key.keyCode,
                keyName: key.keyName,
                timestamp: baseTimestamp + timestampOffset++
              });
            }

            // Add combination key presses (Ctrl + key)
            const ctrlKey = { keyCode: 29, keyName: 'Ctrl' };
            for (let i = 0; i < combinationCount; i++) {
              keystrokes.push({
                keyCode: ctrlKey.keyCode,
                keyName: ctrlKey.keyName,
                timestamp: baseTimestamp + timestampOffset++
              });
              keystrokes.push({
                keyCode: key.keyCode,
                keyName: key.keyName,
                timestamp: baseTimestamp + timestampOffset++
              });
            }

            // Save all keystrokes
            await repository.save(keystrokes);

            // Get statistics
            const stats = await repository.getStatsByPeriod('day', new Date(baseTimestamp));

            // The key should be counted for both standalone and combination presses
            const keyStat = stats.find(s => s.keyName === key.keyName);
            const expectedKeyCount = standaloneCount + combinationCount;

            if (!keyStat || keyStat.count !== expectedKeyCount) {
              return false;
            }

            // Ctrl should only be counted for combination presses
            const ctrlStat = stats.find(s => s.keyName === ctrlKey.keyName);
            if (!ctrlStat || ctrlStat.count !== combinationCount) {
              return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Key Code to Name Mapping', () => {
    it('should map all valid key codes to human-readable names', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constantFrom(30, 48, 46, 32, 18, 33, 34, 35, 23, 36, 37, 38, 50, 49, 24, 25, 16, 19, 31, 20, 22, 47, 17, 45, 21, 44),
            fc.constantFrom(11, 2, 3, 4, 5, 6, 7, 8, 9, 10),
            fc.constantFrom(59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88)
          ),
          (keyCode) => {
            const keyName = keyCodeToName(keyCode);
            
            // Should return a non-empty string
            if (!keyName || keyName.length === 0) {
              return false;
            }
            
            // Should not return the generic format for known keys
            if (keyName.startsWith('Key') && keyName !== 'Key') {
              return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return generic identifier for unknown key codes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 99999 }), // Use very high key codes that are unlikely to be mapped
          (keyCode) => {
            const keyName = keyCodeToName(keyCode);
            
            // Should return a generic identifier in the format "KeyXXXXX"
            return keyName === `Key${keyCode}`;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: keyboard-stats-tracker, Property 13: 按键识别准确性
   * Validates: Requirements 9.1, 9.2, 9.3
   * 
   * For any key code, the system should correctly map it to the corresponding
   * key category (letter, number, symbol, function, modifier, special) and
   * human-readable name.
   */
  describe('Property 13: Key Identification Accuracy', () => {
    // Import getKeyCategory for testing
    const { getKeyCategory } = require('./KeyboardListener');

    // Generator for letter key codes (A-Z)
    const letterKeyCodeArbitrary = fc.constantFrom(
      30, 48, 46, 32, 18, 33, 34, 35, 23, 36, 37, 38, 50, 49, 24, 25, 16, 19, 31, 20, 22, 47, 17, 45, 21, 44
    );

    // Generator for number key codes (0-9)
    const numberKeyCodeArbitrary = fc.constantFrom(11, 2, 3, 4, 5, 6, 7, 8, 9, 10);

    // Generator for symbol key codes
    const symbolKeyCodeArbitrary = fc.constantFrom(12, 13, 26, 27, 43, 39, 40, 41, 51, 52, 53);

    // Generator for function key codes (F1-F12)
    const functionKeyCodeArbitrary = fc.constantFrom(59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88);

    // Generator for modifier key codes
    const modifierKeyCodeArbitrary = fc.constantFrom(42, 29, 56, 3675, 54, 3613, 3640);

    // Generator for special key codes
    const specialKeyCodeArbitrary = fc.constantFrom(
      28, 57, 14, 15, 1, 58, 3653, 3666, 3667, 3663, 3664, 3657,
      57416, 57424, 57419, 57421, 69, 70, 3639, 3655
    );

    it('should correctly identify letter keys (A-Z)', () => {
      fc.assert(
        fc.property(letterKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the key name is a single uppercase letter
          const isValidLetterName = /^[A-Z]$/.test(keyName);
          
          // Verify the category is 'letter'
          const isCorrectCategory = category === 'letter';

          // Verify the name is human-readable (not a generic identifier)
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          return isValidLetterName && isCorrectCategory && isHumanReadable;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify number keys (0-9)', () => {
      fc.assert(
        fc.property(numberKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the key name is a single digit
          const isValidNumberName = /^[0-9]$/.test(keyName);
          
          // Verify the category is 'number'
          const isCorrectCategory = category === 'number';

          // Verify the name is human-readable
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          return isValidNumberName && isCorrectCategory && isHumanReadable;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify symbol keys', () => {
      fc.assert(
        fc.property(symbolKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the category is 'symbol'
          const isCorrectCategory = category === 'symbol';

          // Verify the name is human-readable (should be the actual symbol)
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          // Verify it's a valid symbol character
          const isValidSymbol = ['-', '=', '[', ']', '\\', ';', "'", '`', ',', '.', '/'].includes(keyName);

          return isCorrectCategory && isHumanReadable && isValidSymbol;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify function keys (F1-F12)', () => {
      fc.assert(
        fc.property(functionKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the key name matches the pattern F1-F12
          const isValidFunctionName = /^F([1-9]|1[0-2])$/.test(keyName);
          
          // Verify the category is 'function'
          const isCorrectCategory = category === 'function';

          // Verify the name is human-readable
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          return isValidFunctionName && isCorrectCategory && isHumanReadable;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify modifier keys (Shift, Ctrl, Alt)', () => {
      fc.assert(
        fc.property(modifierKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the category is 'modifier'
          const isCorrectCategory = category === 'modifier';

          // Verify the name is human-readable
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          // Verify it's a valid modifier key name
          const validModifiers = ['Shift', 'Ctrl', 'Alt', 'Meta', 'RightShift', 'RightCtrl', 'RightAlt'];
          const isValidModifier = validModifiers.includes(keyName);

          return isCorrectCategory && isHumanReadable && isValidModifier;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify special keys (Enter, Space, Backspace, etc.)', () => {
      fc.assert(
        fc.property(specialKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);
          const category = getKeyCategory(keyName);

          // Verify the category is 'special'
          const isCorrectCategory = category === 'special';

          // Verify the name is human-readable
          const isHumanReadable = !keyName.startsWith('Key') || keyName === 'Key';

          // Verify it's a valid special key name
          const validSpecialKeys = [
            'Enter', 'Space', 'Backspace', 'Tab', 'Escape', 'CapsLock', 'Delete',
            'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Up', 'Down', 'Left', 'Right',
            'NumLock', 'ScrollLock', 'Pause', 'PrintScreen'
          ];
          const isValidSpecialKey = validSpecialKeys.includes(keyName);

          return isCorrectCategory && isHumanReadable && isValidSpecialKey;
        }),
        { numRuns: 100 }
      );
    });

    it('should map all key codes to human-readable names (not just key codes)', () => {
      // Test across all key categories
      const allKeyCodesArbitrary = fc.oneof(
        letterKeyCodeArbitrary,
        numberKeyCodeArbitrary,
        symbolKeyCodeArbitrary,
        functionKeyCodeArbitrary,
        modifierKeyCodeArbitrary,
        specialKeyCodeArbitrary
      );

      fc.assert(
        fc.property(allKeyCodesArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);

          // Verify the name is not empty
          if (!keyName || keyName.length === 0) {
            return false;
          }

          // Verify the name is human-readable (not a generic "KeyXXX" format for known keys)
          // Known keys should have meaningful names
          if (keyName.startsWith('Key') && /^Key\d+$/.test(keyName)) {
            return false; // This would be a generic identifier, which is wrong for known keys
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should consistently map the same key code to the same name and category', () => {
      // Test that mapping is deterministic
      const allKeyCodesArbitrary = fc.oneof(
        letterKeyCodeArbitrary,
        numberKeyCodeArbitrary,
        symbolKeyCodeArbitrary,
        functionKeyCodeArbitrary,
        modifierKeyCodeArbitrary,
        specialKeyCodeArbitrary
      );

      fc.assert(
        fc.property(allKeyCodesArbitrary, (keyCode) => {
          // Call the mapping function multiple times
          const keyName1 = keyCodeToName(keyCode);
          const keyName2 = keyCodeToName(keyCode);
          const keyName3 = keyCodeToName(keyCode);

          const category1 = getKeyCategory(keyName1);
          const category2 = getKeyCategory(keyName2);
          const category3 = getKeyCategory(keyName3);

          // Verify consistency
          return (
            keyName1 === keyName2 &&
            keyName2 === keyName3 &&
            category1 === category2 &&
            category2 === category3
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle unknown key codes with generic identifiers', () => {
      // Test that unknown key codes get generic identifiers
      const unknownKeyCodeArbitrary = fc.integer({ min: 10000, max: 99999 });

      fc.assert(
        fc.property(unknownKeyCodeArbitrary, (keyCode) => {
          const keyName = keyCodeToName(keyCode);

          // Should return a generic identifier in the format "KeyXXXXX"
          const isGenericFormat = keyName === `Key${keyCode}`;

          // Category should be 'unknown'
          const category = getKeyCategory(keyName);
          const isUnknownCategory = category === 'unknown';

          return isGenericFormat && isUnknownCategory;
        }),
        { numRuns: 100 }
      );
    });
  });
});
