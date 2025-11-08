// Setup for Jest mocks
import { jest } from '@jest/globals';

// Mock external dependencies
jest.mock('fs-extra', () => ({
  __esModule: true,
  default: jest.fn(),
  ...jest.requireActual('fs-extra')
}));

jest.mock('glob', () => ({
  __esModule: true,
  default: jest.fn(),
  glob: jest.fn(),
  ...jest.requireActual('glob')
}));

jest.mock('chalk', () => ({
  __esModule: true,
  default: jest.fn(),
  ...Object.keys(jest.requireActual('chalk')).reduce((acc, key) => {
    acc[key] = jest.fn(text => text);
    return acc;
  }, {})
}));

jest.mock('readline', () => ({
  __esModule: true,
  default: jest.fn(),
  createInterface: jest.fn(() => ({
    question: jest.fn((_, callback) => callback('')),
    close: jest.fn()
  })),
  ...jest.requireActual('readline')
}));

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-api-key-for-testing';
process.env.ENABLE_AI_FIXES = 'false';
process.env.ENABLE_CACHE = 'false';
process.env.ENABLE_VERBOSE_LOGGING = 'false';
process.env.MAX_FILE_SIZE_MB = '10';
process.env.WARN_SIZE_MB = '5';

// Mock fetch API for testing
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock performance API for testing
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    setResourceTimingBufferSize: jest.fn(),
    toJSON: jest.fn(() => ({})),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    timeOrigin: 0,
    timing: {
      navigationStart: 0,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 0,
      domainLookupStart: 0,
      domainLookupEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      secureConnectionStart: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      domLoading: 0,
      domInteractive: 0,
      domContentLoadedEventStart: 0,
      domContentLoadedEventEnd: 0,
      domComplete: 0,
      loadEventStart: 0,
      loadEventEnd: 0
    },
    navigation: {
      type: 'navigate',
      redirectCount: 0
    },
    onresourcetimingbufferfull: null
  };
}

// Mock process memory usage
if (!process.memoryUsage) {
  process.memoryUsage = jest.fn(() => ({
    rss: 1024 * 1024 * 50, // 50MB
    heapTotal: 1024 * 1024 * 30, // 30MB
    heapUsed: 1024 * 1024 * 20, // 20MB
    external: 1024 * 1024 * 5, // 5MB
    arrayBuffers: 1024 * 1024 * 2 // 2MB
  }));
}

// Mock process.hrtime for Node.js compatibility
if (!process.hrtime) {
  process.hrtime = jest.fn((previousTimestamp) => {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const nanoseconds = (now % 1000) * 1000000;
    
    if (previousTimestamp) {
      const diffSeconds = seconds - previousTimestamp[0];
      const diffNanoseconds = nanoseconds - previousTimestamp[1];
      
      if (diffNanoseconds < 0) {
        return [diffSeconds - 1, diffNanoseconds + 1000000000];
      }
      
      return [diffSeconds, diffNanoseconds];
    }
    
    return [seconds, nanoseconds];
  });
}

// Mock AbortSignal for timeout functionality
if (!global.AbortSignal) {
  global.AbortSignal = {
    timeout: jest.fn((ms) => ({
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(() => false)
    }))
  };
}

// Mock crypto module for Node.js < 15 compatibility
if (!global.crypto) {
  global.crypto = {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn((algorithm, data) => 
        Promise.resolve(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]))
      )
    }
  };
}

