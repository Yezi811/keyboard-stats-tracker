/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock';
import { ChartRenderer, TrendData } from './ChartRenderer';
import { KeyStats } from '../domain/models';
import * as fc from 'fast-check';

describe('ChartRenderer', () => {
  let renderer: ChartRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    renderer = new ChartRenderer();
    mockCanvas = document.createElement('canvas');
  });

  afterEach(() => {
    renderer.destroy();
  });

  describe('renderBarChart', () => {
    it('should create a bar chart with correct data', () => {
      const data: KeyStats[] = [
        { keyName: 'A', count: 100 },
        { keyName: 'B', count: 50 },
        { keyName: 'C', count: 75 }
      ];

      renderer.renderBarChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart).not.toBeNull();
      expect((chart?.config as any).type).toBe('bar');
      expect(chart?.data.labels).toEqual(['A', 'B', 'C']);
      expect(chart?.data.datasets[0].data).toEqual([100, 50, 75]);
    });

    it('should handle empty data', () => {
      const data: KeyStats[] = [];

      renderer.renderBarChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart).not.toBeNull();
      expect(chart?.data.labels).toEqual([]);
      expect(chart?.data.datasets[0].data).toEqual([]);
    });

    it('should destroy previous chart before creating new one', () => {
      const data1: KeyStats[] = [{ keyName: 'A', count: 10 }];
      const data2: KeyStats[] = [{ keyName: 'B', count: 20 }];

      renderer.renderBarChart(data1, mockCanvas);
      const firstChart = renderer.getChart();
      const destroySpy = jest.spyOn(firstChart!, 'destroy');

      renderer.renderBarChart(data2, mockCanvas);

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('renderLineChart', () => {
    it('should create a line chart with correct data', () => {
      const data: TrendData[] = [
        { label: 'Day 1', value: 100 },
        { label: 'Day 2', value: 150 },
        { label: 'Day 3', value: 120 }
      ];

      renderer.renderLineChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart).not.toBeNull();
      expect((chart?.config as any).type).toBe('line');
      expect(chart?.data.labels).toEqual(['Day 1', 'Day 2', 'Day 3']);
      expect(chart?.data.datasets[0].data).toEqual([100, 150, 120]);
    });

    it('should use custom title when provided', () => {
      const data: TrendData[] = [{ label: 'Test', value: 10 }];
      const customTitle = '月度趋势';

      renderer.renderLineChart(data, mockCanvas, customTitle);

      const chart = renderer.getChart();
      expect(chart?.options?.plugins?.title?.text).toBe(customTitle);
    });

    it('should handle empty data', () => {
      const data: TrendData[] = [];

      renderer.renderLineChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart).not.toBeNull();
      expect(chart?.data.labels).toEqual([]);
      expect(chart?.data.datasets[0].data).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('should destroy the chart and set it to null', () => {
      const data: KeyStats[] = [{ keyName: 'A', count: 10 }];
      renderer.renderBarChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart).not.toBeNull();

      const destroySpy = jest.spyOn(chart!, 'destroy');
      renderer.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(renderer.getChart()).toBeNull();
    });

    it('should not throw error when called with no chart', () => {
      expect(() => renderer.destroy()).not.toThrow();
    });

    it('should allow multiple destroy calls', () => {
      const data: KeyStats[] = [{ keyName: 'A', count: 10 }];
      renderer.renderBarChart(data, mockCanvas);

      expect(() => {
        renderer.destroy();
        renderer.destroy();
      }).not.toThrow();
    });
  });

  describe('chart configuration', () => {
    it('should configure bar chart with proper styling', () => {
      const data: KeyStats[] = [{ keyName: 'A', count: 10 }];
      renderer.renderBarChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart?.options?.responsive).toBe(true);
      expect(chart?.options?.plugins?.legend?.display).toBe(true);
      expect(chart?.options?.plugins?.title?.display).toBe(true);
      expect((chart?.options?.scales?.y as any)?.beginAtZero).toBe(true);
    });

    it('should configure line chart with proper styling', () => {
      const data: TrendData[] = [{ label: 'Test', value: 10 }];
      renderer.renderLineChart(data, mockCanvas);

      const chart = renderer.getChart();
      expect(chart?.options?.responsive).toBe(true);
      expect(chart?.options?.plugins?.legend?.display).toBe(true);
      expect(chart?.options?.plugins?.title?.display).toBe(true);
      expect((chart?.options?.scales?.y as any)?.beginAtZero).toBe(true);
    });
  });

  // **Feature: keyboard-stats-tracker, Property 9: 图表数据完整性**
  // **Validates: Requirements 6.1, 6.5**
  describe('Property 9: Chart data completeness', () => {
    it('should include all data points, axis labels, and legend for bar charts', () => {
      // For any set of key statistics, the generated bar chart should contain:
      // 1. All data points from the input
      // 2. Axis labels (x and y)
      // 3. Legend
      const keyStatsArbitrary = fc.array(
        fc.record({
          keyName: fc.string({ minLength: 1, maxLength: 20 }),
          count: fc.integer({ min: 0, max: 10000 })
        }),
        { minLength: 0, maxLength: 50 }
      );

      fc.assert(
        fc.property(keyStatsArbitrary, (keyStats) => {
          // Create a fresh renderer and canvas for each iteration
          const testRenderer = new ChartRenderer();
          const testCanvas = document.createElement('canvas');

          // Render bar chart with the generated data
          testRenderer.renderBarChart(keyStats, testCanvas);

          // Get the chart instance
          const chart = testRenderer.getChart();

          if (!chart) {
            testRenderer.destroy();
            return false;
          }

          // Check 1: All data points are present
          const chartLabels = chart.data.labels || [];
          const chartData = chart.data.datasets[0]?.data || [];
          const allDataPointsPresent = 
            chartLabels.length === keyStats.length &&
            chartData.length === keyStats.length &&
            keyStats.every((stat, index) => 
              chartLabels[index] === stat.keyName &&
              chartData[index] === stat.count
            );

          // Check 2: Axis labels are present
          const xAxisLabel = (chart.options?.scales?.x as any)?.title?.display === true;
          const yAxisLabel = (chart.options?.scales?.y as any)?.title?.display === true;
          const axisLabelsPresent = xAxisLabel && yAxisLabel;

          // Check 3: Legend is present
          const legendPresent = chart.options?.plugins?.legend?.display === true;

          // Check 4: Title is present (part of requirement 6.5)
          const titlePresent = chart.options?.plugins?.title?.display === true;

          const result = allDataPointsPresent && axisLabelsPresent && legendPresent && titlePresent;

          // Clean up
          testRenderer.destroy();

          return result;
        }),
        { numRuns: 100 }
      );
    });

    it('should include all data points, axis labels, and legend for line charts', () => {
      // For any set of trend data, the generated line chart should contain:
      // 1. All data points from the input
      // 2. Axis labels (x and y)
      // 3. Legend
      const trendDataArbitrary = fc.array(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 })
        }),
        { minLength: 0, maxLength: 50 }
      );

      fc.assert(
        fc.property(trendDataArbitrary, (trendData) => {
          // Create a fresh renderer and canvas for each iteration
          const testRenderer = new ChartRenderer();
          const testCanvas = document.createElement('canvas');

          // Render line chart with the generated data
          testRenderer.renderLineChart(trendData, testCanvas);

          // Get the chart instance
          const chart = testRenderer.getChart();

          if (!chart) {
            testRenderer.destroy();
            return false;
          }

          // Check 1: All data points are present
          const chartLabels = chart.data.labels || [];
          const chartData = chart.data.datasets[0]?.data || [];
          const allDataPointsPresent = 
            chartLabels.length === trendData.length &&
            chartData.length === trendData.length &&
            trendData.every((point, index) => 
              chartLabels[index] === point.label &&
              chartData[index] === point.value
            );

          // Check 2: Axis labels are present
          const xAxisLabel = (chart.options?.scales?.x as any)?.title?.display === true;
          const yAxisLabel = (chart.options?.scales?.y as any)?.title?.display === true;
          const axisLabelsPresent = xAxisLabel && yAxisLabel;

          // Check 3: Legend is present
          const legendPresent = chart.options?.plugins?.legend?.display === true;

          // Check 4: Title is present (part of requirement 6.5)
          const titlePresent = chart.options?.plugins?.title?.display === true;

          const result = allDataPointsPresent && axisLabelsPresent && legendPresent && titlePresent;

          // Clean up
          testRenderer.destroy();

          return result;
        }),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: keyboard-stats-tracker, Property 8: 图表类型正确性**
  // **Validates: Requirements 6.2, 6.3, 6.4**
  describe('Property 8: Chart type correctness', () => {
    it('should generate bar chart for daily statistics with any key stats data', () => {
      // For any set of key statistics (daily data), renderBarChart should create a bar chart
      const keyStatsArbitrary = fc.array(
        fc.record({
          keyName: fc.string({ minLength: 1, maxLength: 20 }),
          count: fc.integer({ min: 0, max: 10000 })
        }),
        { minLength: 0, maxLength: 50 }
      );

      fc.assert(
        fc.property(keyStatsArbitrary, (keyStats) => {
          // Create a fresh renderer and canvas for each iteration
          const testRenderer = new ChartRenderer();
          const testCanvas = document.createElement('canvas');

          // Render bar chart with the generated data
          testRenderer.renderBarChart(keyStats, testCanvas);

          // Get the chart instance
          const chart = testRenderer.getChart();

          // Verify chart was created and chart type is 'bar'
          const result = chart !== null && (chart.config as any).type === 'bar';

          // Clean up
          testRenderer.destroy();

          return result;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate line chart for monthly statistics with any trend data', () => {
      // For any set of trend data (monthly data), renderLineChart should create a line chart
      const trendDataArbitrary = fc.array(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 })
        }),
        { minLength: 0, maxLength: 50 }
      );

      fc.assert(
        fc.property(trendDataArbitrary, (trendData) => {
          // Create a fresh renderer and canvas for each iteration
          const testRenderer = new ChartRenderer();
          const testCanvas = document.createElement('canvas');

          // Render line chart with the generated data
          testRenderer.renderLineChart(trendData, testCanvas);

          // Get the chart instance
          const chart = testRenderer.getChart();

          // Verify chart was created and chart type is 'line'
          const result = chart !== null && (chart.config as any).type === 'line';

          // Clean up
          testRenderer.destroy();

          return result;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate line chart for yearly statistics with any trend data', () => {
      // For any set of trend data (yearly data), renderLineChart should create a line chart
      const trendDataArbitrary = fc.array(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.integer({ min: 0, max: 10000 })
        }),
        { minLength: 0, maxLength: 50 }
      );

      fc.assert(
        fc.property(trendDataArbitrary, (trendData) => {
          // Create a fresh renderer and canvas for each iteration
          const testRenderer = new ChartRenderer();
          const testCanvas = document.createElement('canvas');

          // Render line chart with the generated data (yearly stats use line charts)
          testRenderer.renderLineChart(trendData, testCanvas, '年度趋势');

          // Get the chart instance
          const chart = testRenderer.getChart();

          // Verify chart was created and chart type is 'line'
          const result = chart !== null && (chart.config as any).type === 'line';

          // Clean up
          testRenderer.destroy();

          return result;
        }),
        { numRuns: 100 }
      );
    });
  });
});
