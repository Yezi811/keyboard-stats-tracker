// Test to verify fast-check configuration
import * as fc from 'fast-check';

describe('Fast-check configuration', () => {
  it('should run property-based tests', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate keystroke-like data', () => {
    const keystrokeArbitrary = fc.record({
      keyCode: fc.integer({ min: 0, max: 255 }),
      keyName: fc.string({ minLength: 1, maxLength: 20 }),
      timestamp: fc.integer({ min: 0, max: Date.now() })
    });

    fc.assert(
      fc.property(keystrokeArbitrary, (keystroke) => {
        return keystroke.keyCode >= 0 && keystroke.keyCode <= 255;
      }),
      { numRuns: 100 }
    );
  });
});
