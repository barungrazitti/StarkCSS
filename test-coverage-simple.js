// test-coverage-simple.js - Simple direct imports for coverage
// Using require() to avoid ES module issues

describe("Simple Coverage Tests", () => {
  // Import modules directly for coverage
  let cssModule, errorModule, securityModule, mediaModule, fileModule, frameworkModule;

  beforeAll(() => {
    // Force coverage collection by requiring modules explicitly
    cssModule = require('./css-optimizer.js');
    errorModule = require('./error-handler.js');
    securityModule = require('./security.js');
    mediaModule = require('./media-query-combiner.js');
    fileModule = require('./file-handler.js');
    frameworkModule = require('./framework-optimizer.js');
  });

  describe("CSS Optimizer Coverage", () => {
    test("should analyze CSS", () => {
      const css = 'body { color: red; margin: 0; }';
      const analysis = cssModule.analyzeCss(css);
      
      expect(analysis).toBeDefined();
      expect(analysis.totalSize).toBeGreaterThan(0);
      expect(analysis.totalSelectors).toBe(1);
      expect(analysis.totalProperties).toBe(2);
    });

    test("should validate config", () => {
      expect(() => cssModule.validateConfig()).not.toThrow();
    });

    test("should apply fixes", () => {
      const css = 'body { color: #ff0000; margin: 0px; }';
      const fixed = cssModule.applyAdditionalFixes(css);
      
      expect(fixed).toBeDefined();
      expect(typeof fixed).toBe('string');
    });

    test("should create cache key", () => {
      const key1 = cssModule.createCacheKey('test.css', 'body { color: red; }', {});
      const key2 = cssModule.createCacheKey('test.css', 'body { color: red; }', {});
      
      expect(key1).toBe(key2);
    });

    test("should extract CSS from JS", () => {
      const js = 'const styles = `.test { color: red; }`';
      const extracted = cssModule.extractCSSFromJS(js);
      
      expect(extracted).toBeDefined();
      expect(typeof extracted).toBe('string');
    });

    test("should convert object styles", () => {
      const obj = '{ "color": "red" }';
      const css = cssModule.convertObjectToCSS(obj);
      
      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
    });

    test("should generate report", () => {
      const analysis = {
        totalSize: 100,
        totalLines: 5,
        totalSelectors: 1,
        uniqueSelectors: 1,
        totalProperties: 2,
        uniqueProperties: 2,
        totalRules: 1,
        totalMediaQueries: 0,
        duplicateSelectors: 0,
        importStatements: 0,
        fontFaceDeclarations: 0,
        keyframeDeclarations: 0,
        totalDeclarations: 2,
        mediaQueries: [],
        mostUsedProperties: [['color', 1], ['margin', 1]]
      };
      
      expect(() => cssModule.generateAnalysisReport(analysis)).not.toThrow();
    });
  });

  describe("ErrorHandler Coverage", () => {
    test("should categorize errors", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      expect(ErrorHandler.categorizeError({ code: "ENOENT" })).toBe("FILE_NOT_FOUND");
      expect(ErrorHandler.categorizeError({ code: "EACCES" })).toBe("PERMISSION_DENIED");
      expect(ErrorHandler.categorizeError({ name: "AbortError" })).toBe("TIMEOUT");
      expect(ErrorHandler.categorizeError({ message: "network error" })).toBe("NETWORK_ERROR");
    });

    test("should check recoverability", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      expect(ErrorHandler.isRecoverable({ code: "ENOENT" })).toBe(true);
      expect(ErrorHandler.isRecoverable({ code: "EACCES" })).toBe(false);
      expect(ErrorHandler.isRecoverable({ message: "503" })).toBe(true);
      expect(ErrorHandler.isRecoverable({ message: "401" })).toBe(false);
    });

    test("should handle errors", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      const error = new Error("Test error");
      const result = ErrorHandler.handleError(error, "TestContext");
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('context', 'TestContext');
      expect(result).toHaveProperty('message', 'Test error');
      expect(result).toHaveProperty('type');
    });

    test("should log errors", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      expect(() => ErrorHandler.logError({
        success: false,
        context: "test",
        message: "test",
        type: "test",
        timestamp: new Date().toISOString(),
        recoverable: true
      })).not.toThrow();
    });

    test("should wrap async functions", async () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      const successFn = async () => "success";
      const result1 = await ErrorHandler.withErrorHandling(successFn, "SuccessTest");
      expect(result1).toBe("success");
      
      const failFn = async () => { throw new Error("Async error"); };
      const result2 = await ErrorHandler.withErrorHandling(failFn, "FailTest");
      expect(result2).toHaveProperty('success', false);
    });

    test("should implement retry mechanism", async () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
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
    });

    test("should use fallback mechanisms", async () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      const primaryFn = async () => { throw new Error("Primary failed"); };
      const fallbackFn = async () => "fallback result";
      
      const result = await ErrorHandler.withFallback(primaryFn, fallbackFn, "FallbackTest");
      expect(result).toBe("fallback result");
    });

    test("should validate prerequisites", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      const validPrereqs = [
        { condition: true, message: "Valid condition" }
      ];
      expect(() => ErrorHandler.validatePrerequisites(validPrereqs, "ValidTest"))
        .not.toThrow();
      
      const invalidPrereqs = [
        { condition: false, message: "Invalid condition" }
      ];
      expect(() => ErrorHandler.validatePrerequisites(invalidPrereqs, "InvalidTest"))
        .toThrow("Prerequisites not met");
    });

    test("should create progress tracker", () => {
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      const tracker = ErrorHandler.createProgressTracker(3, "TestContext");
      
      expect(typeof tracker.step).toBe('function');
      expect(typeof tracker.complete).toBe('function');
      
      expect(() => tracker.step("Step 1")).not.toThrow();
      expect(() => tracker.complete("Done")).not.toThrow();
    });
  });

  describe("SecurityUtils Coverage", () => {
    test("should validate paths", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(() => SecurityUtils.validatePath("./test.css")).not.toThrow();
      expect(() => SecurityUtils.validatePath("style.css")).not.toThrow();
      
      expect(() => SecurityUtils.validatePath("")).toThrow();
      expect(() => SecurityUtils.validatePath("../../../etc/passwd")).toThrow();
    });

    test("should sanitize logs", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      const logWithKey = 'API key: gsk_1234567890abcdef';
      const sanitized = SecurityUtils.sanitizeLogData(logWithKey);
      
      expect(sanitized).toContain('***');
      expect(sanitized).not.toContain('gsk_1234567890abcdef');
    });

    test("should validate CSS", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(SecurityUtils.validateCSSContent("body { color: red; }")).toBe(true);
      
      expect(() => SecurityUtils.validateCSSContent("a { background: url(javascript:alert(1)); }"))
        .toThrow();
    });

    test("should validate numbers", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(SecurityUtils.validateNumber("10")).toBe(10);
      expect(SecurityUtils.validateNumber("invalid")).toBe(0);
      expect(SecurityUtils.validateNumber("15", 5, 10)).toBe(10);
    });

    test("should validate booleans", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(SecurityUtils.validateBoolean(true)).toBe(true);
      expect(SecurityUtils.validateBoolean(false)).toBe(false);
      expect(SecurityUtils.validateBoolean("true")).toBe(true);
      expect(SecurityUtils.validateBoolean("false")).toBe(false);
      expect(SecurityUtils.validateBoolean("")).toBe(false);
    });

    test("should create hashes", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      const hash1 = SecurityUtils.createHash("test");
      const hash2 = SecurityUtils.createHash("test");
      const hash3 = SecurityUtils.createHash("different");
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(16);
    });

    test("should validate regex", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(SecurityUtils.validateRegex("test")).toBeDefined();
      expect(() => SecurityUtils.validateRegex(null)).toThrow();
      expect(() => SecurityUtils.validateRegex("(.+)+")).toThrow();
    });
  });

  describe("Media Query Combiner Coverage", () => {
    test("should combine duplicate media queries", () => {
      const combineDuplicateMediaQueries = mediaModule.combineDuplicateMediaQueries || 
                                       mediaModule.default?.combineDuplicateMediaQueries;
      
      const css = `
        @media (max-width: 768px) {
          .a { color: red; }
        }
        @media (max-width: 768px) {
          .b { margin: 0; }
        }
      `;
      
      const result = combineDuplicateMediaQueries(css);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('css');
      expect(result).toHaveProperty('count');
      expect(result.count).toBe(1);
    });

    test("should handle empty CSS", () => {
      const combineDuplicateMediaQueries = mediaModule.combineDuplicateMediaQueries || 
                                       mediaModule.default?.combineDuplicateMediaQueries;
      
      const result = combineDuplicateMediaQueries('');
      expect(result).toEqual({ css: '', count: 0 });
    });

    test("should handle CSS without media queries", () => {
      const combineDuplicateMediaQueries = mediaModule.combineDuplicateMediaQueries || 
                                       mediaModule.default?.combineDuplicateMediaQueries;
      
      const css = '.a { color: red; } .b { margin: 0; }';
      const result = combineDuplicateMediaQueries(css);
      
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });
  });

  describe("FileHandler Coverage", () => {
    test("should create FileHandler", () => {
      const FileHandler = fileModule.FileHandler || fileModule.default?.FileHandler;
      
      const handler = new FileHandler();
      expect(handler).toBeDefined();
      expect(handler.options).toBeDefined();
      expect(handler.options.maxFileSize).toBe(10 * 1024 * 1024);
      expect(handler.options.allowedExtensions).toEqual(['.css']);
    });

    test("should create FileHandler with custom options", () => {
      const FileHandler = fileModule.FileHandler || fileModule.default?.FileHandler;
      
      const handler = new FileHandler({
        maxFileSize: 5 * 1024 * 1024,
        allowedExtensions: ['.css', '.scss']
      });
      
      expect(handler.options.maxFileSize).toBe(5 * 1024 * 1024);
      expect(handler.options.allowedExtensions).toEqual(['.css', '.scss']);
    });

    test("should detect glob patterns", () => {
      const FileHandler = fileModule.FileHandler || fileModule.default?.FileHandler;
      
      const handler = new FileHandler();
      
      expect(handler.isGlobPattern('*.css')).toBe(true);
      expect(handler.isGlobPattern('**/*.css')).toBe(true);
      expect(handler.isGlobPattern('file?.css')).toBe(true);
      expect(handler.isGlobPattern('style.css')).toBe(false);
      expect(handler.isGlobPattern('')).toBe(false);
    });

    test("should generate output paths", () => {
      const FileHandler = fileModule.FileHandler || fileModule.default?.FileHandler;
      
      const handler = new FileHandler();
      
      expect(handler.generateOutputPath('/path/to/style.css'))
        .toBe('/path/to/style.optimized.css');
      
      expect(handler.generateOutputPath('/path/to/style.css', { suffix: '.min' }))
        .toBe('/path/to/style.min.css');
      
      expect(handler.generateOutputPath('/path/to/style.css', { outputDir: '/output' }))
        .toBe('/output/style.css');
    });
  });

  describe("FrameworkOptimizer Coverage", () => {
    test("should create FrameworkOptimizer", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer();
      expect(optimizer).toBeDefined();
      expect(optimizer.options).toBeDefined();
      expect(optimizer.options.framework).toBe('auto');
      expect(optimizer.options.preserveCritical).toBe(true);
    });

    test("should create FrameworkOptimizer with custom options", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer({
        framework: 'react',
        preserveCritical: false,
        optimizeForProduction: false
      });
      
      expect(optimizer.options.framework).toBe('react');
      expect(optimizer.options.preserveCritical).toBe(false);
      expect(optimizer.options.optimizeForProduction).toBe(false);
    });

    test("should get framework patterns", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer();
      
      const reactPatterns = optimizer.getFrameworkPatterns('react');
      expect(reactPatterns).toContain('**/*.jsx');
      expect(reactPatterns).toContain('**/*.tsx');
      
      const vuePatterns = optimizer.getFrameworkPatterns('vue');
      expect(vuePatterns).toContain('**/*.vue');
      
      const autoPatterns = optimizer.getFrameworkPatterns('auto');
      expect(autoPatterns.length).toBeGreaterThan(0);
      
      const unknownPatterns = optimizer.getFrameworkPatterns('unknown');
      expect(unknownPatterns).toEqual([]);
    });

    test("should parse React CSS usage", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer();
      
      const reactContent = `
        import styles from './styles.module.css';
        const App = () => (
          <div className={styles.container} className="main-class">
            <span style={{backgroundColor: 'white'}}>Content</span>
          </div>
        );
      `;
      
      const usage = optimizer.parseFileForCSSUsage(reactContent, '.jsx', 'react');
      
      expect(usage).toBeDefined();
      expect(usage.classes.has('container')).toBe(true);
      expect(usage.classes.has('main-class')).toBe(true);
    });

    test("should parse Vue CSS usage", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer();
      
      const vueContent = `
        <template>
          <div class="container" :class="{'active': isActive}">
            <span class="text-bold">{{ message }}</span>
          </div>
        </template>
      `;
      
      const usage = optimizer.parseFileForCSSUsage(vueContent, '.vue', 'vue');
      
      expect(usage).toBeDefined();
      expect(usage.classes.has('container')).toBe(true);
      expect(usage.classes.has('active')).toBe(true);
      expect(usage.classes.has('text-bold')).toBe(true);
    });

    test("should parse Angular CSS usage", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
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
      
      expect(usage).toBeDefined();
      expect(usage.components.has('app-root')).toBe(true);
    });

    test("should parse Tailwind CSS usage", () => {
      const FrameworkOptimizer = frameworkModule.FrameworkOptimizer || 
                              frameworkModule.default?.FrameworkOptimizer;
      
      const optimizer = new FrameworkOptimizer();
      
      const tailwindContent = `
        <div class="flex items-center justify-between p-4 bg-blue-500">
          <button class="px-4 py-2 bg-white rounded-md">Click me</button>
        </div>
      `;
      
      const usage = optimizer.parseFileForCSSUsage(tailwindContent, '.html', 'tailwind');
      
      expect(usage).toBeDefined();
      expect(usage.utilities.has('flex')).toBe(true);
      expect(usage.utilities.has('items-center')).toBe(true);
      expect(usage.utilities.has('justify-between')).toBe(true);
      expect(usage.utilities.has('p-4')).toBe(true);
      expect(usage.utilities.has('bg-blue-500')).toBe(true);
    });
  });

  describe("Edge Cases Coverage", () => {
    test("should handle null/undefined inputs", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      
      expect(SecurityUtils.sanitizeLogData(null)).toBeNull();
      expect(SecurityUtils.sanitizeLogData(undefined)).toBeUndefined();
      expect(SecurityUtils.validateNumber(null)).toBe(0);
      expect(SecurityUtils.validateFloat(null)).toBe(0);
      expect(SecurityUtils.validateBoolean(null)).toBe(false);
    });

    test("should handle empty CSS", () => {
      expect(() => cssModule.analyzeCss("")).not.toThrow();
      expect(() => cssModule.analyzeCss("   ")).not.toThrow();
      expect(() => cssModule.analyzeCss("/* empty comment */")).not.toThrow();
      
      const analysis1 = cssModule.analyzeCss("");
      const analysis2 = cssModule.analyzeCss("   ");
      expect(analysis1.totalSize).toBe(0);
      expect(analysis2.totalSize).toBe(3);
    });

    test("should handle performance with large CSS", () => {
      let css = '';
      for (let i = 0; i < 100; i++) {
        css += `.class-${i} { color: ${i % 2 === 0 ? 'red' : 'blue'}; margin: ${i}px; }\n`;
      }
      
      const startTime = Date.now();
      const analysis = cssModule.analyzeCss(css);
      const endTime = Date.now();
      
      expect(analysis).toBeDefined();
      expect(analysis.totalSelectors).toBe(100);
      expect(analysis.totalProperties).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test("should validate various input types", () => {
      const SecurityUtils = securityModule.SecurityUtils || securityModule.default?.SecurityUtils;
      const ErrorHandler = errorModule.ErrorHandler || errorModule.default?.ErrorHandler;
      
      // Test all validation functions with various inputs
      expect(() => SecurityUtils.validatePath(true)).toThrow();
      expect(() => SecurityUtils.validatePath(123)).toThrow();
      expect(SecurityUtils.validateFloat("10.5")).toBe(10.5);
      expect(SecurityUtils.validateFloat("invalid")).toBe(0);
      
      // Test error handling
      expect(() => ErrorHandler.handleError(null, "test")).not.toThrow();
      expect(() => ErrorHandler.handleError(new Error("test"), null)).not.toThrow();
    });
  });
});