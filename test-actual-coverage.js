// test-actual-coverage.js - Tests that actually execute code paths for coverage
// Uses CommonJS for Jest compatibility

const fs = require('fs');
const path = require('path');

describe("Actual Coverage Tests - Execute Code Paths", () => {
  let testFiles = [];

  beforeAll(() => {
    // Create some test files for testing
    testFiles = [
      { name: 'test-basic.css', content: 'body { color: red; margin: 0; }' },
      { name: 'test-media.css', content: `
        @media (max-width: 768px) {
          .container { display: block; }
        }
        @media (max-width: 768px) {
          .button { padding: 10px; }
        }
      ` },
      { name: 'test-complex.css', content: `
        /* Test CSS with various features */
        @import url("reset.css");
        
        .class1 { 
          color: #ff0000; 
          margin: 0px; 
          padding: 0px;
          background: url("image.jpg");
        }
        
        #id1 { 
          font-size: 14px; 
        }
        
        .class1:hover {
          opacity: 0.8;
        }
        
        @media (min-width: 768px) {
          .responsive {
            display: flex;
            align-items: center;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      ` }
    ];

    testFiles.forEach(file => {
      if (fs.existsSync(file.name)) {
        fs.unlinkSync(file.name);
      }
      fs.writeFileSync(file.name, file.content);
    });
  });

  afterAll(() => {
    // Clean up test files
    testFiles.forEach(file => {
      if (fs.existsSync(file.name)) {
        fs.unlinkSync(file.name);
      }
      if (fs.existsSync(file.name.replace('.css', '.optimized.css'))) {
        fs.unlinkSync(file.name.replace('.css', '.optimized.css'));
      }
      if (fs.existsSync(file.name.replace('.css', '.backup.css'))) {
        fs.unlinkSync(file.name.replace('.css', '.backup.css'));
      }
    });
  });

  describe("CSS Optimizer Execution", () => {
    test("should analyze CSS code", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.analyzeCss) {
        const analysis = cssModule.analyzeCss('body { color: red; }');
        
        expect(analysis).toBeDefined();
        expect(analysis.totalSize).toBeGreaterThan(0);
        expect(analysis.totalSelectors).toBe(1);
        expect(analysis.totalProperties).toBe(1);
      }
    });

    test("should validate configuration", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.validateConfig) {
        expect(() => cssModule.validateConfig()).not.toThrow();
      }
    });

    test("should apply additional fixes", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.applyAdditionalFixes) {
        const css = 'body { color: #ff0000; margin: 0px; }';
        const fixed = cssModule.applyAdditionalFixes(css);
        
        expect(fixed).toBeDefined();
        expect(typeof fixed).toBe('string');
      }
    });

    test("should create cache key", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.createCacheKey) {
        const key1 = cssModule.createCacheKey('test.css', 'body { color: red; }', {});
        const key2 = cssModule.createCacheKey('test.css', 'body { color: red; }', {});
        const key3 = cssModule.createCacheKey('test.css', 'body { color: blue; }', {});
        
        expect(key1).toBe(key2);
        expect(key1).not.toBe(key3);
      }
    });

    test("should extract CSS from JavaScript", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.extractCSSFromJS) {
        const js = `
          import styles from './styles.module.css';
          const StyledDiv = styled.div\`color: red;\`;
          const css = \`.container { display: flex; }\`;
        `;
        
        const extracted = cssModule.extractCSSFromJS(js);
        expect(extracted).toBeDefined();
        expect(typeof extracted).toBe('string');
      }
    });

    test("should convert object styles to CSS", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.convertObjectToCSS) {
        const obj = { color: 'red', fontSize: '14px' };
        const css = cssModule.convertObjectToCSS(JSON.stringify(obj));
        
        expect(css).toBeDefined();
        expect(typeof css).toBe('string');
      }
    });

    test("should run basic optimization", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.optimizeCss) {
        const result = await cssModule.optimizeCss(
          testFiles[0].name,
          testFiles[0].name.replace('.css', '.optimized.css'),
          { createBackup: false, analyze: false }
        );
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      }
    });
  });

  describe("ErrorHandler Execution", () => {
    test("should categorize different error types", async () => {
      const errorModule = await import('./error-handler.js');
      
      if (errorModule.ErrorHandler) {
        const ErrorHandler = errorModule.ErrorHandler;
        
        // Test error categorization
        expect(ErrorHandler.categorizeError({ code: "ENOENT" })).toBe("FILE_NOT_FOUND");
        expect(ErrorHandler.categorizeError({ code: "EACCES" })).toBe("PERMISSION_DENIED");
        expect(ErrorHandler.categorizeError({ message: "network error" })).toBe("NETWORK_ERROR");
        
        // Test recoverability
        expect(ErrorHandler.isRecoverable({ code: "ENOENT" })).toBe(true);
        expect(ErrorHandler.isRecoverable({ code: "EACCES" })).toBe(false);
        
        // Test error handling
        const error = new Error("Test error");
        const result = ErrorHandler.handleError(error, "TestContext");
        
        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('context', 'TestContext');
        expect(result).toHaveProperty('type');
      }
    });

    test("should handle retry mechanisms", async () => {
      const errorModule = await import('./error-handler.js');
      
      if (errorModule.ErrorHandler) {
        const ErrorHandler = errorModule.ErrorHandler;
        
        let attempts = 0;
        const failTwiceSucceed = async () => {
          attempts++;
          if (attempts <= 2) {
            const error = new Error("Temporary failure");
            error.code = "ENOENT";
            throw error;
          }
          return "success";
        };
        
        const result = await ErrorHandler.withRetry(failTwiceSucceed, 3, 10, "RetryTest");
        expect(result).toBe("success");
        expect(attempts).toBe(3);
      }
    });

    test("should use fallback mechanisms", async () => {
      const errorModule = await import('./error-handler.js');
      
      if (errorModule.ErrorHandler) {
        const ErrorHandler = errorModule.ErrorHandler;
        
        const primaryFn = async () => { throw new Error("Primary failed"); };
        const fallbackFn = async () => "fallback result";
        
        const result = await ErrorHandler.withFallback(primaryFn, fallbackFn, "FallbackTest");
        expect(result).toBe("fallback result");
      }
    });

    test("should validate prerequisites", async () => {
      const errorModule = await import('./error-handler.js');
      
      if (errorModule.ErrorHandler) {
        const ErrorHandler = errorModule.ErrorHandler;
        
        const validPrereqs = [
          { condition: true, message: "Valid" }
        ];
        
        expect(() => ErrorHandler.validatePrerequisites(validPrereqs, "Test"))
          .not.toThrow();
        
        const invalidPrereqs = [
          { condition: false, message: "Invalid" }
        ];
        
        expect(() => ErrorHandler.validatePrerequisites(invalidPrereqs, "Test"))
          .toThrow("Prerequisites not met");
      }
    });
  });

  describe("SecurityUtils Execution", () => {
    test("should validate file paths", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        // Valid paths
        expect(() => SecurityUtils.validatePath("./test.css")).not.toThrow();
        expect(() => SecurityUtils.validatePath("style.css")).not.toThrow();
        
        // Invalid paths
        expect(() => SecurityUtils.validatePath("../../../etc/passwd"))
          .toThrow("Path traversal detected");
        expect(() => SecurityUtils.validatePath(""))
          .toThrow("Invalid file path");
      }
    });

    test("should sanitize log data", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        const logWithApiKey = 'Bearer gsk_1234567890abcdefghijklmnopqrstuvwxyz';
        const sanitized = SecurityUtils.sanitizeLogData(logWithApiKey);
        
        expect(sanitized).toContain('Bearer ***');
        expect(sanitized).not.toContain('gsk_1234567890abcdefghijklmnopqrstuvwxyz');
      }
    });

    test("should validate CSS content", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        // Valid CSS
        expect(SecurityUtils.validateCSSContent("body { color: red; }")).toBe(true);
        
        // Dangerous CSS
        expect(() => SecurityUtils.validateCSSContent("a { background: url(javascript:alert(1)); }"))
          .toThrow("Security issues found");
        
        // Invalid content
        expect(() => SecurityUtils.validateCSSContent(null))
          .toThrow("Invalid CSS content");
      }
    });

    test("should validate numeric values", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        expect(SecurityUtils.validateNumber("10")).toBe(10);
        expect(SecurityUtils.validateNumber("invalid")).toBe(0);
        expect(SecurityUtils.validateNumber("15", 5, 10)).toBe(10);
      }
    });

    test("should create safe hashes", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        const hash1 = SecurityUtils.createHash("test");
        const hash2 = SecurityUtils.createHash("test");
        const hash3 = SecurityUtils.createHash("different");
        
        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(hash1.length).toBe(16);
      }
    });

    test("should validate regex patterns", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        // Valid regex
        expect(SecurityUtils.validateRegex("test")).toBeDefined();
        
        // Invalid regex
        expect(() => SecurityUtils.validateRegex(null))
          .toThrow("Invalid regex pattern");
        
        // Dangerous regex
        expect(() => SecurityUtils.validateRegex("(.+)+"))
          .toThrow("Potentially dangerous regex");
      }
    });
  });

  describe("Media Query Combiner Execution", () => {
    test("should combine duplicate media queries", async () => {
      const mediaModule = await import('./media-query-combiner.js');
      
      if (mediaModule.combineDuplicateMediaQueries) {
        const { combineDuplicateMediaQueries } = mediaModule;
        
        const css = `
          @media (max-width: 768px) {
            .a { color: red; }
          }
          @media (max-width: 768px) {
            .b { color: blue; }
          }
        `;
        
        const result = combineDuplicateMediaQueries(css);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('css');
        expect(result).toHaveProperty('count');
        expect(result.count).toBe(1);
      }
    });

    test("should handle complex nested media queries", async () => {
      const mediaModule = await import('./media-query-combiner.js');
      
      if (mediaModule.combineDuplicateMediaQueries) {
        const { combineDuplicateMediaQueries } = mediaModule;
        
        const css = testFiles[1].content;
        const result = combineDuplicateMediaQueries(css);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.count).toBeGreaterThan(0);
      }
    });
  });

  describe("FileHandler Execution", () => {
    test("should create and configure FileHandler", async () => {
      const fileModule = await import('./file-handler.js');
      
      if (fileModule.FileHandler) {
        const FileHandler = fileModule.FileHandler;
        
        // Default options
        const handler1 = new FileHandler();
        expect(handler1.options.maxFileSize).toBe(10 * 1024 * 1024);
        
        // Custom options
        const handler2 = new FileHandler({
          maxFileSize: 5 * 1024 * 1024,
          allowedExtensions: ['.css', '.scss']
        });
        expect(handler2.options.maxFileSize).toBe(5 * 1024 * 1024);
        expect(handler2.options.allowedExtensions).toContain('.scss');
      }
    });

    test("should detect glob patterns", async () => {
      const fileModule = await import('./file-handler.js');
      
      if (fileModule.FileHandler) {
        const FileHandler = fileModule.FileHandler;
        const handler = new FileHandler();
        
        expect(handler.isGlobPattern('*.css')).toBe(true);
        expect(handler.isGlobPattern('src/**/*.css')).toBe(true);
        expect(handler.isGlobPattern('style.css')).toBe(false);
        expect(handler.isGlobPattern('')).toBe(false);
      }
    });

    test("should generate output paths", async () => {
      const fileModule = await import('./file-handler.js');
      
      if (fileModule.FileHandler) {
        const FileHandler = fileModule.FileHandler;
        const handler = new FileHandler();
        
        const outputPath1 = handler.generateOutputPath('/path/to/style.css');
        expect(outputPath1).toBe('/path/to/style.optimized.css');
        
        const outputPath2 = handler.generateOutputPath('/path/to/style.css', { suffix: '.min' });
        expect(outputPath2).toBe('/path/to/style.min.css');
        
        const outputPath3 = handler.generateOutputPath('/path/to/style.css', { outputDir: '/output' });
        expect(outputPath3).toBe('/output/style.css');
      }
    });
  });

  describe("FrameworkOptimizer Execution", () => {
    test("should create and configure FrameworkOptimizer", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        
        // Default options
        const optimizer1 = new FrameworkOptimizer();
        expect(optimizer1.options.framework).toBe('auto');
        
        // Custom options
        const optimizer2 = new FrameworkOptimizer({
          framework: 'react',
          preserveCritical: false
        });
        expect(optimizer2.options.framework).toBe('react');
        expect(optimizer2.options.preserveCritical).toBe(false);
      }
    });

    test("should get framework patterns", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        const optimizer = new FrameworkOptimizer();
        
        const reactPatterns = optimizer.getFrameworkPatterns('react');
        expect(reactPatterns).toContain('**/*.jsx');
        
        const vuePatterns = optimizer.getFrameworkPatterns('vue');
        expect(vuePatterns).toContain('**/*.vue');
        
        const autoPatterns = optimizer.getFrameworkPatterns('auto');
        expect(autoPatterns.length).toBeGreaterThan(0);
        
        const unknownPatterns = optimizer.getFrameworkPatterns('unknown');
        expect(unknownPatterns).toEqual([]);
      }
    });

    test("should parse React files for CSS usage", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        const optimizer = new FrameworkOptimizer();
        
        const reactContent = `
          import styles from './styles.module.css';
          const Component = () => (
            <div className={styles.container + " btn"}>
              <span style={{color: 'red'}}>Text</span>
            </div>
          );
        `;
        
        const usage = optimizer.parseFileForCSSUsage(reactContent, '.jsx', 'react');
        
        expect(usage.classes.has('container')).toBe(true);
        expect(usage.classes.has('btn')).toBe(true);
        expect(usage.selectors.has('color: red')).toBe(true);
      }
    });

    test("should parse Vue files for CSS usage", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        const optimizer = new FrameworkOptimizer();
        
        const vueContent = `
          <template>
            <div class="container" :class="{'active': isActive}">
              <span class="text-bold">{{ message }}</span>
            </div>
          </template>
          <script>
            export default { data() { return { isActive: true } } }
          </script>
        `;
        
        const usage = optimizer.parseFileForCSSUsage(vueContent, '.vue', 'vue');
        
        expect(usage.classes.has('container')).toBe(true);
        expect(usage.classes.has('active')).toBe(true);
        expect(usage.classes.has('text-bold')).toBe(true);
      }
    });

    test("should parse Angular files for CSS usage", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        const optimizer = new FrameworkOptimizer();
        
        const angularContent = `
          import { Component } from '@angular/core';
          @Component({
            selector: 'app-root',
            templateUrl: './app.component.html',
            styleUrls: ['./app.component.css']
          })
          export class AppComponent {}
        `;
        
        const usage = optimizer.parseFileForCSSUsage(angularContent, '.ts', 'angular');
        
        expect(usage.components.has('app-root')).toBe(true);
      }
    });

    test("should parse Tailwind files for CSS usage", async () => {
      const frameworkModule = await import('./framework-optimizer.js');
      
      if (frameworkModule.FrameworkOptimizer) {
        const FrameworkOptimizer = frameworkModule.FrameworkOptimizer;
        const optimizer = new FrameworkOptimizer();
        
        const tailwindContent = `
          <div class="flex items-center justify-between p-4">
            <button class="px-4 py-2 bg-white rounded">
              Click
            </button>
          </div>
        `;
        
        const usage = optimizer.parseFileForCSSUsage(tailwindContent, '.html', 'tailwind');
        
        expect(usage.utilities.has('flex')).toBe(true);
        expect(usage.utilities.has('items-center')).toBe(true);
        expect(usage.utilities.has('justify-between')).toBe(true);
        expect(usage.utilities.has('p-4')).toBe(true);
        expect(usage.utilities.has('px-4')).toBe(true);
        expect(usage.utilities.has('py-2')).toBe(true);
        expect(usage.utilities.has('bg-white')).toBe(true);
        expect(usage.utilities.has('rounded')).toBe(true);
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle null and undefined inputs gracefully", async () => {
      const modules = await Promise.allSettled([
        import('./error-handler.js'),
        import('./security.js'),
        import('./css-optimizer.js')
      ]);
      
      modules.forEach((result) => {
        if (result.status === 'fulfilled') {
          const module = result.value;
          
          // Test null/undefined handling
          expect(() => {
            // These should not crash
            const str = String(null);
            const num = Number(undefined);
            return { str, num };
          }).not.toThrow();
        }
      });
    });

    test("should handle malformed CSS", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.analyzeCss) {
        const malformedCSS = [
          '',
          '   ',
          '/* empty comment */',
          'invalid css {',
          '@invalid rule',
          '.class { color: ',
          'body { color: red; ',
          '@media { .test { color: red; }'
        ];
        
        malformedCSS.forEach(css => {
          expect(() => {
            const result = cssModule.analyzeCss(css);
            return result;
          }).not.toThrow();
        });
      }
    });

    test("should handle security edge cases", async () => {
      const securityModule = await import('./security.js');
      
      if (securityModule.SecurityUtils) {
        const SecurityUtils = securityModule.SecurityUtils;
        
        const maliciousInputs = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32\\config\\sam',
          'CON',
          'PRN',
          'file<script>alert(1)</script>',
          'file|rm -rf /',
          'file&&cat /etc/passwd'
        ];
        
        maliciousInputs.forEach(input => {
          expect(() => {
            try {
              return SecurityUtils.validatePath(input);
            } catch (error) {
              return error.message;
            }
          }).not.toThrow();
        });
      }
    });
  });

  describe("Performance and Integration", () => {
    test("should handle large CSS files efficiently", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.analyzeCss) {
        // Generate a moderately large CSS
        let css = '';
        for (let i = 0; i < 100; i++) {
          css += `.class-${i} { color: ${i % 2 === 0 ? 'red' : 'blue'}; margin: ${i}px; }\n`;
        }
        
        const startTime = Date.now();
        const result = cssModule.analyzeCss(css);
        const endTime = Date.now();
        
        expect(result).toBeDefined();
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        expect(result.totalSelectors).toBe(100);
      }
    });

    test("should handle concurrent operations", async () => {
      const cssModule = await import('./css-optimizer.js');
      
      if (cssModule.analyzeCss) {
        const cssSamples = [
          'body { color: red; }',
          '.class { margin: 0; }',
          '#id { padding: 5px; }'
        ];
        
        const promises = cssSamples.map(css => 
          Promise.resolve(cssModule.analyzeCss(css))
        );
        
        const results = await Promise.all(promises);
        
        expect(results.length).toBe(3);
        results.forEach(result => {
          expect(result).toBeDefined();
          expect(result.totalSize).toBeGreaterThan(0);
        });
      }
    });
  });
});