// test-setup.js
process.env.GROQ_API_KEY = 'test-api-key';

// Mock Groq API calls if needed
if (!global.fetch) {
  const fetch = require('jest-fetch-mock');
  fetch.enableMocks();
}

// Add any additional test setup here