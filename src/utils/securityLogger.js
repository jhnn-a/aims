// Security audit logger
const fs = require('fs');
const path = require('path');

class SecurityLogger {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'security.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(level, event, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      event,
      details,
      pid: process.pid
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to file
    fs.appendFile(this.logFile, logLine, (err) => {
      if (err) {
        console.error('Failed to write security log:', err);
      }
    });

    // Also log to console for development
    console.log(`[SECURITY_${level.toUpperCase()}] ${event}:`, details);
  }

  logAuth(event, userInfo, additionalInfo = {}) {
    this.log('AUTH', event, {
      user: userInfo,
      ...additionalInfo
    });
  }

  logAdmin(event, adminInfo, targetInfo = {}, additionalInfo = {}) {
    this.log('ADMIN', event, {
      admin: adminInfo,
      target: targetInfo,
      ...additionalInfo
    });
  }

  logSecurity(event, severity, details = {}) {
    this.log('SECURITY', event, {
      severity,
      ...details
    });
  }

  logError(event, error, userInfo = {}) {
    this.log('ERROR', event, {
      error: error.message || error,
      stack: error.stack,
      user: userInfo
    });
  }
}

const securityLogger = new SecurityLogger();

module.exports = securityLogger;
