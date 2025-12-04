// Basic test to verify Jest configuration
import { Keystroke, KeyStats } from './models';

describe('Models', () => {
  it('should define Keystroke interface correctly', () => {
    const keystroke: Keystroke = {
      keyCode: 65,
      keyName: 'A',
      timestamp: Date.now()
    };
    
    expect(keystroke.keyCode).toBe(65);
    expect(keystroke.keyName).toBe('A');
    expect(keystroke.timestamp).toBeGreaterThan(0);
  });

  it('should define KeyStats interface correctly', () => {
    const stats: KeyStats = {
      keyName: 'A',
      count: 10
    };
    
    expect(stats.keyName).toBe('A');
    expect(stats.count).toBe(10);
  });
});
