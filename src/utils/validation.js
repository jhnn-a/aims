// Enhanced input validation utilities
const validator = require('validator');

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!validator.isEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check for common security issues
  if (email.length > 254) {
    return { valid: false, error: 'Email too long' };
  }
  
  return { valid: true };
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password too long' };
  }
  
  // Check for complexity requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
    return { 
      valid: false, 
      error: 'Password must contain uppercase, lowercase, numbers, and special characters' 
    };
  }
  
  return { valid: true };
};

const validateRole = (role) => {
  const validRoles = ['viewer', 'admin'];
  
  if (!role || typeof role !== 'string') {
    return { valid: false, error: 'Role is required' };
  }
  
  if (!validRoles.includes(role)) {
    return { valid: false, error: 'Invalid role specified' };
  }
  
  return { valid: true };
};

const validateUID = (uid) => {
  if (!uid || typeof uid !== 'string') {
    return { valid: false, error: 'UID is required' };
  }
  
  if (uid.length > 128) {
    return { valid: false, error: 'UID too long' };
  }
  
  // Basic alphanumeric validation
  if (!/^[a-zA-Z0-9_-]+$/.test(uid)) {
    return { valid: false, error: 'Invalid UID format' };
  }
  
  return { valid: true };
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags and potentially dangerous characters
  return validator.escape(input.trim());
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRole,
  validateUID,
  sanitizeInput
};
