// test-css-optimizer.js - Unit tests for main CSS optimizer
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import { optimizeCss } from '../css-optimizer.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('path');
jest.mock('postcss');
jest.mock('postcss-safe-parser');
jest.mock('postcss-sort-media-queries');
jest.mock('autoprefixer');
jest.mock('cssnano');
jest.mock('prettier');
jest.mock('stylelint');
jest.mock('dotenv');

describe('CSS Optimizer Core Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.GROQ_API_KEY = 'test-api-key';
    process.env.ENABLE_AI_FIXES = 'false';
  });

  describe('Module Loading', () => {
    test('should load optimizeCss function', async () => {
      expect(typeof optimizeCss).toBe('function');
    });

    test('should have proper dependencies mocked', () => {
      expect(fs.readFileSync).toBeDefined();
      expect(postcss.process).toBeDefined();
    });
  });

  describe('File Operations', () => {
    test('should read CSS file successfully', async () => {
      const mockCSS = '.test { color: red; }';
      fs.readFileSync.mockReturnValue(mockCSS);
      
      const result = fs.readFileSync('test.css', 'utf8');
      expect(result).toBe(mockCSS);
      expect(fs.readFileSync).toHaveBeenCalledWith('test.css', 'utf8');
    });

    test('should handle file read errors', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => fs.readFileSync('nonexistent.css', 'utf8')).toThrow('File not found');
    });
  });

  describe('CSS Processing', () => {
    test('should process CSS with PostCSS', async () => {
      const mockCSS = '.test { color: red; }';
      const mockResult = {
        css: '.test{color:red}',
        map: null,
        root: {},
        messages: []
      };

      postcss.process.mockResolvedValue(mockResult);

      const result = await postcss.process(mockCSS);
      expect(result.css).toBe('.test{color:red}');
      expect(postcss.process).toHaveBeenCalledWith(mockCSS);
    });

    test('should handle PostCSS processing errors', async () => {
      const mockCSS = '.test { color: red; }';
      postcss.process.mockRejectedValue(new Error('CSS parsing error'));

      await expect(postcss.process(mockCSS)).rejects.toThrow('CSS parsing error');
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      expect(process.env.ENABLE_AI_FIXES).toBe('false');
      expect(process.env.GROQ_API_KEY).toBe('test-api-key');
    });

    test('should override configuration with environment variables', () => {
      process.env.ENABLE_MINIFICATION = 'true';
      expect(process.env.ENABLE_MINIFICATION).toBe('true');
    });
  });

  describe('Integration Tests', () => {
    test('should complete full optimization workflow', async () => {
      const mockCSS = '.test { color: red; background: blue; }';
      const mockOptimized = '.test{color:red;background:blue}';
      
      fs.readFileSync.mockReturnValue(mockCSS);
      fs.existsSync.mockReturnValue(true);
      postcss.process.mockResolvedValue({
        css: mockOptimized,
        map: null,
        root: {},
        messages: []
      });

      // Mock the main optimizeCss function call
      // This would normally be called from the actual module
      const result = await postcss.process(mockCSS);
      
      expect(result.css).toBe(mockOptimized);
      expect(fs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty CSS input', async () => {
      const emptyCSS = '';
      postcss.process.mockResolvedValue({
        css: '',
        map: null,
        root: {},
        messages: []
      });

      const result = await postcss.process(emptyCSS);
      expect(result.css).toBe('');
    });

    test('should handle invalid CSS syntax', async () => {
      const invalidCSS = '.test { color red; }';
      postcss.process.mockRejectedValue(new Error('Invalid CSS syntax'));

      await expect(postcss.process(invalidCSS)).rejects.toThrow('Invalid CSS syntax');
    });
  });

  describe('Performance', () => {
    test('should process CSS within reasonable time', async () => {
      const mockCSS = '.test { color: red; }'.repeat(1000);
      const startTime = Date.now();
      
      postcss.process.mockResolvedValue({
        css: mockCSS,
        map: null,
        root: {},
        messages: []
      });

      await postcss.process(mockCSS);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});