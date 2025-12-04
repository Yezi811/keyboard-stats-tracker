// Domain models and interfaces
// This file will be implemented in later tasks

export interface Keystroke {
  id?: number;
  keyCode: number;
  keyName: string;
  timestamp: number;
}

export interface KeyStats {
  keyName: string;
  count: number;
}

export interface DailyStats {
  date: Date;
  totalKeystrokes: number;
  keyBreakdown: KeyStats[];
}

export interface MonthlyStats {
  year: number;
  month: number;
  totalKeystrokes: number;
  dailyTrend: { date: Date; count: number }[];
  keyBreakdown: KeyStats[];
}

export interface YearlyStats {
  year: number;
  totalKeystrokes: number;
  monthlyTrend: { month: number; count: number }[];
  keyBreakdown: KeyStats[];
}

export interface KeystrokeEvent {
  keyCode: number;
  keyName: string;
  timestamp: number;
}
