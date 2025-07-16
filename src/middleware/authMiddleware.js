// Authentication middleware for backend API
const admin = require("firebase-admin");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: "Unauthorized: No valid token provided",
      code: "AUTH_REQUIRED"
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is disabled
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    if (userRecord.disabled) {
      return res.status(403).json({ 
        error: "Account disabled",
        code: "ACCOUNT_DISABLED"
      });
    }

    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'viewer',
      emailVerified: decodedToken.email_verified
    };

    // Log security event
    console.log(`[AUTH] User ${req.user.email} (${req.user.role}) accessed ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error(`[AUTH_ERROR] Token verification failed:`, error.message);
    return res.status(401).json({ 
      error: "Invalid token",
      code: "INVALID_TOKEN"
    });
  }
};

// Admin-only middleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    console.log(`[SECURITY] Unauthorized admin access attempt by ${req.user.email}`);
    return res.status(403).json({ 
      error: "Admin access required",
      code: "ADMIN_REQUIRED"
    });
  }
  next();
};

// Rate limiting middleware
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.user?.uid || req.ip;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userData = rateLimitStore.get(key);
    
    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
    } else {
      userData.count += 1;
    }
    
    if (userData.count > maxRequests) {
      console.log(`[RATE_LIMIT] User ${req.user?.email || req.ip} exceeded rate limit`);
      return res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  rateLimit
};
