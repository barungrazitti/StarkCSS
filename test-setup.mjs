// test-setup.mjs - ES module version for Jest compatibility
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-api-key';
process.env.ENABLE_AI_FIXES = 'false';

// Mock console methods to reduce noise in tests
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

// Mock PostCSS and plugins
jest.mock('postcss', () => ({
  process: jest.fn().mockResolvedValue({
    css: 'optimized css',
    map: null,
    root: {},
    messages: []
  }),
  plugin: jest.fn((fn) => fn),
  parse: jest.fn().mockReturnValue({}),
  stringify: jest.fn().mockReturnValue('')
}));

jest.mock('postcss-safe-parser', () => jest.fn());
jest.mock('postcss-sort-media-queries', () => jest.fn());
jest.mock('autoprefixer', () => jest.fn());
jest.mock('cssnano', () => jest.fn(() => ({})));

// Mock other dependencies
jest.mock('prettier', () => ({
  format: jest.fn().mockReturnValue('formatted code'),
  resolveConfig: jest.fn().mockResolvedValue({})
}));

jest.mock('stylelint', () => ({
  lint: jest.fn().mockResolvedValue([])
}));

jest.mock('dotenv', () => ({
  config: jest.fn()
}));

jest.mock('glob', () => ({
  globSync: jest.fn(() => []),
  glob: jest.fn().mockResolvedValue([])
}));

jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  green: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  dim: jest.fn((text) => text)
}));

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

global.mockOptimizedCSS = `
/* Optimized CSS */
body{margin:0}.test{color:red}
`;

export const setupTestEnvironment = () => {
  // Additional setup if needed
  return true;
};