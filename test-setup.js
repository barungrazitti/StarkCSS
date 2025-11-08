// test-setup.js
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-api-key';
process.env.ENABLE_AI_FIXES = 'false';

// Mock external dependencies
jest.mock('fs-extra');
jest.mock('glob');
jest.mock('chalk');

// Mock Groq API calls
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Setup test globals
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Test utilities
global.testUtils = {
  // Create mock CSS content for testing
  createMockCSS: (options = {}) => {
    const {
      rules = 10,
      includeErrors = false,
      includeMediaQueries = false,
      size = 'medium'
    } = options;
    
    let css = '/* Test CSS */\n';
    
    // Add basic rules
    for (let i = 1; i <= rules; i++) {
      css += `.test-class-${i} {\n`;
      css += `  color: #${Math.floor(Math.random()*16777215).toString(16)};\n`;
      css += `  font-size: ${Math.floor(Math.random() * 20) + 12}px;\n`;
      css += `  margin: ${Math.floor(Math.random() * 20)}px;\n`;
      css += '}\n\n';
    }
    
    // Add errors if requested
    if (includeErrors) {
      css += '.error-class {\n';
      css += '  word-break: break-word;\n'; // Deprecated
      css += '  padding: 10;\n'; // Missing unit
      css += '  margin-top: 36xp;\n'; // Typo
      css += '}\n\n';
    }
    
    // Add media queries if requested
    if (includeMediaQueries) {
      css += '@media (max-width: 768px) {\n';
      css += '  .mobile-class {\n';
      css += '    font-size: 14px;\n';
      css += '  }\n';
      css += '}\n\n';
    }
    
    return css;
  },
  
  // Create mock file system
  createMockFS: () => ({
    exists: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockResolvedValue('mock content'),
    writeFile: jest.fn().mockResolvedValue(),
    copy: jest.fn().mockResolvedValue(),
    stat: jest.fn().mockResolvedValue({
      size: 1024,
      mtime: new Date(),
      isFile: () => true,
      isDirectory: () => false
    }),
    pathExists: jest.fn().mockReturnValue(true),
    ensureDir: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    readJson: jest.fn(),
    writeJson: jest.fn().mockResolvedValue()
  }),
  
  // Wait for async operations
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create test configuration
  createTestConfig: (overrides = {}) => ({
    INPUT_PATH: '/test/style.css',
    OUTPUT_PATH: '/test/style.optimized.css',
    BACKUP_PATH: '/test/style.backup.css',
    ENABLE_AUTOPREFIXER: true,
    ENABLE_MINIFICATION: false,
    ENABLE_SOURCE_MAPS: false,
    BROWSERS: ['> 1%', 'last 2 versions'],
    MAX_FILE_SIZE_MB: 10,
    WARN_SIZE_MB: 5,
    GROQ_API_KEY: 'test-key',
    GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
    GROQ_MODEL: 'llama3-70b-8192',
    ENABLE_AI_FIXES: false,
    AI_MAX_ERRORS_TO_PROCESS: 5,
    AI_MAX_TOKENS_PER_REQUEST: 1000,
    AI_TEMPERATURE: 0.1,
    AI_TOP_P: 1.0,
    AI_MAX_RETRIES: 3,
    AI_RETRY_DELAY_MS: 1000,
    PRETTIER_TAB_WIDTH: 2,
    PRETTIER_USE_TABS: false,
    PRETTIER_PRINT_WIDTH: 100,
    PRETTIER_END_OF_LINE: 'lf',
    PRETTIER_SEMI: true,
    PRETTIER_SINGLE_QUOTE: false,
    LOG_LEVEL: 'info',
    ENABLE_VERBOSE_LOGGING: false,
    ENABLE_PERFORMANCE_TIMING: true,
    ENABLE_CACHE: false,
    ...overrides
  })
};

// Jest setup
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear();
  }
});

global.afterEach(() => {
  // Cleanup after each test
  jest.useRealTimers();
});

// Global test timeout
jest.setTimeout(10000);