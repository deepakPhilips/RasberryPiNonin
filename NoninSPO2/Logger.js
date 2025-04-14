const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFilePath) {
    // Default log file path if none is provided
    this.logFilePath = logFilePath || path.join(__dirname, 'application.log');
  }

  // Log a message to the console and the log file
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    // Log to the console
    console.log(logMessage);

    // Append the log message to the file
    fs.appendFile(this.logFilePath, logMessage + '\n', (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }
}

module.exports = Logger;