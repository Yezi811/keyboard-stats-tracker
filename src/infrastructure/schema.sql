-- Database schema for keyboard statistics tracker
-- This schema supports efficient querying by date, time, and key name

-- Main keystrokes table
CREATE TABLE IF NOT EXISTS keystrokes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_code INTEGER NOT NULL,
  key_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD format for fast date queries
  hour INTEGER NOT NULL -- 0-23 for hourly statistics
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_timestamp ON keystrokes(timestamp);
CREATE INDEX IF NOT EXISTS idx_date ON keystrokes(date);
CREATE INDEX IF NOT EXISTS idx_key_name ON keystrokes(key_name);
CREATE INDEX IF NOT EXISTS idx_date_key ON keystrokes(date, key_name);

-- Backups table to track backup files
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_created ON backups(created_at);
