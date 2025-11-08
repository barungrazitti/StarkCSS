// Global setup for Jest tests
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';

// Global test configuration
global.testConfig = {
  timeout: 10000,
  retryAttempts: 3,
  testDataDir: path.join(process.cwd(), 'test', '__data__'),
  tempDir: path.join(process.cwd(), 'test', '__temp__'),
  mockDataDir: path.join(process.cwd(), 'test', '__mocks__')
};

// Ensure test directories exist
beforeAll(async () => {
  // Create test data directory
  await fs.ensureDir(global.testConfig.testDataDir);
  
  // Create temporary directory for test files
  await fs.ensureDir(global.testConfig.tempDir);
  
  // Create mock data directory
  await fs.ensureDir(global.testConfig.mockDataDir);
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.GROQ_API_KEY = 'test-api-key-for-testing';
  process.env.ENABLE_AI_FIXES = 'false';
  process.env.ENABLE_CACHE = 'false';
  process.env.ENABLE_VERBOSE_LOGGING = 'false';
  
  // Initialize global test utilities
  global.testUtils = {
    ...global.testUtils,
    
    // Create test CSS files
    async createTestCSSFile(filename, content = '') {
      const filePath = path.join(global.testConfig.tempDir, filename);
      const defaultContent = content || `
        /* Test CSS file - ${filename} */
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .button {
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .button:hover {
          background-color: #0056b3;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
          
          .button {
            width: 100%;
            display: block;
          }
        }
      `;
      
      await fs.writeFile(filePath, defaultContent.trim());
      return filePath;
    },
    
    // Create test CSS with errors
    async createTestCSSWithErrors(filename) {
      const errorContent = `
        /* Test CSS with errors - ${filename} */
        body {
          color: red;
          word-break: break-word; /* Deprecated */
          padding: 10; /* Missing unit */
          margin-top: 36xp; /* Typo */
        }
        
        .error-class {
          background-color: #ffffff;
          background: linear-gradient(45deg, #ff0000, #0000ff); /* Shorthand override */
          border-color: red;
          border: 2px solid blue; /* Shorthand override */
        }
        
        @media (max-width: 768px) {
          .mobile {
            font-size: 14px;
            align-items: anchor-center; /* Invalid value */
          }
        }
      `;
      
      return await global.testUtils.createTestCSSFile(filename, errorContent);
    },
    
    // Create large test CSS file
    async createLargeTestCSS(filename, rules = 1000) {
      let css = `/* Large test CSS file - ${filename} */\\n`;
      
      for (let i = 1; i <= rules; i++) {
        css += `.test-class-${i} {\\n`;
        css += `  color: #${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')};\\n`;
        css += `  font-size: ${Math.floor(Math.random() * 20) + 12}px;\\n`;
        css += `  margin: ${Math.floor(Math.random() * 20)}px;\\n`;
        css += `  padding: ${Math.floor(Math.random() * 20)}px;\\n`;
        
        // Add some media queries randomly
        if (i % 10 === 0) {
          css += `}\\n\\n@media (max-width: 768px) {\\n`;
          css += `  .test-class-${i} {\\n`;
          css += `    font-size: ${Math.floor(Math.random() * 16) + 10}px;\\n`;
          css += `    margin: ${Math.floor(Math.random() * 10)}px;\\n`;
          css += `  }\\n`;
        }
        
        css += `}\\n\\n`;
      }
      
      return await global.testUtils.createTestCSSFile(filename, css);
    },
    
    // Clean up test files
    async cleanupTestFiles() {
      try {
        await fs.remove(global.testConfig.tempDir);
        await fs.ensureDir(global.testConfig.tempDir);
      } catch (error) {
        console.warn('Warning: Could not cleanup test files:', error.message);
      }
    },
    
    // Mock file system operations
    createMockFileSystem() {
      const mockFS = {
        // File existence
        exists: jest.fn().mockReturnValue(true),
        pathExists: jest.fn().mockReturnValue(true),
        
        // File operations
        readFile: jest.fn().mockResolvedValue('mock file content'),
        writeFile: jest.fn().mockResolvedValue(),
        copy: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        
        // Directory operations
        ensureDir: jest.fn().mockResolvedValue(),
        
        // File stats
        stat: jest.fn().mockResolvedValue({
          size: 1024,
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
          birthtime: new Date(),
          atime: new Date(),
          ctime: new Date(),
          dev: 1,
          ino: 1,
          mode: 33188,
          nlink: 1,
          uid: 501,
          gid: 20,
          rdev: 0,
          blksize: 4096,
          blocks: 8
        }),
        
        // JSON operations
        readJson: jest.fn().mockResolvedValue({ key: 'value' }),
        writeJson: jest.fn().mockResolvedValue(),
        
        // Access permissions
        access: jest.fn().mockResolvedValue(),
        
        // Path operations
        resolve: jest.fn((...paths) => path.resolve(...paths)),
        join: jest.fn((...paths) => path.join(...paths)),
        dirname: jest.fn((p) => path.dirname(p)),
        basename: jest.fn((p, ext) => path.basename(p, ext)),
        extname: jest.fn((p) => path.extname(p)),
        
        // Error scenarios
        simulateFileNotFound: () => {
          mockFS.pathExists.mockResolvedValueOnce(false);
          mockFS.exists.mockReturnValueOnce(false);
        },
        
        simulatePermissionError: () => {
          mockFS.access.mockRejectedValueOnce(new Error('EACCES: permission denied'));
        },
        
        simulateReadError: () => {
          mockFS.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
        },
        
        simulateWriteError: () => {
          mockFS.writeFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));
        },
        
        simulateLargeFile: (sizeInMB = 50) => {
          const largeSize = sizeInMB * 1024 * 1024;
          mockFS.stat.mockResolvedValueOnce({
            ...mockFS.stat.mock.results[0].value,
            size: largeSize
          });
        },
        
        reset: () => {
          jest.clearAllMocks();
          mockFS.exists.mockReturnValue(true);
          mockFS.pathExists.mockReturnValue(true);
          mockFS.readFile.mockResolvedValue('mock file content');
          mockFS.writeFile.mockResolvedValue();
          mockFS.copy.mockResolvedValue();
          mockFS.remove.mockResolvedValue();
          mockFS.ensureDir.mockResolvedValue();
          mockFS.stat.mockResolvedValue({
            size: 1024,
            mtime: new Date(),
            isFile: () => true,
            isDirectory: () => false
          });
          mockFS.readJson.mockResolvedValue({ key: 'value' });
          mockFS.writeJson.mockResolvedValue();
          mockFS.access.mockResolvedValue();
        }
      };
      
      return mockFS;
    },
    
    // Mock glob operations
    createMockGlob() {
      const mockGlob = {
        glob: jest.fn().mockResolvedValue(['/test/file1.css', '/test/file2.css']),
        
        simulateEmptyResults: () => {
          mockGlob.glob.mockResolvedValueOnce([]);
        },
        
        simulateError: () => {
          mockGlob.glob.mockRejectedValueOnce(new Error('Glob pattern error'));
        },
        
        simulateSpecificFiles: (files) => {
          mockGlob.glob.mockResolvedValueOnce(files);
        },
        
        reset: () => {
          jest.clearAllMocks();
          mockGlob.glob.mockResolvedValue(['/test/file1.css', '/test/file2.css']);
        }
      };
      
      return mockGlob;
    },
    
    // Mock console output
    createMockConsole() {
      const mockConsole = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        
        getOutput: () => ({
          logs: mockConsole.log.mock.calls,
          errors: mockConsole.error.mock.calls,
          warnings: mockConsole.warn.mock.calls,
          info: mockConsole.info.mock.calls,
          debug: mockConsole.debug.mock.calls
        }),
        
        reset: () => {
          jest.clearAllMocks();
        },
        
        restore: () => {
          global.console = console;
        }
      };
      
      global.console = mockConsole;
      return mockConsole;
    },
    
    // Mock fetch API
    createMockFetch() {
      const mockFetch = jest.fn();
      
      // Default successful response
      mockFetch.mockResolvedValue({
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
      
      // Error scenarios
      mockFetch.simulateSuccess = (responseData) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(responseData),
          text: () => Promise.resolve(JSON.stringify(responseData))
        });
      };
      
      mockFetch.simulateError = (status, statusText, errorText) => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText,
          text: () => Promise.resolve(errorText || statusText)
        });
      };
      
      mockFetch.simulateNetworkError = (error = new Error('Network error')) => {
        mockFetch.mockRejectedValueOnce(error);
      };
      
      mockFetch.simulateTimeout = () => {
        mockFetch.mockRejectedValueOnce(new Error('AbortError: The operation was aborted.'));
      };
      
      mockFetch.simulateServiceUnavailable = () => {
        mockFetch.simulateError(503, 'Service Unavailable', 'Service temporarily unavailable');
      };
      
      mockFetch.simulateAuthenticationError = () => {
        mockFetch.simulateError(401, 'Unauthorized', 'Authentication failed');
      };
      
      mockFetch.reset = () => {
        jest.clearAllMocks();
        mockFetch.mockResolvedValue({
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
      };
      
      global.fetch = mockFetch;
      return mockFetch;
    },
    
    // Performance testing utilities
    async measurePerformance(fn, iterations = 100) {
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          const result = await fn();
          const end = performance.now();
          results.push({
            success: true,
            duration: end - start,
            result
          });
        } catch (error) {
          const end = performance.now();
          results.push({
            success: false,
            duration: end - start,
            error: error.message
          });
        }
      }
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      return {
        totalIterations: iterations,
        successful: successful.length,
        failed: failed.length,
        averageDuration: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
        minDuration: Math.min(...successful.map(r => r.duration)),
        maxDuration: Math.max(...successful.map(r => r.duration)),
        medianDuration: successful.map(r => r.duration).sort((a, b) => a - b)[Math.floor(successful.length / 2)],
        successRate: (successful.length / iterations) * 100
      };
    },
    
    // Memory usage utilities
    getMemoryUsage() {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
      };
    },
    
    // Test data generators
    generateCSSData(options = {}) {
      const {
        rules = 10,
        includeErrors = false,
        includeMediaQueries = false,
        includeAnimations = false,
        includeVariables = false,
        includeNesting = false
      } = options;
      
      let css = '/* Generated test CSS */\\n';
      
      if (includeVariables) {
        css += ':root {\\n';
        css += '  --primary-color: #007bff;\\n';
        css += '  --secondary-color: #6c757d;\\n';
        css += '  --font-size-base: 16px;\\n';
        css += '  --spacing-unit: 8px;\\n';
        css += '}\\n\\n';
      }
      
      for (let i = 1; i <= rules; i++) {
        css += `.generated-class-${i} {\\n`;
        css += `  color: ${includeVariables ? 'var(--primary-color)' : '#333'};\\n`;
        css += `  font-size: ${includeVariables ? 'var(--font-size-base)' : '16px'};\\n`;
        css += `  margin: ${includeVariables ? 'calc(var(--spacing-unit) * 2)' : '16px'};\\n`;
        css += `  padding: ${includeVariables ? 'var(--spacing-unit)' : '8px'};\\n`;
        
        if (includeErrors && i % 3 === 0) {
          css += `  word-break: break-word;\\n`; // Deprecated
          css += `  padding: ${Math.floor(Math.random() * 20)};\\n`; // Missing unit
        }
        
        css += '}\\n\\n';
        
        if (includeNesting && i % 2 === 0) {
          css += `.generated-class-${i}:hover {\\n`;
          css += `  background-color: ${includeVariables ? 'var(--secondary-color)' : '#f8f9fa'};\\n`;
          css += `  transform: translateY(-2px);\\n`;
          css += '}\\n\\n';
        }
      }
      
      if (includeMediaQueries) {
        css += '@media (max-width: 768px) {\\n';
        css += '  .generated-class-1 {\\n';
        css += '    font-size: 14px;\\n';
        css += '    margin: 12px;\\n';
        css += '  }\\n';
        css += '}\\n\\n';
      }
      
      if (includeAnimations) {
        css += '@keyframes fadeIn {\\n';
        css += '  from { opacity: 0; }\\n';
        css += '  to { opacity: 1; }\\n';
        css += '}\\n\\n';
        css += '.animated {\\n';
        css += '  animation: fadeIn 0.5s ease-in-out;\\n';
        css += '}\\n\\n';
      }
      
      return css.trim();
    }
  };
});

// Set up global test timeout
jest.setTimeout(global.testConfig.timeout);

// Export global configuration for use in tests
export default global.testConfig;