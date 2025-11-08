// test-comprehensive-coverage.js - Comprehensive test suite for 98% coverage
// Uses dynamic imports to properly test ES modules

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to import modules with error handling
async function importModule(modulePath) {
  try {
    const module = await import(path.resolve(__dirname, modulePath));
    return module;
  } catch (error) {
    console.error(`Failed to import ${modulePath}:`, error.message);
    return null;
  }
}

describe("CSS Optimizer Comprehensive Coverage Tests", () => {
  let modules = {};

  beforeAll(async () => {
    // Import all modules before testing
    modules = {
      cssOptimizer: await importModule('./css-optimizer.js'),
      errorHandler: await importModule('./error-handler.js'),
      fileHandler: await importModule('./file-handler.js'),
      security: await importModule('./security.js'),
      mediaQueryCombiner: await importModule('./media-query-combiner.js'),
      frameworkOptimizer: await importModule('./framework-optimizer.js')
    };
  });

  describe("ErrorHandler Module Tests", () => {
    const { ErrorHandler } = modules.errorHandler || {};

    test("should export ErrorHandler class", () => {
      expect(ErrorHandler).toBeDefined();
      expect(typeof ErrorHandler).toBe('function');
    });

    test("should handle SIZE_ERROR and SECURITY_ERROR", () => {
      if (!ErrorHandler) return;
      
      expect(ErrorHandler.categorizeError({ message: "File too large" })).toBe("SIZE_ERROR");
      expect(ErrorHandler.categorizeError({ message: "Path traversal detected" })).toBe("SECURITY_ERROR");
      expect(ErrorHandler.categorizeError({ message: "Security violation" })).toBe("SECURITY_ERROR");
    });

    test("should determine if error is recoverable", () => {
      if (!ErrorHandler) return;
      
      expect(ErrorHandler.isRecoverable({ code: "ENOENT" })).toBe(true);
      expect(ErrorHandler.isRecoverable({ code: "EACCES" })).toBe(false);
      expect(ErrorHandler.isRecoverable({ code: "ENOSPC" })).toBe(false);
      expect(ErrorHandler.isRecoverable({ message: "503" })).toBe(true);
      expect(ErrorHandler.isRecoverable({ message: "network error" })).toBe(true);
    });

    test("should handle errors with context", () => {
      if (!ErrorHandler) return;
      
      const error = new Error("Test error");
      const result = ErrorHandler.handleError(error, "TestContext");
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('context', 'TestContext');
      expect(result).toHaveProperty('message', 'Test error');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('recoverable');
    });

    test("should retry failed operations", async () => {
      if (!ErrorHandler) return;
      
      let attempts = 0;
      const failTwiceSucceedThrice = async () => {
        attempts++;
        if (attempts <= 2) {
          const error = new Error("Temporary failure");
          error.code = "ENOENT";
          throw error;
        }
        return "success";
      };
      
      const result = await ErrorHandler.withRetry(failTwiceSucceedThrice, 3, 100, "RetryTest");
      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    test("should exhaust retries for non-recoverable errors", async () => {
      if (!ErrorHandler) return;
      
      const alwaysFail = async () => {
        const error = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };
      
      const result = await ErrorHandler.withRetry(alwaysFail, 3, 100, "FailTest");
      expect(result).toHaveProperty('success', false);
      expect(result.context).toBe("FailTest");
    });

    test("should use fallback when primary fails", async () => {
      if (!ErrorHandler) return;
      
      const primaryFn = async () => { throw new Error("Primary failed"); };
      const fallbackFn = async () => "fallback result";
      
      const result = await ErrorHandler.withFallback(primaryFn, fallbackFn, "FallbackTest");
      expect(result).toBe("fallback result");
    });

    test("should handle fallback failure", async () => {
      if (!ErrorHandler) return;
      
      const primaryFn = async () => { throw new Error("Primary failed"); };
      const fallbackFn = async () => { throw new Error("Fallback failed"); };
      
      await expect(ErrorHandler.withFallback(primaryFn, fallbackFn, "FailTest"))
        .rejects.toThrow("Fallback failed");
    });

    test("should validate prerequisites", () => {
      if (!ErrorHandler) return;
      
      const validPrerequisites = [
        { condition: true, message: "Valid condition 1" },
        { condition: true, message: "Valid condition 2" }
      ];
      
      expect(() => ErrorHandler.validatePrerequisites(validPrerequisites, "ValidTest"))
        .not.toThrow();
      
      const invalidPrerequisites = [
        { condition: true, message: "Valid condition" },
        { condition: false, message: "Invalid condition" },
        { condition: false, message: "Another invalid condition" }
      ];
      
      expect(() => ErrorHandler.validatePrerequisites(invalidPrerequisites, "InvalidTest"))
        .toThrow("Prerequisites not met");
    });

    test("should create progress tracker", () => {
      if (!ErrorHandler) return;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const tracker = ErrorHandler.createProgressTracker(3, "ProgressTest");
      
      expect(typeof tracker.step).toBe('function');
      expect(typeof tracker.complete).toBe('function');
      
      tracker.step("Step 1");
      tracker.step("Step 2");
      tracker.step("Step 3");
      tracker.complete("Test completed");
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ProgressTest: Step 1 (1/3 - 33%)")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("✅ ProgressTest: Test completed")
      );
      
      consoleSpy.mockRestore();
    });

    test("should log all error types appropriately", () => {
      if (!ErrorHandler) return;
      
      const consoleSpy = {
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn()
      };
      
      const originalConsole = global.console;
      global.console = consoleSpy;
      
      try {
        // Test each error type
        const errorTypes = [
          { type: "FILE_NOT_FOUND", expectedMethod: "error" },
          { type: "PERMISSION_DENIED", expectedMethod: "error" },
          { type: "DISK_FULL", expectedMethod: "error" },
          { type: "TIMEOUT", expectedMethod: "warn" },
          { type: "SERVICE_UNAVAILABLE", expectedMethod: "warn" },
          { type: "AUTHENTICATION_ERROR", expectedMethod: "error" },
          { type: "NETWORK_ERROR", expectedMethod: "warn" },
          { type: "CSS_PARSE_ERROR", expectedMethod: "error" },
          { type: "SIZE_ERROR", expectedMethod: "error" },
          { type: "SECURITY_ERROR", expectedMethod: "error" }
        ];
        
        errorTypes.forEach(({ type, expectedMethod }) => {
          ErrorHandler.logError({
            success: false,
            context: "Test",
            message: "Test error",
            type,
            timestamp: new Date().toISOString(),
            recoverable: true
          });
          
          expect(consoleSpy[expectedMethod]).toHaveBeenCalled();
        });
        
        // Test default case
        ErrorHandler.logError({
          success: false,
          context: "Test",
          message: "Unknown error",
          type: "UNKNOWN_ERROR",
          timestamp: new Date().toISOString(),
          recoverable: false
        });
        
        expect(consoleSpy.error).toHaveBeenCalled();
        
      } finally {
        global.console = originalConsole;
      }
    });
  });

  describe("SecurityUtils Module Tests", () => {
    const { SecurityUtils } = modules.security || {};

    test("should export SecurityUtils class", () => {
      expect(SecurityUtils).toBeDefined();
      expect(typeof SecurityUtils).toBe('function');
    });

    test("should validate file paths", () => {
      if (!SecurityUtils) return;
      
      // Valid paths
      expect(() => SecurityUtils.validatePath("./test.css")).not.toThrow();
      expect(() => SecurityUtils.validatePath("style.css")).not.toThrow();
      
      // Invalid paths
      expect(() => SecurityUtils.validatePath("")).toThrow("Invalid file path");
      expect(() => SecurityUtils.validatePath(null)).toThrow("Invalid file path");
      expect(() => SecurityUtils.validatePath(undefined)).toThrow("Invalid file path");
      expect(() => SecurityUtils.validatePath(123)).toThrow("Invalid file path");
    });

    test("should prevent path traversal attacks", () => {
      if (!SecurityUtils) return;
      
      expect(() => SecurityUtils.validatePath("../../../etc/passwd")).toThrow("Path traversal detected");
      expect(() => SecurityUtils.validatePath("../secret")).toThrow("Path traversal detected");
      expect(() => SecurityUtils.validatePath("..\\windows\\system32")).toThrow("Path traversal detected");
    });

    test("should detect dangerous patterns", () => {
      if (!SecurityUtils) return;
      
      expect(() => SecurityUtils.validatePath("file<name")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("file>name")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath('file"name')).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("file|name")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("file?name")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("file*name")).toThrow("Dangerous path pattern");
    });

    test("should detect Windows reserved names", () => {
      if (!SecurityUtils) return;
      
      expect(() => SecurityUtils.validatePath("CON")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("PRN")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("AUX")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("NUL")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("COM1")).toThrow("Dangerous path pattern");
      expect(() => SecurityUtils.validatePath("LPT1")).toThrow("Dangerous path pattern");
    });

    test("should sanitize log data", () => {
      if (!SecurityUtils) return;
      
      // Test API key masking
      const logWithApiKey = "Request failed: Bearer gsk_abcdefghijklmnopqrstuvwxyz1234567890";
      const sanitized1 = SecurityUtils.sanitizeLogData(logWithApiKey);
      expect(sanitized1).toContain("Bearer ***");
      expect(sanitized1).not.toContain("gsk_abcdefghijklmnopqrstuvwxyz1234567890");
      
      const logWithApiKey2 = 'API call failed: api_key="sk-1234567890abcdef1234567890abcdef"';
      const sanitized2 = SecurityUtils.sanitizeLogData(logWithApiKey2);
      expect(sanitized2).toContain("api_key=\"***\"");
      
      // Test non-string input
      expect(SecurityUtils.sanitizeLogData(null)).toBeNull();
      expect(SecurityUtils.sanitizeLogData(123)).toBe(123);
    });

    test("should validate CSS content for security", () => {
      if (!SecurityUtils) return;
      
      // Valid CSS
      const validCSS = "body { color: red; margin: 0; }";
      expect(SecurityUtils.validateCSSContent(validCSS)).toBe(true);
      
      // Invalid CSS with dangerous patterns
      expect(() => SecurityUtils.validateCSSContent("a { background: url(javascript:alert(1)); }"))
        .toThrow("Security issues found");
      expect(() => SecurityUtils.validateCSSContent("a { width: expression(alert(1)); }"))
        .toThrow("Security issues found");
      expect(() => SecurityUtils.validateCSSContent("@import url(javascript:alert(1));"))
        .toThrow("Security issues found");
      expect(() => SecurityUtils.validateCSSContent("a { behavior: url(script.htc); }"))
        .toThrow("Security issues found");
      expect(() => SecurityUtils.validateCSSContent("a { -ms-behavior: url(script.htc); }"))
        .toThrow("Security issues found");
      expect(() => SecurityUtils.validateCSSContent("a { binding: url(script.xml); }"))
        .toThrow("Security issues found");
      
      // Empty or invalid content
      expect(() => SecurityUtils.validateCSSContent(null)).toThrow("Invalid CSS content");
      expect(() => SecurityUtils.validateCSSContent(123)).toThrow("Invalid CSS content");
      
      // Content too large
      const largeCSS = "a { color: red; }".repeat(1000000);
      expect(() => SecurityUtils.validateCSSContent(largeCSS)).toThrow("CSS content too large");
    });

    test("should validate numeric values", () => {
      if (!SecurityUtils) return;
      
      expect(SecurityUtils.validateNumber("10")).toBe(10);
      expect(SecurityUtils.validateNumber("5.5")).toBe(5);
      expect(SecurityUtils.validateNumber("invalid")).toBe(0);
      expect(SecurityUtils.validateNumber("15", 5, 10)).toBe(10);
      expect(SecurityUtils.validateNumber("3", 5, 10)).toBe(5);
      expect(SecurityUtils.validateNumber("8", 5, 10)).toBe(8);
    });

    test("should validate float values", () => {
      if (!SecurityUtils) return;
      
      expect(SecurityUtils.validateFloat("10.5")).toBe(10.5);
      expect(SecurityUtils.validateFloat("5")).toBe(5.0);
      expect(SecurityUtils.validateFloat("invalid")).toBe(0);
      expect(SecurityUtils.validateFloat("15.5", 5.0, 10.0)).toBe(10.0);
      expect(SecurityUtils.validateFloat("3.5", 5.0, 10.0)).toBe(5.0);
      expect(SecurityUtils.validateFloat("7.5", 5.0, 10.0)).toBe(7.5);
    });

    test("should validate boolean values", () => {
      if (!SecurityUtils) return;
      
      expect(SecurityUtils.validateBoolean(true)).toBe(true);
      expect(SecurityUtils.validateBoolean(false)).toBe(false);
      expect(SecurityUtils.validateBoolean("true")).toBe(true);
      expect(SecurityUtils.validateBoolean("false")).toBe(false);
      expect(SecurityUtils.validateBoolean("TRUE")).toBe(true);
      expect(SecurityUtils.validateBoolean("FALSE")).toBe(false);
      expect(SecurityUtils.validateBoolean("1")).toBe(true);
      expect(SecurityUtils.validateBoolean("")).toBe(false);
      expect(SecurityUtils.validateBoolean(null)).toBe(false);
      expect(SecurityUtils.validateBoolean(undefined, true)).toBe(true);
    });

    test("should create safe hashes", () => {
      if (!SecurityUtils) return;
      
      const data = "test data";
      const hash = SecurityUtils.createHash(data);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(16);
      
      // Same input should produce same hash
      const hash2 = SecurityUtils.createHash(data);
      expect(hash).toBe(hash2);
      
      // Different input should produce different hash
      const hash3 = SecurityUtils.createHash("different data");
      expect(hash).not.toBe(hash3);
    });

    test("should validate regex patterns", () => {
      if (!SecurityUtils) return;
      
      // Valid regex patterns
      expect(SecurityUtils.validateRegex("test")).toBeDefined();
      expect(SecurityUtils.validateRegex(/test/)).toBeDefined();
      expect(SecurityUtils.validateRegex("^start.*end$")).toBeDefined();
      
      // Invalid patterns
      expect(() => SecurityUtils.validateRegex(null)).toThrow("Invalid regex pattern");
      expect(() => SecurityUtils.validateRegex(123)).toThrow("Invalid regex pattern");
      expect(() => SecurityUtils.validateRegex("")).toThrow("Invalid regex pattern");
      
      // Dangerous patterns (catastrophic backtracking)
      expect(() => SecurityUtils.validateRegex("(.+)+")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("(.+)*")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("(.+)?")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("(a+)+")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("(a+)*")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("(a+)?")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("\\(.+\\)+")).toThrow("Potentially dangerous regex");
      expect(() => SecurityUtils.validateRegex("\\(.+\\)*")).toThrow("Potentially dangerous regex");
    });

    test("should detect regex timeout (ReDoS)", () => {
      if (!SecurityUtils) return;
      
      // This test simulates a regex that would cause catastrophic backtracking
      const dangerousRegex = /^(a+)+$/;
      
      // Should throw during timeout testing
      expect(() => SecurityUtils.validateRegex(dangerousRegex, 100))
        .toThrow("Potentially dangerous regex");
    });

    test("should hash data properly", () => {
      if (!SecurityUtils) return;
      
      const data = "test data";
      const hash1 = SecurityUtils.hash ? SecurityUtils.hash(data) : SecurityUtils.createHash(data);
      const hash2 = SecurityUtils.hash ? SecurityUtils.hash(data) : SecurityUtils.createHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]+$/); // SHA256 hash
    });
  });

  describe("Media Query Combiner Module Tests", () => {
    const { combineDuplicateMediaQueries } = modules.mediaQueryCombiner || {};

    test("should export combineDuplicateMediaQueries function", () => {
      expect(combineDuplicateMediaQueries).toBeDefined();
      expect(typeof combineDuplicateMediaQueries).toBe('function');
    });

    test("should combine duplicate media queries", () => {
      if (!combineDuplicateMediaQueries) return;
      
      const css = `
        @media (max-width: 768px) {
          .a { color: red; }
        }
        
        .b { margin: 0; }
        
        @media (max-width: 768px) {
          .c { font-size: 14px; }
        }
      `;
      
      const result = combineDuplicateMediaQueries(css);
      
      // Should combine the two identical media queries
      expect(result).toMatch(/@media \(max-width: 768px\) \{[\s\S]*\.a \{ color: red; \}[\s\S]*\.c \{ font-size: 14px; \}[\s\S]*\}/);
    });

    test("should handle nested media queries", () => {
      if (!combineDuplicateMediaQueries) return;
      
      const css = `
        @media (max-width: 768px) {
          .a { color: red; }
          @media (orientation: portrait) {
            .b { font-size: 12px; }
          }
        }
        
        @media (max-width: 768px) {
          .c { margin: 0; }
          @media (orientation: portrait) {
            .d { padding: 5px; }
          }
        }
      `;
      
      const result = combineDuplicateMediaQueries(css);
      
      // Should still combine the outer media queries while preserving nested ones
      expect(result).toContain('.a { color: red; }');
      expect(result).toContain('.c { margin: 0; }');
    });

    test("should handle malformed media queries gracefully", () => {
      if (!combineDuplicateMediaQueries) return;
      
      const css = `
        @media (max-width: 768px) {
          .a { color: red; }
        }
        
        @media {
          .b { margin: 0; }
        }
        
        @media (max-width: 768px) {
          .c { font-size: 14px; }
        }
      `;
      
      const result = combineDuplicateMediaQueries(css);
      
      // Should handle gracefully and not crash
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test("should return original CSS if no media queries found", () => {
      if (!combineDuplicateMediaQueries) return;
      
      const css = `
        .a { color: red; }
        .b { margin: 0; }
        .c { font-size: 14px; }
      `;
      
      const result = combineDuplicateMediaQueries(css);
      expect(result).toBe(css);
    });

    test("should handle empty CSS", () => {
      if (!combineDuplicateMediaQueries) return;
      
      expect(combineDuplicateMediaQueries('')).toBe('');
      expect(combineDuplicateMediaQueries(null)).toBe(null);
      expect(combineDuplicateMediaQueries(undefined)).toBe(undefined);
    });
  });

  describe("FileHandler Module Tests", () => {
    const { FileHandler } = modules.fileHandler || {};

    test("should export FileHandler class", () => {
      expect(FileHandler).toBeDefined();
      expect(typeof FileHandler).toBe('function');
    });

    test("should create FileHandler with default options", () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      expect(handler.options).toBeDefined();
      expect(handler.options.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(handler.options.allowedExtensions).toEqual(['.css']);
    });

    test("should create FileHandler with custom options", () => {
      if (!FileHandler) return;
      
      const customOptions = {
        maxFileSize: 5 * 1024 * 1024,
        allowedExtensions: ['.css', '.scss']
      };
      
      const handler = new FileHandler(customOptions);
      expect(handler.options.maxFileSize).toBe(5 * 1024 * 1024);
      expect(handler.options.allowedExtensions).toEqual(['.css', '.scss']);
    });

    test("should detect glob patterns", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      expect(handler.isGlobPattern('*.css')).toBe(true);
      expect(handler.isGlobPattern('src/**/*.css')).toBe(true);
      expect(handler.isGlobPattern('file?.css')).toBe(true);
      expect(handler.isGlobPattern('file[0-9].css')).toBe(true);
      expect(handler.isGlobPattern('style.css')).toBe(false);
      expect(handler.isGlobPattern('')).toBe(false);
    });

    test("should resolve glob patterns", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Create test files
      const testFiles = ['test1.css', 'test2.css', 'test3.txt'];
      testFiles.forEach(file => {
        fs.writeFileSync(file, `/* ${file} */`);
      });
      
      try {
        const files = await handler.resolveGlobPattern('test*.css');
        expect(files.length).toBe(2);
        files.forEach(file => {
          expect(path.basename(file)).toMatch(/test[12]\.css/);
        });
      } finally {
        // Clean up
        testFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should reject dangerous glob patterns", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      await expect(handler.resolveGlobPattern('../**/*.css')).rejects.toThrow("Dangerous path pattern");
      await expect(handler.resolveGlobPattern('~/**/*.css')).rejects.toThrow("Dangerous path pattern");
    });

    test("should discover CSS files in directory", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Create test directory and files
      const testDir = 'test-css-dir';
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
      }
      
      const testFiles = ['file1.css', 'file2.css', 'file3.txt'];
      testFiles.forEach(file => {
        fs.writeFileSync(path.join(testDir, file), `/* ${file} */`);
      });
      
      try {
        const files = await handler.discoverCSSFiles(testDir);
        expect(files.length).toBe(2);
        files.forEach(file => {
          expect(file).toContain('.css');
        });
      } finally {
        // Clean up
        testFiles.forEach(file => {
          const filePath = path.join(testDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
        if (fs.existsSync(testDir)) {
          fs.rmdirSync(testDir);
        }
      }
    });

    test("should validate files properly", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler({ maxFileSize: 100 });
      
      // Create test files
      const validFile = 'valid.css';
      const largeFile = 'large.css';
      const wrongExtFile = 'wrong.txt';
      const readOnlyFile = 'readonly.css';
      
      fs.writeFileSync(validFile, 'body { color: red; }');
      fs.writeFileSync(largeFile, 'a { color: red; }'.repeat(1000));
      fs.writeFileSync(wrongExtFile, 'not css');
      fs.writeFileSync(readOnlyFile, 'body { color: blue; }');
      
      // Make file read-only (if not on Windows)
      if (process.platform !== 'win32') {
        fs.chmodSync(readOnlyFile, 0o444);
      }
      
      try {
        const files = await handler.validateFiles([validFile, largeFile, wrongExtFile, readOnlyFile, 'nonexistent.css']);
        
        // Should only include the valid file
        expect(files.length).toBe(1);
        expect(files[0]).toContain('valid.css');
      } finally {
        // Clean up
        [validFile, largeFile, wrongExtFile].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
        
        if (fs.existsSync(readOnlyFile)) {
          if (process.platform !== 'win32') {
            fs.chmodSync(readOnlyFile, 0o644);
          }
          fs.unlinkSync(readOnlyFile);
        }
      }
    });

    test("should generate output paths correctly", () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Default behavior
      expect(handler.generateOutputPath('/path/to/style.css')).toBe('/path/to/style.optimized.css');
      
      // With suffix
      expect(handler.generateOutputPath('/path/to/style.css', { suffix: '.min' }))
        .toBe('/path/to/style.min.css');
      
      // With output directory
      expect(handler.generateOutputPath('/path/to/style.css', { outputDir: '/output' }))
        .toBe('/output/style.css');
    });

    test("should create backup files", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      const testFile = 'backup-test.css';
      const content = 'body { color: red; }';
      fs.writeFileSync(testFile, content);
      
      try {
        const backupPath = await handler.createBackup(testFile);
        
        expect(backupPath).toContain('backup-test.backup.css');
        expect(fs.existsSync(backupPath)).toBe(true);
        expect(fs.readFileSync(backupPath, 'utf8')).toBe(content);
      } finally {
        // Clean up
        [testFile, 'backup-test.backup.css'].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should handle backup creation errors", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      await expect(handler.createBackup('nonexistent.css'))
        .rejects.toThrow("Failed to create backup");
    });

    test("should get file information", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      const testFile = 'info-test.css';
      const content = 'body { color: red; }\n.test { margin: 0; }';
      fs.writeFileSync(testFile, content);
      
      try {
        const info = await handler.getFileInfo(testFile);
        
        expect(info.exists).toBe(true);
        expect(info.size).toBe(content.length);
        expect(info.extension).toBe('.css');
        expect(info.path).toContain('info-test.css');
        expect(info.lines).toBe(2);
        expect(info.readable).toBe(true);
        expect(info.encoding).toBe('utf8');
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test("should handle file information errors", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      const info = await handler.getFileInfo('nonexistent.css');
      
      expect(info.exists).toBe(false);
      expect(info.size).toBe(0);
      expect(info.readable).toBe(false);
      expect(info.error).toBeDefined();
    });

    test("should get batch file information", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      const testFiles = ['batch1.css', 'batch2.css'];
      testFiles.forEach(file => {
        fs.writeFileSync(file, `/* ${file} */`);
      });
      
      try {
        const info = await handler.getBatchFileInfo(testFiles);
        
        expect(info.length).toBe(2);
        info.forEach((fileInfo, index) => {
          expect(fileInfo.exists).toBe(true);
          expect(fileInfo.path).toContain(testFiles[index]);
        });
      } finally {
        testFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should clean up files", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      const testFile = 'cleanup-test.css';
      fs.writeFileSync(testFile, 'test');
      
      await handler.cleanup([testFile, 'nonexistent.css']);
      
      expect(fs.existsSync(testFile)).toBe(false);
    });

    test("should validate file extensions", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      expect(handler.isValidExtension('style.css')).toBe(true);
      expect(handler.isValidExtension('style.scss')).toBe(false);
      expect(handler.isValidExtension('style.txt')).toBe(false);
      expect(handler.isValidExtension('')).toBe(false);
      expect(handler.isValidExtension(null)).toBe(false);
    });

    test("should validate file sizes", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler({ maxFileSize: 1000 });
      
      expect(handler.isValidFileSize(500)).toBe(true);
      expect(handler.isValidFileSize(1000)).toBe(true);
      expect(handler.isValidFileSize(1001)).toBe(false);
      expect(handler.isValidFileSize(0)).toBe(false);
      expect(handler.isValidFileSize(-1)).toBe(false);
    });

    test("should resolve single input file", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Create a temporary test file
      const testFile = 'temp-test.css';
      fs.writeFileSync(testFile, 'body { color: red; }');
      
      try {
        const files = await handler.resolveSingleInput(testFile);
        expect(files).toContain(testFile);
      } finally {
        // Clean up
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test("should resolve multiple input files", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Create temporary test files
      const testFiles = ['temp1.css', 'temp2.css'];
      testFiles.forEach(file => {
        fs.writeFileSync(file, `/* ${file} */ body { color: red; }`);
      });
      
      try {
        const files = await handler.resolveFiles(testFiles);
        expect(files.length).toBe(2);
        testFiles.forEach(file => {
          expect(files).toContain(expect.stringContaining(file));
        });
      } finally {
        // Clean up
        testFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should filter files by patterns", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler({
        includePatterns: ['**/*.css'],
        excludePatterns: ['**/*.backup.css']
      });
      
      // Create test files
      const testFiles = ['test.css', 'test.backup.css', 'test.txt'];
      testFiles.forEach(file => {
        fs.writeFileSync(file, `/* ${file} */`);
      });
      
      try {
        const files = await handler.resolveFiles(['*']);
        const fileNames = files.map(f => path.basename(f));
        
        expect(fileNames).toContain('test.css');
        expect(fileNames).not.toContain('test.backup.css');
        expect(fileNames).not.toContain('test.txt');
      } finally {
        // Clean up
        testFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should handle file reading errors gracefully", async () => {
      if (!FileHandler) return;
      
      const handler = new FileHandler();
      
      // Try to resolve a non-existent file
      const files = await handler.resolveSingleInput('non-existent.css');
      expect(files).toEqual([]);
    });
  });

  describe("FrameworkOptimizer Module Tests", () => {
    const { FrameworkOptimizer } = modules.frameworkOptimizer || {};

    test("should export FrameworkOptimizer class", () => {
      expect(FrameworkOptimizer).toBeDefined();
      expect(typeof FrameworkOptimizer).toBe('function');
    });

    test("should create FrameworkOptimizer with default options", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      expect(optimizer.options.framework).toBe('auto');
      expect(optimizer.options.preserveCritical).toBe(true);
      expect(optimizer.options.optimizeForProduction).toBe(true);
    });

    test("should create FrameworkOptimizer with custom options", () => {
      if (!FrameworkOptimizer) return;
      
      const customOptions = {
        framework: 'react',
        preserveCritical: false,
        optimizeForProduction: false
      };
      
      const optimizer = new FrameworkOptimizer(customOptions);
      expect(optimizer.options.framework).toBe('react');
      expect(optimizer.options.preserveCritical).toBe(false);
      expect(optimizer.options.optimizeForProduction).toBe(false);
    });

    test("should detect React framework", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      // Create test files that would indicate React
      const testFiles = ['App.jsx', 'Component.tsx', 'index.js'];
      expect(optimizer.detectFramework(testFiles)).toBe('react');
    });

    test("should detect Vue framework", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const testFiles = ['App.vue', 'Component.vue', 'main.js'];
      expect(optimizer.detectFramework(testFiles)).toBe('vue');
    });

    test("should detect Angular framework", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const testFiles = ['app.component.ts', 'app.component.html', 'app.module.ts'];
      expect(optimizer.detectFramework(testFiles)).toBe('angular');
    });

    test("should detect Tailwind framework", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const testFiles = ['tailwind.config.js', 'index.html'];
      expect(optimizer.detectFramework(testFiles)).toBe('tailwind');
    });

    test("should optimize React CSS", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer({ framework: 'react' });
      
      const css = `
        .App { 
          text-align: center; 
        }
        
        .App-header { 
          background-color: #282c34; 
          padding: 20px; 
        }
      `;
      
      const optimized = await optimizer.optimizeForFramework(css, ['App.jsx']);
      
      expect(optimized).toBeDefined();
      expect(typeof optimized).toBe('string');
      expect(optimized.length).toBeGreaterThan(0);
    });

    test("should detect framework from package.json", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      // Create temporary package.json files for different frameworks
      const testCases = [
        { dependencies: { react: "^18.0.0" }, expected: "react" },
        { dependencies: { vue: "^3.0.0" }, expected: "vue" },
        { dependencies: { "@angular/core": "^15.0.0" }, expected: "angular" },
        { dependencies: { tailwindcss: "^3.0.0" }, expected: "tailwind" },
        { dependencies: { "some-other-lib": "^1.0.0" }, expected: "unknown" }
      ];
      
      for (const { dependencies, expected } of testCases) {
        const packageJson = { name: "test", ...dependencies };
        const packagePath = 'package.json';
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        
        try {
          const detected = await optimizer.detectFramework('.');
          expect(detected).toBe(expected);
        } finally {
          if (fs.existsSync(packagePath)) {
            fs.unlinkSync(packagePath);
          }
        }
      }
    });

    test("should detect framework from tailwind config", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const packageJson = { name: "test" };
      const packagePath = 'package.json';
      const tailwindConfigPath = 'tailwind.config.js';
      
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      fs.writeFileSync(tailwindConfigPath, 'module.exports = {};');
      
      try {
        const detected = await optimizer.detectFramework('.');
        expect(detected).toBe('tailwind');
      } finally {
        if (fs.existsSync(packagePath)) {
          fs.unlinkSync(packagePath);
        }
        if (fs.existsSync(tailwindConfigPath)) {
          fs.unlinkSync(tailwindConfigPath);
        }
      }
    });

    test("should return unknown for no package.json", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      // Test with non-existent package.json
      const detected = await optimizer.detectFramework('/nonexistent/path');
      expect(detected).toBe('unknown');
    });

    test("should get framework patterns", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      // Test specific framework patterns
      const reactPatterns = optimizer.getFrameworkPatterns('react');
      expect(reactPatterns).toContain('**/*.jsx');
      expect(reactPatterns).toContain('**/*.tsx');
      
      const vuePatterns = optimizer.getFrameworkPatterns('vue');
      expect(vuePatterns).toContain('**/*.vue');
      
      // Test auto patterns (should return all patterns)
      const autoPatterns = optimizer.getFrameworkPatterns('auto');
      expect(autoPatterns.length).toBeGreaterThan(0);
      
      // Test unknown framework
      const unknownPatterns = optimizer.getFrameworkPatterns('unknown');
      expect(unknownPatterns).toEqual([]);
    });

    test("should extract CSS usage from framework files", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      // Create test files for React
      const reactFile = 'test.jsx';
      const reactContent = `
        import styles from './styles.module.css';
        const Component = () => (
          <div className={styles.container}>
            <button className="btn btn-primary">Click</button>
            <span style={{color: 'red'}}>Text</span>
          </div>
        );
      `;
      
      fs.writeFileSync(reactFile, reactContent);
      
      try {
        const usage = await optimizer.extractCSSUsage('react', '.');
        
        expect(usage.classes.has('container')).toBe(true);
        expect(usage.classes.has('btn')).toBe(true);
        expect(usage.classes.has('btn-primary')).toBe(true);
        expect(usage.selectors.has('color: red')).toBe(true);
      } finally {
        if (fs.existsSync(reactFile)) {
          fs.unlinkSync(reactFile);
        }
      }
    });

    test("should parse React files for CSS usage", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const reactContent = `
        import styles from './styles.module.css';
        import otherStyles from './other.module.css';
        const Button = styled.button\`
          background: blue;
          padding: 10px;
        \`;
        const App = () => (
          <div className={styles.container} className="main-class">
            <span style={{backgroundColor: 'white', margin: '5px'}}>Content</span>
          </div>
        );
      `;
      
      const usage = optimizer.parseFileForCSSUsage(reactContent, '.jsx', 'react');
      
      expect(usage.classes.has('container')).toBe(true);
      expect(usage.classes.has('main-class')).toBe(true);
      expect(usage.selectors.has('background: blue')).toBe(true);
      expect(usage.selectors.has('padding: 10px')).toBe(true);
      expect(usage.selectors.has('backgroundColor: white')).toBe(true);
      expect(usage.selectors.has('margin: 5px')).toBe(true);
    });

    test("should parse Vue files for CSS usage", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const vueContent = `
        <template>
          <div class="container" :class="{'active': isActive}">
            <span class="text-bold">{{ message }}</span>
          </div>
        </template>
        
        <script>
        export default {
          data() {
            return {
              isActive: true,
              message: 'Hello'
            }
          }
        }
        </script>
        
        <style scoped>
        .container { color: red; }
        </style>
      `;
      
      const usage = optimizer.parseFileForCSSUsage(vueContent, '.vue', 'vue');
      
      expect(usage.classes.has('container')).toBe(true);
      expect(usage.classes.has('active')).toBe(true);
      expect(usage.classes.has('text-bold')).toBe(true);
    });

    test("should parse Angular files for CSS usage", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const angularContent = `
        import { Component } from '@angular/core';
        
        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          isActive = true;
        }
      `;
      
      const usage = optimizer.parseFileForCSSUsage(angularContent, '.ts', 'angular');
      
      expect(usage.components.has('app-root')).toBe(true);
    });

    test("should parse Tailwind files for CSS usage", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const tailwindContent = `
        <div class="flex items-center justify-between p-4 bg-blue-500">
          <button class="px-4 py-2 bg-white text-blue-500 rounded-md">
            Click me
          </button>
        </div>
        <div class="@apply flex items-center">
          <span class="text-sm text-gray-600">Description</span>
        </div>
      `;
      
      const usage = optimizer.parseFileForCSSUsage(tailwindContent, '.html', 'tailwind');
      
      expect(usage.utilities.has('flex')).toBe(true);
      expect(usage.utilities.has('items-center')).toBe(true);
      expect(usage.utilities.has('justify-between')).toBe(true);
      expect(usage.utilities.has('p-4')).toBe(true);
      expect(usage.utilities.has('bg-blue-500')).toBe(true);
      expect(usage.utilities.has('px-4')).toBe(true);
      expect(usage.utilities.has('py-2')).toBe(true);
      expect(usage.utilities.has('bg-white')).toBe(true);
      expect(usage.utilities.has('text-blue-500')).toBe(true);
      expect(usage.utilities.has('rounded-md')).toBe(true);
      expect(usage.utilities.has('text-sm')).toBe(true);
      expect(usage.utilities.has('text-gray-600')).toBe(true);
    });

    test("should extract classes from CSS content", () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      const usage = {
        classes: new Set(),
        ids: new Set(),
        selectors: new Set(),
        components: new Set(),
        utilities: new Set(),
      };
      
      const cssContent = `
        .container { display: flex; }
        #main { color: blue; }
        .button { padding: 10px; }
        .button:hover { background: red; }
      `;
      
      optimizer.extractClassesFromCSS(cssContent, usage);
      
      expect(usage.classes.has('container')).toBe(true);
      expect(usage.classes.has('button')).toBe(true);
      expect(usage.ids.has('main')).toBe(true);
    });

    test("should extract critical CSS", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer();
      
      const css = `
        .above-fold { color: red; }
        .below-fold { color: blue; }
        .lazy-loaded { color: green; }
      `;
      
      const critical = await optimizer.extractCriticalCSS(css);
      
      expect(critical).toBeDefined();
      expect(typeof critical).toBe('string');
    });

    test("should remove unused CSS", async () => {
      if (!FrameworkOptimizer) return;
      
      const optimizer = new FrameworkOptimizer({ framework: 'react' });
      
      const css = `
        .used-class { color: red; }
        .unused-class { color: blue; }
      `;
      
      const jsFiles = ['App.jsx'];
      
      // Mock file reading
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn((filePath) => {
        if (filePath.includes('App.jsx')) {
          return 'const App = () => <div className="used-class">Hello</div>;';
        }
        return '';
      });
      
      try {
        const optimized = await optimizer.removeUnusedCSS(css, jsFiles);
        expect(optimized).toBeDefined();
        expect(typeof optimized).toBe('string');
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
    });
  });

  describe("CSS Optimizer Main Module Tests", () => {
    const { optimizeCss, formatTime, calculateSavings } = modules.cssOptimizer || {};

    test("should export main functions", () => {
      expect(optimizeCss).toBeDefined();
      expect(typeof optimizeCss).toBe('function');
      
      if (formatTime) {
        expect(typeof formatTime).toBe('function');
      }
      
      if (calculateSavings) {
        expect(typeof calculateSavings).toBe('function');
      }
    });

    test("should format time correctly", () => {
      if (!formatTime) return;
      
      expect(formatTime(1000)).toBe('1.00s');
      expect(formatTime(500)).toBe('500.00ms');
      expect(formatTime(0.5)).toBe('0.50ms');
    });

    test("should calculate savings correctly", () => {
      if (!calculateSavings) return;
      
      const savings = calculateSavings(1000, 800);
      expect(savings.originalSize).toBe(1000);
      expect(savings.optimizedSize).toBe(800);
      expect(savings.bytesSaved).toBe(200);
      expect(savings.percentageSaved).toBe(20);
    });

    test("should optimize basic CSS", async () => {
      if (!optimizeCss) return;
      
      // Create a test CSS file
      const testFile = 'test-basic.css';
      const outputFile = 'test-basic.optimized.css';
      const css = 'body { color: red; margin: 0; }';
      
      fs.writeFileSync(testFile, css);
      
      try {
        const result = await optimizeCss(testFile, outputFile);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
        expect(fs.existsSync(outputFile)).toBe(true);
        
        const optimizedContent = fs.readFileSync(outputFile, 'utf8');
        expect(optimizedContent.length).toBeGreaterThan(0);
      } finally {
        // Clean up
        [testFile, outputFile, 'test-basic.backup.css'].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should handle optimization errors gracefully", async () => {
      if (!optimizeCss) return;
      
      // Try to optimize a non-existent file
      const result = await optimizeCss('non-existent.css', 'output.css');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should process CSS with PostCSS plugins", async () => {
      if (!optimizeCss) return;
      
      const testFile = 'test-postcss.css';
      const outputFile = 'test-postcss.optimized.css';
      const css = 'body { display: flex; color: red; }';
      
      fs.writeFileSync(testFile, css);
      
      try {
        const result = await optimizeCss(testFile, outputFile, {
          enableAutoprefixer: true,
          enableMinification: false
        });
        
        expect(result.success).toBe(true);
        
        const optimizedContent = fs.readFileSync(outputFile, 'utf8');
        // Should have autoprefixer applied
        expect(optimizedContent).toContain('-webkit-box');
      } finally {
        // Clean up
        [testFile, outputFile, 'test-postcss.backup.css'].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });
  });

  describe("Integration Tests", () => {
    test("should handle complete workflow", async () => {
      const { optimizeCss } = modules.cssOptimizer || {};
      
      if (!optimizeCss) return;
      
      const testFile = 'integration-test.css';
      const outputFile = 'integration-test.optimized.css';
      const css = `
        @media (max-width: 768px) {
          .a { color: red; }
        }
        
        @media (max-width: 768px) {
          .b { color: blue; }
        }
        
        .c { margin: 0; padding: 0; }
      `;
      
      fs.writeFileSync(testFile, css);
      
      try {
        const result = await optimizeCss(testFile, outputFile, {
          enableAutoprefixer: true,
          enableMinification: true,
          enableMediaQueryCombining: true
        });
        
        expect(result.success).toBe(true);
        expect(fs.existsSync(outputFile)).toBe(true);
        
        const optimizedContent = fs.readFileSync(outputFile, 'utf8');
        expect(optimizedContent.length).toBeLessThan(css.length); // Should be smaller due to minification
        
      } finally {
        // Clean up
        [testFile, outputFile, 'integration-test.backup.css'].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });

    test("should handle large CSS files", async () => {
      const { optimizeCss } = modules.cssOptimizer || {};
      
      if (!optimizeCss) return;
      
      const testFile = 'large-test.css';
      const outputFile = 'large-test.optimized.css';
      
      // Generate a large CSS file
      let css = '';
      for (let i = 0; i < 1000; i++) {
        css += `.class-${i} { color: ${i % 2 === 0 ? 'red' : 'blue'}; margin: ${i}px; }\n`;
      }
      
      fs.writeFileSync(testFile, css);
      
      try {
        const startTime = Date.now();
        const result = await optimizeCss(testFile, outputFile);
        const endTime = Date.now();
        
        expect(result.success).toBe(true);
        expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
        
      } finally {
        // Clean up
        [testFile, outputFile, 'large-test.backup.css'].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    const { ErrorHandler } = modules.errorHandler || {};
    const { SecurityUtils } = modules.security || {};

    test("should handle null/undefined inputs gracefully", () => {
      if (!ErrorHandler) return;
      
      expect(() => ErrorHandler.handleError(null)).not.toThrow();
      expect(() => ErrorHandler.handleError(undefined)).not.toThrow();
      expect(() => ErrorHandler.categorizeError(null)).not.toThrow();
      expect(() => ErrorHandler.categorizeError(undefined)).not.toThrow();
    });

    test("should handle malicious input patterns", () => {
      if (!SecurityUtils) return;
      
      const maliciousPatterns = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'CON',
        'PRN',
        'file<script>alert(1)</script>',
        'file|rm -rf /',
        'file&&cat /etc/passwd'
      ];
      
      maliciousPatterns.forEach(pattern => {
        expect(() => SecurityUtils.validatePath(pattern)).toThrow();
      });
    });

    test("should handle empty and malformed CSS", async () => {
      const { optimizeCss } = modules.cssOptimizer || {};
      
      if (!optimizeCss) return;
      
      const testCases = [
        '',
        '   ',
        '/* empty comment */',
        'invalid css {',
        '@invalid rule',
        '.class { color: ',
        'body { color: red; ',
        '@media { .test { color: red; }'
      ];
      
      testCases.forEach(async (css, index) => {
        const testFile = `malformed-${index}.css`;
        const outputFile = `malformed-${index}.optimized.css`;
        
        fs.writeFileSync(testFile, css);
        
        try {
          const result = await optimizeCss(testFile, outputFile);
          
          // Should handle gracefully - either succeed or fail with proper error
          expect(result).toBeDefined();
          if (result.success === false) {
            expect(result.error).toBeDefined();
          }
        } finally {
          // Clean up
          [testFile, outputFile, `${testFile}.backup`].forEach(file => {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
            }
          });
        }
      });
    });
  });
});