// Performance testing for CSS optimizer
import { jest } from '@jest/globals';
import { optimizeCss } from './css-optimizer.js';
import { ErrorHandler } from './error-handler.js';
import { SecurityUtils } from './security.js';
import { FileHandler } from './file-handler.js';
import fs from 'fs-extra';
import path from 'path';

describe('CSS Optimizer Performance Tests', () => {
  let testDir;
  let testFiles = [];
  
  beforeAll(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'test', '__performance__');
    await fs.ensureDir(testDir);
    
    // Create test files of different sizes
    const fileConfigs = [
      { name: 'small.css', size: 1024 }, // 1KB
      { name: 'medium.css', size: 1024 * 50 }, // 50KB
      { name: 'large.css', size: 1024 * 200 }, // 200KB
      { name: 'xlarge.css', size: 1024 * 500 }, // 500KB
      { name: 'huge.css', size: 1024 * 1000 } // 1MB
    ];
    
    for (const config of fileConfigs) {
      const filePath = path.join(testDir, config.name);
      const css = generateTestCSS(config.size / 1024); // Generate CSS with ~1KB per rule
      await fs.writeFile(filePath, css);
      testFiles.push({ path: filePath, size: config.size, name: config.name });
    }
  });
  
  afterAll(async () => {
    // Clean up test files
    await fs.remove(testDir);
  });
  
  describe('File Processing Performance', () => {
    test.each(testFiles)('should process $name efficiently', async ({ path: filePath, size, name }) => {
      const outputPath = path.join(testDir, `${name}.optimized.css`);
      
      const startTime = performance.now();
      const result = await ErrorHandler.withErrorHandling(async () => {
        return await optimizeCss(filePath, outputPath, {
          createBackup: false,
          cache: false,
          verbose: false
        });
      }, `Performance test - ${name}`);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(size / 1024 * 100); // Should process in < 100ms per KB
      
      // Log performance metrics
      console.log(`${name}: ${size}KB processed in ${processingTime.toFixed(2)}ms (${(processingTime / size * 1024).toFixed(2)}ms/KB)`);
    }, 30000); // 30 second timeout per test
  });
  
  describe('Memory Usage Performance', () => {
    test('should handle large files without excessive memory usage', async () => {
      const largeFilePath = path.join(testDir, 'huge.css');
      const outputPath = path.join(testDir, 'huge.optimized.css');
      
      const initialMemory = process.memoryUsage();
      
      const result = await ErrorHandler.withErrorHandling(async () => {
        return await optimizeCss(largeFilePath, outputPath, {
          createBackup: false,
          cache: false,
          verbose: false
        });
      }, 'Memory test - large file');
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      expect(result.success).toBe(true);
      expect(memoryIncreaseMB).toBeLessThan(50); // Should use less than 50MB additional memory
      
      console.log(`Memory increase for 1MB file: ${memoryIncreaseMB.toFixed(2)}MB`);
    }, 30000);
  });
  
  describe('Concurrent Processing Performance', () => {
    test('should handle concurrent file processing efficiently', async () => {
      const concurrentFiles = testFiles.slice(0, 3); // Test with 3 files
      
      const startTime = performance.now();
      
      const promises = concurrentFiles.map(({ path: filePath, name }) => {
        const outputPath = path.join(testDir, `${name}.concurrent.optimized.css`);
        return ErrorHandler.withErrorHandling(async () => {
          return await optimizeCss(filePath, outputPath, {
            createBackup: false,
            cache: false,
            verbose: false
          });
        }, `Concurrent test - ${name}`);
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should process 3 files in under 5 seconds
      
      console.log(`Concurrent processing of 3 files: ${totalTime.toFixed(2)}ms`);
    }, 30000);
  });
  
  describe('Caching Performance', () => {
    test('should demonstrate performance improvement with caching', async () => {
      const filePath = path.join(testDir, 'large.css');
      const outputPath = path.join(testDir, 'large.cached.optimized.css');
      
      // First run (without cache)
      const start1 = performance.now();
      const result1 = await ErrorHandler.withErrorHandling(async () => {
        return await optimizeCss(filePath, outputPath, {
          createBackup: false,
          cache: false,
          verbose: false
        });
      }, 'Cache test - first run');
      
      const end1 = performance.now();
      const firstRunTime = end1 - start1;
      
      // Second run (with cache)
      const start2 = performance.now();
      const result2 = await ErrorHandler.withErrorHandling(async () => {
        return await optimizeCss(filePath, outputPath, {
          createBackup: false,
          cache: true,
          verbose: false
        });
      }, 'Cache test - second run');
      
      const end2 = performance.now();
      const secondRunTime = end2 - start2;
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(secondRunTime).toBeLessThan(firstRunTime * 0.1); // Cached run should be at least 10x faster
      
      console.log(`First run: ${firstRunTime.toFixed(2)}ms`);
      console.log(`Cached run: ${secondRunTime.toFixed(2)}ms`);
      console.log(`Cache speedup: ${(firstRunTime / secondRunTime).toFixed(2)}x`);
    }, 30000);
  });
  
  describe('Security Validation Performance', () => {
    test('should validate CSS content efficiently', async () => {
      const largeCSS = generateTestCSS(1000); // 1000 rules (~1MB)
      
      const startTime = performance.now();
      
      // Test path validation
      const validatedPath = SecurityUtils.validatePath('/safe/path/file.css');
      
      // Test CSS content validation
      SecurityUtils.validateCSSContent(largeCSS);
      
      // Test log sanitization
      const sanitizedLog = SecurityUtils.sanitizeLogData('API key: gsk_1234567890abcdef1234567890abcdef');
      
      // Test hash creation
      const hash = SecurityUtils.createHash(largeCSS);
      
      const endTime = performance.now();
      const validationTime = endTime - startTime;
      
      expect(validatedPath).toBe(path.resolve('/safe/path/file.css'));
      expect(sanitizedLog).toContain('gsk_1234567...[REDACTED]');
      expect(hash).toHaveLength(16);
      expect(validationTime).toBeLessThan(100); // Should validate in under 100ms
      
      console.log(`Security validation time: ${validationTime.toFixed(2)}ms`);
    });
  });
  
  describe('File Handler Performance', () => {
    test('should resolve and validate files efficiently', async () => {
      const fileHandler = new FileHandler({
        maxFileSize: 1024 * 1024 * 10, // 10MB
        allowedExtensions: ['.css']
      });
      
      const startTime = performance.now();
      
      // Test file resolution
      const resolvedFiles = await fileHandler.resolveFiles(testFiles.map(f => f.path));
      
      // Test batch file info
      const fileInfo = await fileHandler.getBatchFileInfo(testFiles.map(f => f.path));
      
      const endTime = performance.now();
      const handlerTime = endTime - startTime;
      
      expect(resolvedFiles.length).toBe(testFiles.length);
      expect(fileInfo.length).toBe(testFiles.length);
      expect(handlerTime).toBeLessThan(100); // Should handle in under 100ms
      
      console.log(`File handler processing time: ${handlerTime.toFixed(2)}ms`);
    });
  });
  
  describe('Error Handling Performance', () => {
    test('should handle errors efficiently', async () => {
      const testFunction = () => {
        throw new Error('Test error');
      };
      
      const startTime = performance.now();
      
      // Test error categorization
      const testError = { code: 'ENOENT', message: 'File not found' };
      const category = ErrorHandler.categorizeError(testError);
      
      // Test error handling
      const result = await ErrorHandler.withErrorHandling(testFunction, 'Performance test');
      
      // Test retry mechanism
      const retryResult = await ErrorHandler.withRetry(testFunction, 3, 10, 'Retry test');
      
      const endTime = performance.now();
      const errorHandlingTime = endTime - startTime;
      
      expect(category).toBe('FILE_NOT_FOUND');
      expect(result.success).toBe(false);
      expect(retryResult.success).toBe(false);
      expect(errorHandlingTime).toBeLessThan(50); // Should handle errors in under 50ms
      
      console.log(`Error handling time: ${errorHandlingTime.toFixed(2)}ms`);
    });
  });
  
  describe('Benchmark Suite', () => {
    test('should run comprehensive performance benchmark', async () => {
      const benchmarkResults = [];
      
      for (const { path: filePath, size, name } of testFiles) {
        const outputPath = path.join(testDir, `${name}.benchmark.optimized.css`);
        
        // Warm up
        await ErrorHandler.withErrorHandling(async () => {
          return await optimizeCss(filePath, outputPath, {
            createBackup: false,
            cache: false,
            verbose: false
          });
        }, `Benchmark warmup - ${name}`);
        
        // Actual benchmark (multiple runs)
        const times = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          
          await ErrorHandler.withErrorHandling(async () => {
            return await optimizeCss(filePath, outputPath, {
              createBackup: false,
              cache: false,
              verbose: false
            });
          }, `Benchmark run ${i + 1} - ${name}`);
          
          const end = performance.now();
          times.push(end - start);
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        benchmarkResults.push({
          name,
          size,
          avgTime,
          minTime,
          maxTime,
          throughput: size / avgTime // KB per ms
        });
        
        console.log(`${name} (${size}KB): avg ${avgTime.toFixed(2)}ms, min ${minTime.toFixed(2)}ms, max ${maxTime.toFixed(2)}ms, throughput ${(size / avgTime).toFixed(2)}KB/ms`);
      }
      
      // Verify performance expectations
      benchmarkResults.forEach(result => {
        expect(result.avgTime).toBeLessThan(result.size / 10); // Should process at least 10KB per ms
        expect(result.throughput).toBeGreaterThan(10); // Should have throughput > 10KB/ms
      });
      
      // Log overall benchmark summary
      const totalSize = benchmarkResults.reduce((sum, r) => sum + r.size, 0);
      const totalTime = benchmarkResults.reduce((sum, r) => sum + r.avgTime, 0);
      const overallThroughput = totalSize / totalTime;
      
      console.log(`\\n📊 Benchmark Summary:`);
      console.log(`   Total size processed: ${totalSize}KB`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Overall throughput: ${overallThroughput.toFixed(2)}KB/ms`);
      console.log(`   Performance rating: ${overallThroughput > 20 ? '🔥 Excellent' : overallThroughput > 10 ? '⚡ Good' : '👌 Acceptable'}`);
    }, 60000); // 60 second timeout
  });
});

// Helper function to generate test CSS
function generateTestCSS(ruleCount) {
  let css = '/* Performance test CSS */\\n';
  css += ':root {\\n';
  css += '  --primary-color: #007bff;\\n';
  css += '  --secondary-color: #6c757d;\\n';
  css += '  --font-size-base: 16px;\\n';
  css += '  --spacing-unit: 8px;\\n';
  css += '}\\n\\n';
  
  for (let i = 1; i <= ruleCount; i++) {
    css += `.perf-class-${i} {\\n`;
    css += `  color: var(--primary-color);\\n`;
    css += `  font-size: var(--font-size-base);\\n`;
    css += `  margin: calc(var(--spacing-unit) * 2);\\n`;
    css += `  padding: var(--spacing-unit);\\n`;
    css += `  background-color: ${i % 2 === 0 ? '#f8f9fa' : '#ffffff'};\\n`;
    css += `  border: 1px solid ${i % 3 === 0 ? 'var(--primary-color)' : '#dee2e6'};\\n`;
    css += `  border-radius: ${i % 4 === 0 ? '4px' : '0'};\\n`;
    css += `  box-shadow: ${i % 5 === 0 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};\\n`;
    css += `  transition: ${i % 6 === 0 ? 'all 0.3s ease' : 'none'};\\n`;
    css += `  transform: ${i % 7 === 0 ? 'translateY(0)' : 'none'};\\n`;
    css += `  opacity: ${i % 8 === 0 ? '0.9' : '1'};\\n`;
    css += `  z-index: ${i};\\n`;
    css += `  position: ${i % 9 === 0 ? 'relative' : 'static'};\\n`;
    css += `  display: ${i % 10 === 0 ? 'flex' : 'block'};\\n`;
    css += `  flex-direction: ${i % 11 === 0 ? 'column' : 'row'};\\n`;
    css += `  align-items: ${i % 12 === 0 ? 'center' : 'stretch'};\\n`;
    css += `  justify-content: ${i % 13 === 0 ? 'center' : 'flex-start'};\\n`;
    css += `  text-align: ${i % 14 === 0 ? 'center' : 'left'};\\n`;
    css += `  white-space: ${i % 15 === 0 ? 'nowrap' : 'normal'};\\n`;
    css += `  overflow: ${i % 16 === 0 ? 'hidden' : 'visible'};\\n`;
    css += `  text-overflow: ${i % 17 === 0 ? 'ellipsis' : 'clip'};\\n`;
    css += `  word-wrap: ${i % 18 === 0 ? 'break-word' : 'normal'};\\n`;
    css += `  word-break: ${i % 19 === 0 ? 'break-all' : 'normal'};\\n`;
    css += `  hyphens: ${i % 20 === 0 ? 'auto' : 'none'};\\n`;
    css += `  line-height: ${1 + (i % 10) * 0.1};\\n`;
    css += `  letter-spacing: ${i % 21 === 0 ? '0.5px' : 'normal'};\\n`;
    css += `  text-decoration: ${i % 22 === 0 ? 'underline' : 'none'};\\n`;
    css += `  text-transform: ${i % 23 === 0 ? 'uppercase' : 'none'};\\n`;
    css += `  font-weight: ${i % 24 === 0 ? 'bold' : 'normal'};\\n`;
    css += `  font-style: ${i % 25 === 0 ? 'italic' : 'normal'};\\n`;
    css += `  font-family: ${i % 26 === 0 ? 'monospace' : 'inherit'};\\n`;
    css += `  text-shadow: ${i % 27 === 0 ? '1px 1px 2px rgba(0,0,0,0.1)' : 'none'};\\n`;
    css += `  cursor: ${i % 28 === 0 ? 'pointer' : 'default'};\\n`;
    css += `  user-select: ${i % 29 === 0 ? 'none' : 'auto'};\\n`;
    css += `  pointer-events: ${i % 30 === 0 ? 'none' : 'auto'};\\n`;
    css += `  visibility: ${i % 31 === 0 ? 'hidden' : 'visible'};\\n`;
    css += `  opacity: ${0.5 + (i % 50) * 0.01};\\n`;
    css += `  filter: ${i % 32 === 0 ? 'blur(1px)' : 'none'};\\n`;
    css += `  backdrop-filter: ${i % 33 === 0 ? 'blur(5px)' : 'none'};\\n`;
    css += `  mix-blend-mode: ${i % 34 === 0 ? 'multiply' : 'normal'};\\n`;
    css += `  isolation: ${i % 35 === 0 ? 'isolate' : 'auto'};\\n`;
    css += `  object-fit: ${i % 36 === 0 ? 'cover' : 'fill'};\\n`;
    css += `  object-position: ${i % 37 === 0 ? 'center' : 'top'};\\n`;
    css += `  grid-area: ${i % 38 === 0 ? '1 / 1 / 2 / 2' : 'auto'};\\n`;
    css += `  grid-column: ${i % 39 === 0 ? '1 / -1' : 'auto'};\\n`;
    css += `  grid-row: ${i % 40 === 0 ? '1 / -1' : 'auto'};\\n`;
    css += `  grid-template-columns: ${i % 41 === 0 ? '1fr 1fr' : 'none'};\\n`;
    css += `  grid-template-rows: ${i % 42 === 0 ? '1fr 1fr' : 'none'};\\n`;
    css += `  grid-auto-columns: ${i % 43 === 0 ? '1fr' : 'auto'};\\n`;
    css += `  grid-auto-rows: ${i % 44 === 0 ? '1fr' : 'auto'};\\n`;
    css += `  grid-auto-flow: ${i % 45 === 0 ? 'row' : 'column'};\\n`;
    css += `  grid-gap: ${i % 46 === 0 ? '1rem' : '0'};\\n`;
    css += `  align-content: ${i % 47 === 0 ? 'center' : 'stretch'};\\n`;
    css += `  justify-content: ${i % 48 === 0 ? 'center' : 'stretch'};\\n`;
    css += `  place-content: ${i % 49 === 0 ? 'center' : 'stretch'};\\n`;
    css += `  place-items: ${i % 50 === 0 ? 'center' : 'stretch'};\\n`;
    css += `} \\n\\n`;
    
    // Add some nested selectors
    if (i % 5 === 0) {
      css += `.perf-class-${i}:hover {\\n`;
      css += `  background-color: var(--secondary-color);\\n`;
      css += `  transform: translateY(-2px);\\n`;
      css += `  box-shadow: 0 4px 8px rgba(0,0,0,0.2);\\n`;
      css += `} \\n\\n`;
    }
    
    // Add some media queries
    if (i % 10 === 0) {
      css += `@media (max-width: 768px) {\\n`;
      css += `  .perf-class-${i} {\\n`;
      css += `    font-size: 14px;\\n`;
      css += `    margin: calc(var(--spacing-unit) * 1);\\n`;
      css += `    padding: calc(var(--spacing-unit) * 0.5);\\n`;
      css += `  }\\n`;
      css += `} \\n\\n`;
    }
    
    // Add some animations
    if (i % 15 === 0) {
      css += `@keyframes perfAnimation-${i} {\\n`;
      css += `  0% { opacity: 0; transform: translateY(10px); }\\n`;
      css += `  100% { opacity: 1; transform: translateY(0); }\\n`;
      css += `} \\n\\n`;
      css += `.perf-class-${i} {\\n`;
      css += `  animation: perfAnimation-${i} 0.5s ease-out;\\n`;
      css += `} \\n\\n`;
    }
  }
  
  return css;
}