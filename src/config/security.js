// Security configuration
const securityConfig = {
  // Session management
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes before expiry
    maxConcurrentSessions: 3,
    requireReauth: true
  },

  // Password requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    preventReuse: 5 // Last 5 passwords
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    adminMax: 200, // higher limit for admin users
    createUserMax: 10, // limit user creation
    deleteUserMax: 5, // limit user deletion
    loginMax: 5, // login attempts
    skipSuccessfulRequests: true
  },

  // Security monitoring
  monitoring: {
    logLevel: 'INFO',
    alertThreshold: 5, // failed attempts before alert
    blockThreshold: 10, // failed attempts before temporary block
    blockDuration: 15 * 60 * 1000, // 15 minutes
    auditRetention: 90 * 24 * 60 * 60 * 1000, // 90 days
    enableRealTimeAlerts: true
  },

  // API security
  api: {
    enableHTTPS: true,
    useHelmet: true,
    corsOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
    maxRequestSize: '10mb',
    timeout: 30000, // 30 seconds
    enableCompression: true
  },

  // Database security
  database: {
    enableBackups: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
    backupRetention: 30, // 30 days
    enableEncryption: true,
    auditChanges: true
  },

  // User management
  userManagement: {
    emailVerificationRequired: true,
    mfaRequired: false, // Multi-factor authentication
    accountLockoutThreshold: 5,
    accountLockoutDuration: 30 * 60 * 1000, // 30 minutes
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    allowSelfRegistration: false
  },

  // Content security
  contentSecurity: {
    enableCSP: true,
    sanitizeInputs: true,
    validateFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg']
  },

  // Compliance
  compliance: {
    enableAuditLog: true,
    enableDataRetention: true,
    enableGDPR: true,
    enableSOX: false,
    enableHIPAA: false
  }
};

module.exports = securityConfig;
