process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Optional: reduce Nest logger noise during tests
// process.env.LOG_LEVEL = 'error';