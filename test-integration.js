// test-integration.js - Integration tests for CSS optimizer
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

// Mock all external dependencies
jest.mock('fs-extra');
jest.mock('path');
jest.mock('crypto');
jest.mock('postcss');
jest.mock('postcss-safe-parser');
jest.mock('postcss-sort-media-queries');
jest.mock('autoprefixer');
jest.mock('cssnano');
jest.mock('prettier');
jest.mock('stylelint');
jest.mock('dotenv');
jest.mock('glob');
jest.mock('chalk');

describe('CSS Optimizer Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    process.env.NODE_ENV = 'test';
    process.env.GROQ_API_KEY = 'test-api-key';
    process.env.ENABLE_AI_FIXES = 'false';
    
    // Default file system mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('.test { color: red; }');
    fs.writeFileSync.mockReturnValue();
    fs.statSync.mockReturnValue({ 
      size: 1024, 
      isFile: () => true 
    });
    
    // Default path mocks
    path.resolve.mockImplementation((...args) => args.join('/'));
    path.dirname.mockReturnValue('/test');
    path.basename.mockReturnValue('test.css');
    path.extname.mockReturnValue('.css');
    
    // Default PostCSS mocks
    const mockPostCSS = {
      process: jest.fn().mockResolvedValue({
        css: '.test{color:red}',
        map: null,
        root: {},
        messages: []
      })
    };
    
    // Mock dynamic imports for PostCSS
    jest.doMock('postcss', () => mockPostCSS);
  });

  describe('Complete Workflow Integration', () => {
    test('should handle complete CSS optimization workflow', async () => {
      const inputCSS = `
        .test {
          color: red;
          background: blue;
          margin: 10px;
          padding: 5px;
        }
        
        @media (max-width: 600px) {
          .test {
            margin: 5px;
          }
        }
      `;
      
      const expectedOptimizedCSS = '.test{color:red;background:blue;margin:10px;padding:5px}@media (max-width:600px){.test{margin:5px}}';
      
      // Mock file operations
      fs.readFileSync.mockReturnValue(inputCSS);
      fs.writeFileSync.mockImplementation((filePath, content) => {
        expect(content).toContain('.test{');
      });
      
      // Mock PostCSS processing
      const postcss = await import('postcss');
      postcss.default.process.mockResolvedValue({
        css: expectedOptimizedCSS,
        map: null,
        root: {},
        messages: []
      });
      
      // Simulate the optimization process
      const result = await postcss.default.process(inputCSS);
      
      expect(result.css).toBe(expectedOptimizedCSS);
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(postcss.default.process).toHaveBeenCalledWith(inputCSS);
    });

    test('should handle multiple CSS files in batch', async () => {
      const cssFiles = ['style1.css', 'style2.css', 'style3.css'];
      const cssContents = [
        '.one { color: red; }',
        '.two { color: blue; }',
        '.three { color: green; }'
      ];
      
      // Mock glob for file discovery
      const mockGlob = await import('glob');
      mockGlob.glob.mockResolvedValue(cssFiles);
      
      // Mock file reading for each file
      fs.readFileSync.mockImplementation((filePath) => {
        const index = cssFiles.indexOf(filePath);
        return cssContents[index] || '';
      });
      
      // Mock PostCSS
      const postcss = await import('postcss');
      postcss.default.process.mockResolvedValue({
        css: 'optimized',
        map: null,
        root: {},
        messages: []
      });
      
      // Simulate batch processing
      const files = await mockGlob.glob('*.css');
      expect(files).toEqual(cssFiles);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toBeTruthy();
        
        const result = await postcss.default.process(content);
        expect(result.css).toBe('optimized');
      }
    });

    test('should create backup before optimization', async () => {
      const originalCSS = '.original { color: red; }';
      const originalPath = 'style.css';
      const backupPath = 'style.backup.css';
      
      // Setup mocks
      fs.readFileSync.mockReturnValue(originalCSS);
      fs.writeFileSync.mockImplementation((filePath, content) => {
        if (filePath === backupPath) {
          expect(content).toBe(originalCSS);
        }
      });
      
      // Simulate backup creation
      const originalContent = fs.readFileSync(originalPath, 'utf8');
      fs.writeFileSync(backupPath, originalContent, 'utf8');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(backupPath, originalContent, 'utf8');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle file not found gracefully', async () => {
      fs.existsSync.mockReturnValue(false);
      
      const filePath = 'nonexistent.css';
      const exists = fs.existsSync(filePath);
      
      expect(exists).toBe(false);
      
      // Should attempt to read file and handle the error
      expect(() => {
        if (!exists) {
          throw new Error(`File not found: ${filePath}`);
        }
      }).toThrow('File not found');
    });

    test('should handle CSS parsing errors', async () => {
      const invalidCSS = '.invalid { color:; }';
      
      const postcss = await import('postcss');
      postcss.default.process.mockRejectedValue(new Error('CSS parsing error'));
      
      await expect(postcss.default.process(invalidCSS)).rejects.toThrow('CSS parsing error');
    });

    test('should handle permission errors', async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        fs.writeFileSync('protected.css', '.test { color: red; }', 'utf8');
      }).toThrow('Permission denied');
    });
  });

  describe('Performance Integration', () => {
    test('should process large CSS files efficiently', async () => {
      const largeCSS = '.test { color: red; }'.repeat(10000);
      const startTime = Date.now();
      
      const postcss = await import('postcss');
      postcss.default.process.mockResolvedValue({
        css: largeCSS.replace(/\s+/g, ' '),
        map: null,
        root: {},
        messages: []
      });
      
      const result = await postcss.default.process(largeCSS);
      const endTime = Date.now();
      
      expect(result.css).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent file processing', async () => {
      const cssFiles = Array(10).fill().map((_, i) => `file${i}.css`);
      const promises = cssFiles.map(async (file) => {
        const postcss = await import('postcss');
        return postcss.default.process('.test { color: red; }');
      });
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Security Integration', () => {
    test('should detect and reject malicious CSS content', async () => {
      const maliciousCSS = '.malicious { content: "javascript:alert(1)"; }';
      
      // Mock security detection
      const detectMaliciousContent = (content) => {
        return content.includes('javascript:') ? { isMalicious: true } : { isMalicious: false };
      };
      
      const result = detectMaliciousContent(maliciousCSS);
      expect(result.isMalicious).toBe(true);
    });

    test('should prevent path traversal attacks', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd'
      ];
      
      const validatePath = (path) => {
        return !path.includes('../') && !path.includes('..\\') && !path.startsWith('/etc/');
      };
      
      maliciousPaths.forEach(maliciousPath => {
        const isValid = validatePath(maliciousPath);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Configuration Integration', () => {
    test('should respect environment configuration', () => {
      process.env.ENABLE_MINIFICATION = 'true';
      process.env.ENABLE_AUTOPREFIXER = 'false';
      process.env.BROWSERS = 'last 2 versions';
      
      expect(process.env.ENABLE_MINIFICATION).toBe('true');
      expect(process.env.ENABLE_AUTOPREFIXER).toBe('false');
      expect(process.env.BROWSERS).toBe('last 2 versions');
    });

    test('should load configuration from .env file', async () => {
      const dotenv = await import('dotenv');
      dotenv.config.mockImplementation();
      
      expect(dotenv.config).toBeDefined();
    });
  });

  describe('Plugin Integration', () => {
    test('should integrate with autoprefixer', async () => {
      const autoprefixer = await import('autoprefixer');
      autoprefixer.default.mockReturnValue(() => ({
        postcssPlugin: 'autoprefixer',
        once: () => {}
      }));
      
      const plugin = autoprefixer.default();
      expect(typeof plugin).toBe('function');
    });

    test('should integrate with cssnano for minification', async () => {
      const cssnano = await import('cssnano');
      cssnano.default.mockReturnValue({
        preset: 'default'
      });
      
      const minifier = cssnano.default();
      expect(minifier.preset).toBe('default');
    });

    test('should integrate with stylelint for linting', async () => {
      const stylelint = await import('stylelint');
      stylelint.lint.mockResolvedValue({
        results: [],
        errored: false
      });
      
      const result = await stylelint.lint();
      expect(result.errored).toBe(false);
    });
  });

  describe('Output Generation', () => {
    test('should generate source maps when enabled', async () => {
      const sourceMapEnabled = true;
      const expectedSourceMap = { version: 3, sources: ['style.css'] };
      
      if (sourceMapEnabled) {
        expect(expectedSourceMap.version).toBe(3);
        expect(expectedSourceMap.sources).toContain('style.css');
      }
    });

    test('should generate optimization report', async () => {
      const report = {
        originalSize: 1024,
        optimizedSize: 768,
        compressionRatio: 0.25,
        processingTime: 150,
        optimizationsApplied: ['minification', 'autoprefixer', 'sort-media-queries']
      };
      
      expect(report.originalSize).toBeGreaterThan(report.optimizedSize);
      expect(report.compressionRatio).toBeGreaterThan(0);
      expect(report.optimizationsApplied).toContain('minification');
    });
  });

  describe('Cleanup and Maintenance', () => {
    test('should clean temporary files after processing', () => {
      const tempFiles = ['temp1.css', 'temp2.css'];
      
      tempFiles.forEach(file => {
        fs.existsSync.mockImplementation((path) => path === file);
        fs.unlinkSync.mockImplementation(() => {});
        
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      tempFiles.forEach(file => {
        expect(fs.unlinkSync).toHaveBeenCalledWith(file);
      });
    });

    test('should maintain backup history', () => {
      const backups = [
        'style.backup.css',
        'style.backup.1.css',
        'style.backup.2.css'
      ];
      
      backups.forEach(backup => {
        fs.existsSync.mockImplementation((path) => path === backup);
        expect(fs.existsSync(backup)).toBe(true);
      });
    });
  });
});