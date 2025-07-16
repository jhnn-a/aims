// Session management and security utilities
import { getAuth } from "firebase/auth";

class SessionManager {
  constructor() {
    this.auth = getAuth();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.warningTimeout = 5 * 60 * 1000; // 5 minutes warning
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.warningId = null;
    this.onSessionExpired = null;
    this.onSessionWarning = null;
    
    this.setupActivityListeners();
    this.startSessionTimer();
  }

  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.updateActivity.bind(this), { passive: true });
    });
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.resetSessionTimer();
  }

  startSessionTimer() {
    this.clearTimers();
    
    // Set warning timer
    this.warningId = setTimeout(() => {
      if (this.onSessionWarning) {
        this.onSessionWarning();
      }
    }, this.sessionTimeout - this.warningTimeout);
    
    // Set expiration timer
    this.timeoutId = setTimeout(() => {
      this.expireSession();
    }, this.sessionTimeout);
  }

  resetSessionTimer() {
    this.clearTimers();
    this.startSessionTimer();
  }

  clearTimers() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningId) {
      clearTimeout(this.warningId);
      this.warningId = null;
    }
  }

  expireSession() {
    this.clearTimers();
    
    // Sign out user
    this.auth.signOut().then(() => {
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
    });
  }

  extendSession() {
    this.updateActivity();
  }

  destroy() {
    this.clearTimers();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.updateActivity.bind(this));
    });
  }

  setSessionCallbacks(onExpired, onWarning) {
    this.onSessionExpired = onExpired;
    this.onSessionWarning = onWarning;
  }

  getTimeRemaining() {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - elapsed);
  }
}

// Security event tracking
class SecurityMonitor {
  constructor() {
    this.events = [];
    this.maxEvents = 100;
  }

  logEvent(type, severity, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.events.unshift(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log to console for development
    console.log(`[SECURITY_${severity}] ${type}:`, details);
  }

  logAuth(event, details = {}) {
    this.logEvent('AUTH', 'INFO', { event, ...details });
  }

  logSecurity(event, severity = 'MEDIUM', details = {}) {
    this.logEvent('SECURITY', severity, { event, ...details });
  }

  logError(event, error, details = {}) {
    this.logEvent('ERROR', 'HIGH', { 
      event, 
      error: error.message || error,
      ...details 
    });
  }

  getRecentEvents(count = 10) {
    return this.events.slice(0, count);
  }

  getEventsByType(type) {
    return this.events.filter(event => event.type === type);
  }
}

// Password strength checker
export const checkPasswordStrength = (password) => {
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(criteria).filter(Boolean).length;
  
  const strength = {
    score: score,
    level: score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong',
    criteria: criteria,
    suggestions: []
  };

  if (!criteria.length) strength.suggestions.push('Use at least 8 characters');
  if (!criteria.uppercase) strength.suggestions.push('Add uppercase letters');
  if (!criteria.lowercase) strength.suggestions.push('Add lowercase letters');
  if (!criteria.numbers) strength.suggestions.push('Add numbers');
  if (!criteria.special) strength.suggestions.push('Add special characters');

  return strength;
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags and potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Rate limiting for client-side
class ClientRateLimit {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest() {
    const now = Date.now();
    
    // Remove old requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make a new request
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    // Record this request
    this.requests.push(now);
    return true;
  }

  getRetryAfter() {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const timeToWait = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, Math.ceil(timeToWait / 1000));
  }
}

export { SessionManager, SecurityMonitor, ClientRateLimit };
