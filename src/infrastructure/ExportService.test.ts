import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';
import { ExportService } from './ExportService';
import { Keystroke } from '../domain/models';

describe('ExportService', () => {
  let exportService: ExportService;
  const testDir = path.join(__dirname, '../../test-exports');

  beforeEach(() => {
    exportService = new ExportService();
    
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  describe('exportToJSON', () => {
    it('should export keystrokes to JSON format', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
      ];

      const filePath = path.join(testDir, 'test.json');
      await exportService.exportToJSON(keystrokes, filePath);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(keystrokes[0]);
      expect(parsed[1]).toEqual(keystrokes[1]);
    });

    it('should filter keystrokes by date range', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
        { id: 3, keyCode: 67, keyName: 'C', timestamp: 3000000 },
      ];

      const filePath = path.join(testDir, 'filtered.json');
      const startDate = new Date(1500000);
      const endDate = new Date(2500000);

      await exportService.exportToJSON(keystrokes, filePath, startDate, endDate);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(2);
    });

    it('should create directory if it does not exist', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
      ];

      const nestedDir = path.join(testDir, 'nested', 'path');
      const filePath = path.join(nestedDir, 'test.json');

      await exportService.exportToJSON(keystrokes, filePath);

      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up nested directories
      fs.unlinkSync(filePath);
      fs.rmdirSync(path.join(testDir, 'nested', 'path'));
      fs.rmdirSync(path.join(testDir, 'nested'));
    });

    it('should throw error on write failure', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
      ];

      // Create a directory with the same name as the file to trigger error
      const conflictPath = path.join(testDir, 'conflict');
      fs.mkdirSync(conflictPath, { recursive: true });

      await expect(
        exportService.exportToJSON(keystrokes, conflictPath)
      ).rejects.toThrow('Failed to export to JSON');

      // Clean up
      fs.rmdirSync(conflictPath);
    });
  });

  describe('exportToCSV', () => {
    it('should export keystrokes to CSV format with header', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1609459200000 }, // 2021-01-01 00:00:00
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 1609545600000 }, // 2021-01-02 00:00:00
      ];

      const filePath = path.join(testDir, 'test.csv');
      await exportService.exportToCSV(keystrokes, filePath);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check header
      expect(lines[0]).toBe('id,keyCode,keyName,timestamp,date,time');

      // Check data rows
      expect(lines[1]).toContain('1,65,"A",1609459200000');
      expect(lines[2]).toContain('2,66,"B",1609545600000');
    });

    it('should escape special characters in CSV', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'Key"With"Quotes', timestamp: 1000000 },
      ];

      const filePath = path.join(testDir, 'escaped.csv');
      await exportService.exportToCSV(keystrokes, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Double quotes should be escaped as ""
      expect(content).toContain('Key""With""Quotes');
    });

    it('should filter keystrokes by date range', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
        { id: 3, keyCode: 67, keyName: 'C', timestamp: 3000000 },
      ];

      const filePath = path.join(testDir, 'filtered.csv');
      const startDate = new Date(1500000);
      const endDate = new Date(2500000);

      await exportService.exportToCSV(keystrokes, filePath, startDate, endDate);

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      // Header + 1 data row
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('2,66,"B"');
    });

    it('should create directory if it does not exist', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
      ];

      const nestedDir = path.join(testDir, 'nested', 'csv');
      const filePath = path.join(nestedDir, 'test.csv');

      await exportService.exportToCSV(keystrokes, filePath);

      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up nested directories
      fs.unlinkSync(filePath);
      fs.rmdirSync(path.join(testDir, 'nested', 'csv'));
      fs.rmdirSync(path.join(testDir, 'nested'));
    });

    it('should throw error on write failure', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
      ];

      // Create a directory with the same name as the file to trigger error
      const conflictPath = path.join(testDir, 'csv-conflict');
      fs.mkdirSync(conflictPath, { recursive: true });

      await expect(
        exportService.exportToCSV(keystrokes, conflictPath)
      ).rejects.toThrow('Failed to export to CSV');

      // Clean up
      fs.rmdirSync(conflictPath);
    });

    it('should handle empty data', async () => {
      const keystrokes: Keystroke[] = [];

      const filePath = path.join(testDir, 'empty.csv');
      await exportService.exportToCSV(keystrokes, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      // Only header should be present
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('id,keyCode,keyName,timestamp,date,time');
    });
  });

  describe('date range filtering', () => {
    it('should include keystrokes at exact start boundary', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
      ];

      const filePath = path.join(testDir, 'boundary.json');
      const startDate = new Date(1000000);

      await exportService.exportToJSON(keystrokes, filePath, startDate);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(2);
    });

    it('should include keystrokes at exact end boundary', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
      ];

      const filePath = path.join(testDir, 'boundary.json');
      const endDate = new Date(2000000);

      await exportService.exportToJSON(keystrokes, filePath, undefined, endDate);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(2);
    });

    it('should return all data when no date range specified', async () => {
      const keystrokes: Keystroke[] = [
        { id: 1, keyCode: 65, keyName: 'A', timestamp: 1000000 },
        { id: 2, keyCode: 66, keyName: 'B', timestamp: 2000000 },
        { id: 3, keyCode: 67, keyName: 'C', timestamp: 3000000 },
      ];

      const filePath = path.join(testDir, 'all.json');

      await exportService.exportToJSON(keystrokes, filePath);

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(3);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: keyboard-stats-tracker, Property 10: JSON 导出往返
     * Validates: Requirements 7.2
     * 
     * For any keystroke data collection, exporting to JSON then parsing
     * should produce equivalent data with complete timestamp and key information
     */
    it('Property 10: JSON export round-trip preserves data integrity', async () => {
      // Generator for valid keystroke data
      const keystrokeArbitrary = fc.record({
        id: fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: undefined }),
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: fc.integer({ min: 0, max: Date.now() })
      });

      const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          const filePath = path.join(testDir, `roundtrip-${Date.now()}-${Math.random()}.json`);

          try {
            // Export to JSON
            await exportService.exportToJSON(keystrokes, filePath);

            // Read and parse the JSON file
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed: Keystroke[] = JSON.parse(content);

            // Verify the data is equivalent
            expect(parsed).toHaveLength(keystrokes.length);

            // Check each keystroke for complete information
            for (let i = 0; i < keystrokes.length; i++) {
              const original = keystrokes[i];
              const restored = parsed[i];

              // Verify all required fields are present and equal
              expect(restored.keyCode).toBe(original.keyCode);
              expect(restored.keyName).toBe(original.keyName);
              expect(restored.timestamp).toBe(original.timestamp);
              
              // Verify id is preserved (including undefined)
              expect(restored.id).toBe(original.id);
            }

            return true;
          } finally {
            // Clean up test file
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: keyboard-stats-tracker, Property 11: CSV 格式正确性
     * Validates: Requirements 7.3
     * 
     * For any keystroke data collection, exporting to CSV should produce
     * standard comma-separated format with header and all data rows
     */
    it('Property 11: CSV export produces valid standard format', async () => {
      // Generator for valid keystroke data
      const keystrokeArbitrary = fc.record({
        id: fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: undefined }),
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: fc.integer({ min: 0, max: Date.now() })
      });

      const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(keystrokesArrayArbitrary, async (keystrokes) => {
          const filePath = path.join(testDir, `csv-format-${Date.now()}-${Math.random()}.csv`);

          try {
            // Export to CSV
            await exportService.exportToCSV(keystrokes, filePath);

            // Read the CSV file
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            // Verify header is present and correct
            expect(lines.length).toBeGreaterThan(0);
            const header = lines[0];
            expect(header).toBe('id,keyCode,keyName,timestamp,date,time');

            // Verify number of data rows matches input
            const dataRows = lines.slice(1);
            expect(dataRows.length).toBe(keystrokes.length);

            // Verify each row is properly formatted
            for (let i = 0; i < keystrokes.length; i++) {
              const original = keystrokes[i];
              const row = dataRows[i];

              // Verify row contains comma separators
              expect(row).toContain(',');

              // Parse the row (basic CSV parsing)
              const fields = row.split(',');
              
              // Should have at least 6 fields (id, keyCode, keyName, timestamp, date, time)
              // Note: keyName is quoted, so it might contain commas
              expect(fields.length).toBeGreaterThanOrEqual(6);

              // Verify id field
              const idField = fields[0];
              if (original.id !== undefined) {
                expect(idField).toBe(String(original.id));
              } else {
                expect(idField).toBe('');
              }

              // Verify keyCode field
              const keyCodeField = fields[1];
              expect(keyCodeField).toBe(String(original.keyCode));

              // Verify timestamp field (should be in the row)
              expect(row).toContain(String(original.timestamp));

              // Verify keyName is quoted (standard CSV format)
              expect(row).toMatch(/"[^"]*"/);

              // Verify date and time fields are present (ISO format components)
              // Date should be YYYY-MM-DD format
              expect(row).toMatch(/\d{4}-\d{2}-\d{2}/);
              // Time should be HH:MM:SS format
              expect(row).toMatch(/\d{2}:\d{2}:\d{2}/);
            }

            return true;
          } finally {
            // Clean up test file
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: keyboard-stats-tracker, Property 12: 导出范围过滤
     * Validates: Requirements 7.4
     * 
     * For any time range, exported data should only include keystroke records
     * within that range
     */
    it('Property 12: Export range filtering includes only records within specified range', async () => {
      // Generator for valid keystroke data with timestamps
      const keystrokeArbitrary = fc.record({
        id: fc.option(fc.integer({ min: 1, max: 1000000 }), { nil: undefined }),
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: fc.integer({ min: 1000000, max: 10000000000 }) // Reasonable timestamp range
      });

      const keystrokesArrayArbitrary = fc.array(keystrokeArbitrary, { minLength: 1, maxLength: 100 });

      // Generator for date ranges
      const dateRangeArbitrary = fc.tuple(
        fc.integer({ min: 1000000, max: 10000000000 }),
        fc.integer({ min: 1000000, max: 10000000000 })
      ).map(([t1, t2]) => {
        const start = Math.min(t1, t2);
        const end = Math.max(t1, t2);
        return { startDate: new Date(start), endDate: new Date(end) };
      });

      await fc.assert(
        fc.asyncProperty(
          keystrokesArrayArbitrary,
          dateRangeArbitrary,
          async (keystrokes, { startDate, endDate }) => {
            const filePathJSON = path.join(testDir, `range-filter-${Date.now()}-${Math.random()}.json`);
            const filePathCSV = path.join(testDir, `range-filter-${Date.now()}-${Math.random()}.csv`);

            try {
              // Test JSON export with range filtering
              await exportService.exportToJSON(keystrokes, filePathJSON, startDate, endDate);

              const jsonContent = fs.readFileSync(filePathJSON, 'utf-8');
              const parsedJSON: Keystroke[] = JSON.parse(jsonContent);

              // Verify all exported records are within the range
              for (const keystroke of parsedJSON) {
                expect(keystroke.timestamp).toBeGreaterThanOrEqual(startDate.getTime());
                expect(keystroke.timestamp).toBeLessThanOrEqual(endDate.getTime());
              }

              // Verify no records outside the range are included
              const expectedCount = keystrokes.filter(k => 
                k.timestamp >= startDate.getTime() && k.timestamp <= endDate.getTime()
              ).length;
              expect(parsedJSON.length).toBe(expectedCount);

              // Test CSV export with range filtering
              await exportService.exportToCSV(keystrokes, filePathCSV, startDate, endDate);

              const csvContent = fs.readFileSync(filePathCSV, 'utf-8');
              const lines = csvContent.split('\n').filter(line => line.trim());
              const dataRows = lines.slice(1); // Skip header

              // Verify CSV has the same number of filtered records
              expect(dataRows.length).toBe(expectedCount);

              // Verify each CSV row contains a timestamp within range
              for (const row of dataRows) {
                // Extract timestamp from CSV row (4th field after keyName which is quoted)
                // Format: id,keyCode,"keyName",timestamp,date,time
                // We need to match the timestamp after the quoted keyName field
                const timestampMatch = row.match(/"[^"]*",(\d+),/);
                if (timestampMatch) {
                  const timestamp = parseInt(timestampMatch[1], 10);
                  expect(timestamp).toBeGreaterThanOrEqual(startDate.getTime());
                  expect(timestamp).toBeLessThanOrEqual(endDate.getTime());
                }
              }

              return true;
            } finally {
              // Clean up test files
              if (fs.existsSync(filePathJSON)) {
                fs.unlinkSync(filePathJSON);
              }
              if (fs.existsSync(filePathCSV)) {
                fs.unlinkSync(filePathCSV);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
