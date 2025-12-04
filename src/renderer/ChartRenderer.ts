import {
  Chart,
  ChartConfiguration,
  ChartType,
  registerables
} from 'chart.js';
import { KeyStats } from '../domain/models';
import { ErrorLogger } from '../infrastructure/ErrorLogger';

// Register Chart.js components
Chart.register(...registerables);

/**
 * TrendData represents a single data point in a trend chart
 */
export interface TrendData {
  label: string;
  value: number;
}

/**
 * ChartRenderer handles the creation and management of Chart.js visualizations
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class ChartRenderer {
  private chart: Chart | null = null;
  private errorLogger: ErrorLogger;

  constructor(errorLogger?: ErrorLogger) {
    this.errorLogger = errorLogger || new ErrorLogger();
  }

  /**
   * Render a bar chart for daily statistics
   * Requirements: 6.2
   * 
   * @param data - Array of key statistics to display
   * @param container - HTML canvas element to render the chart into
   */
  renderBarChart(data: KeyStats[], container: HTMLCanvasElement): void {
    try {
      // Destroy existing chart if present
      this.destroy();

      // Extract labels and values from data
      const labels = data.map(stat => stat.keyName);
      const values = data.map(stat => stat.count);

      // Configure bar chart
      const config: ChartConfiguration = {
        type: 'bar' as ChartType,
        data: {
          labels: labels,
          datasets: [{
            label: '按键次数',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  size: 12
                }
              }
            },
            title: {
              display: true,
              text: '日统计 - 按键分布',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '敲击次数'
              },
              ticks: {
                precision: 0
              }
            },
            x: {
              title: {
                display: true,
                text: '按键'
              }
            }
          }
        }
      };

      // Create and store the chart instance
      this.chart = new Chart(container, config);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'ChartRenderer.renderBarChart');
      throw new Error(`Failed to render bar chart: ${err.message}`);
    }
  }

  /**
   * Render a line chart for monthly or yearly statistics
   * Requirements: 6.3, 6.4
   * 
   * @param data - Array of trend data points to display
   * @param container - HTML canvas element to render the chart into
   * @param title - Optional title for the chart
   */
  renderLineChart(
    data: TrendData[],
    container: HTMLCanvasElement,
    title: string = '趋势统计'
  ): void {
    try {
      // Destroy existing chart if present
      this.destroy();

      // Extract labels and values from data
      const labels = data.map(point => point.label);
      const values = data.map(point => point.value);

      // Configure line chart
      const config: ChartConfiguration = {
        type: 'line' as ChartType,
        data: {
          labels: labels,
          datasets: [{
            label: '敲击次数',
            data: values,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  size: 12
                }
              }
            },
            title: {
              display: true,
              text: title,
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '敲击次数'
              },
              ticks: {
                precision: 0
              }
            },
            x: {
              title: {
                display: true,
                text: '时间'
              }
            }
          }
        }
      };

      // Create and store the chart instance
      this.chart = new Chart(container, config);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(err, 'ChartRenderer.renderLineChart');
      throw new Error(`Failed to render line chart: ${err.message}`);
    }
  }

  /**
   * Destroy the current chart and clean up resources
   * Requirements: 6.1
   */
  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /**
   * Get the current chart instance (for testing purposes)
   */
  getChart(): Chart | null {
    return this.chart;
  }
}
