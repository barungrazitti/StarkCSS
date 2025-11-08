// test-setup.js - Simplified for Jest compatibility
// Remove ES module imports and use global jest

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-api-key';
process.env.ENABLE_AI_FIXES = 'false';

// Mock console methods to reduce noise in tests
if (typeof jest !== 'undefined') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Mock fs-extra
  jest.mock('fs-extra', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    copyFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    statSync: jest.fn(() => ({ isFile: () => true, size: 1000 }))
  }));

  // Mock path
  jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn((...args) => args.join('/')),
    dirname: jest.fn(() => '/test'),
    basename: jest.fn(() => 'test.css'),
    extname: jest.fn(() => '.css')
  }));
}

// Global test utilities
global.mockCSS = `
.test-class {
  color: red;
  background: blue;
}
`;

global.mockFileContent = `
/* Test CSS */
body { margin: 0; }
.test { color: red; }
`;