// Setup global test utilities
global.testUtils = {
  // Create mock CSS content
  createMockCSS: (options = {}) => {
    const {
      rules = 10,
      includeErrors = false,
      includeMediaQueries = false,
      includeAnimations = false,
      includeVariables = false,
      includeNesting = false
    } = options;
    
    let css = '/* Mock CSS content */\\n';
    
    if (includeVariables) {
      css += ':root {\\n';
      css += '  --primary-color: #007bff;\\n';
      css += '  --secondary-color: #6c757d;\\n';
      css += '  --font-size-base: 16px;\\n';
      css += '  --spacing-unit: 8px;\\n';
      css += '}\\n\\n';
    }
    
    for (let i = 1; i <= rules; i++) {
      css += `.mock-class-${i} {\\n`;
      css += `  color: ${includeVariables ? 'var(--primary-color)' : '#333'};\\n`;
      css += `  font-size: ${includeVariables ? 'var(--font-size-base)' : '16px'};\\n`;
      css += `  margin: ${includeVariables ? 'calc(var(--spacing-unit) * 2)' : '16px'};\\n`;
      css += `  padding: ${includeVariables ? 'var(--spacing-unit)' : '8px'};\\n`;
      
      if (includeErrors && i % 3 === 0) {
        css += `  word-break: break-word;\\n`; // Deprecated
        css += `  padding: ${Math.floor(Math.random() * 20)};\\n`; // Missing unit
        css += `  margin-top: ${Math.floor(Math.random() * 50)}xp;\\n`; // Typo
        css += `  align-items: anchor-center;\\n`; // Invalid value
      }
      
      css += '}\\n\\n';
      
      if (includeNesting && i % 2 === 0) {
        css += `.mock-class-${i}:hover {\\n`;
        css += `  background-color: ${includeVariables ? 'var(--secondary-color)' : '#f8f9fa'};\\n`;
        css += `  transform: translateY(-2px);\\n`;
        css += '}\\n\\n';
      }
    }
    
    if (includeMediaQueries) {
      css += '@media (max-width: 768px) {\\n';
      css += '  .mock-class-1 {\\n';
      css += '    font-size: 14px;\\n';
      css += '    margin: 12px;\\n';
      css += '  }\\n';
      css += '}\\n\\n';
    }
    
    if (includeAnimations) {
      css += '@keyframes mockFadeIn {\\n';
      css += '  from { opacity: 0; }\\n';
      css += '  to { opacity: 1; }\\n';
      css += '}\\n\\n';
      css += '.mock-animated {\\n';
      css += '  animation: mockFadeIn 0.5s ease-in-out;\\n';
      css += '}\\n\\n';
    }
    
    return css.trim();
  },
  
  // Create mock file system
  createMockFS: () => {
    const mockFS = jest.fn();
    mockFS.exists = jest.fn().mockReturnValue(true);
    mockFS.pathExists = jest.fn().mockReturnValue(true);
    mockFS.readFile = jest.fn().mockResolvedValue('mock content');
    mockFS.writeFile = jest.fn().mockResolvedValue();
    mockFS.copy = jest.fn().mockResolvedValue();
    mockFS.stat = jest.fn().mockResolvedValue({
      size: 1024,
      mtime: new Date(),
      isFile: () => true,
      isDirectory: () => false
    });
    mockFS.ensureDir = jest.fn().mockResolvedValue();
    mockFS.remove = jest.fn().mockResolvedValue();
    mockFS.readJson = jest.fn().mockResolvedValue({ key: 'value' });
    mockFS.writeJson = jest.fn().mockResolvedValue();
    mockFS.access = jest.fn().mockResolvedValue();
    
    return mockFS;
  },
  
  // Create mock glob
  createMockGlob: () => {
    const mockGlob = jest.fn().mockResolvedValue([
      '/test/file1.css',
      '/test/file2.css'
    ]);
    return mockGlob;
  },
  
  // Create mock console
  createMockConsole: () => {
    const mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      table: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      group: jest.fn(),
      groupEnd: jest.fn(),
      clear: jest.fn(),
      count: jest.fn(),
      trace: jest.fn(),
      assert: jest.fn(),
      dir: jest.fn(),
      dirxml: jest.fn(),
      profile: jest.fn(),
      profileEnd: jest.fn(),
      timeLog: jest.fn(),
      timeStamp: jest.fn(),
      context: jest.fn()
    };
    
    global.console = mockConsole;
    return mockConsole;
  },
  
  // Create mock fetch
  createMockFetch: () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'fixed css content'
          }
        }]
      }),
      text: () => Promise.resolve('response text')
    });
    
    global.fetch = mockFetch;
    return mockFetch;
  },
  
  // Wait for async operations
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test data
  generateTestData: (size = 1000) => {
    return 'a'.repeat(size);
  },
  
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

// Setup global test statistics tracking
global.testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  
  increment: (result) => {
    global.testStats.total++;
    switch (result) {
      case 'passed':
        global.testStats.passed++;
        break;
      case 'failed':
        global.testStats.failed++;
        break;
      case 'skipped':
        global.testStats.skipped++;
        break;
    }
  }
};

// Store original console and fetch for restoration
global.originalConsole = global.console;
global.originalFetch = global.fetch;

// Export utilities for use in test files
export { testUtils };