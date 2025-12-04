import * as fs from 'fs';
import * as path from 'path';
/**
 * ErrorLogger handles error and warning logging to file
 * Requirements: 2.4, 2.5
 */
export class ErrorLogger {
    constructor(logFilePath = './error.log') {
        this.logBuffer = [];
        this.maxBufferSize = 10;
        this.writePromise = null;
        this.logFilePath = logFilePath;
        this.ensureLogFileExists();
    }
    /**
     * Ensure the log file and its directory exist
     */
    ensureLogFileExists() {
        try {
            const dir = path.dirname(this.logFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Create file if it doesn't exist
            if (!fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, '', 'utf-8');
            }
        }
        catch (error) {
            console.error('Failed to create log file:', error);
        }
    }
    /**
     * Log an error with context
     * @param error - The error object to log
     * @param context - Context information about where the error occurred
     */
    logError(error, context) {
        const entry = {
            timestamp: Date.now(),
            level: 'error',
            message: error.message,
            context: context,
            stack: error.stack
        };
        this.addEntry(entry);
    }
    /**
     * Log a warning message with context
     * @param message - The warning message
     * @param context - Context information about where the warning occurred
     */
    logWarning(message, context) {
        const entry = {
            timestamp: Date.now(),
            level: 'warning',
            message: message,
            context: context
        };
        this.addEntry(entry);
    }
    /**
     * Add an entry to the buffer and flush if needed
     */
    addEntry(entry) {
        this.logBuffer.push(entry);
        // Also log to console for immediate visibility
        const timestamp = new Date(entry.timestamp).toISOString();
        const logMessage = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
        if (entry.level === 'error') {
            console.error(logMessage);
            if (entry.stack) {
                console.error(entry.stack);
            }
        }
        else {
            console.warn(logMessage);
        }
        // Flush buffer if it reaches max size
        if (this.logBuffer.length >= this.maxBufferSize) {
            this.flush();
        }
    }
    /**
     * Flush the log buffer to file
     */
    flush() {
        if (this.logBuffer.length === 0) {
            return;
        }
        const entriesToWrite = [...this.logBuffer];
        this.logBuffer = [];
        // Chain write operations to avoid concurrent writes
        this.writePromise = (this.writePromise || Promise.resolve()).then(async () => {
            try {
                const logLines = entriesToWrite.map(entry => {
                    const timestamp = new Date(entry.timestamp).toISOString();
                    let line = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
                    if (entry.stack) {
                        line += `\n${entry.stack}`;
                    }
                    return line;
                }).join('\n') + '\n';
                await fs.promises.appendFile(this.logFilePath, logLines, 'utf-8');
            }
            catch (error) {
                console.error('Failed to write to log file:', error);
            }
        });
    }
    /**
     * Get recent log entries from the log file
     * @param limit - Maximum number of entries to return
     * @returns Array of recent log entries
     */
    async getRecentErrors(limit = 50) {
        try {
            // First, flush any pending entries
            this.flush();
            // Wait for any pending writes to complete
            if (this.writePromise) {
                await this.writePromise;
            }
            // Read the log file
            const content = await fs.promises.readFile(this.logFilePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            const entries = [];
            let currentEntry = null;
            for (const line of lines) {
                // Check if this is a new log entry (starts with timestamp)
                const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/);
                if (match) {
                    // Save previous entry if exists
                    if (currentEntry && currentEntry.timestamp !== undefined) {
                        entries.push(currentEntry);
                    }
                    // Start new entry
                    const [, timestamp, level, context, message] = match;
                    currentEntry = {
                        timestamp: new Date(timestamp).getTime(),
                        level: level.toLowerCase(),
                        context: context,
                        message: message
                    };
                }
                else if (currentEntry) {
                    // This is a stack trace line, append to current entry
                    currentEntry.stack = (currentEntry.stack || '') + line + '\n';
                }
            }
            // Add the last entry
            if (currentEntry && currentEntry.timestamp !== undefined) {
                entries.push(currentEntry);
            }
            // Return the most recent entries (up to limit)
            return entries.slice(-limit);
        }
        catch (error) {
            console.error('Failed to read log file:', error);
            return [];
        }
    }
    /**
     * Clear the log file
     */
    async clearLogs() {
        try {
            await fs.promises.writeFile(this.logFilePath, '', 'utf-8');
            this.logBuffer = [];
        }
        catch (error) {
            console.error('Failed to clear log file:', error);
            throw error;
        }
    }
    /**
     * Ensure all buffered logs are written before shutdown
     */
    async shutdown() {
        this.flush();
        if (this.writePromise) {
            await this.writePromise;
        }
    }
}
