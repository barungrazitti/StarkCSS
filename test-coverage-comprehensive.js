// test-coverage-comprehensive.js - Full coverage test with proper imports
// Uses dynamic imports to work with ES modules

describe("CSS Optimizer Comprehensive Coverage Tests", () => {
  let optimizer, errorHandler, security, fileHandler;

  beforeAll(async () => {
    // Load all modules dynamically
    optimizer = await import('./css-optimizer.js');
    errorHandler = await import('./error-handler.js');
    security = await import('./security.js');
    fileHandler = await import('./file-handler.js');
  });

  describe("Main Optimizer Module", () => {
    test("should export optimizeCss function", () => {
      expect(optimizer.optimizeCss).toBeDefined();
      expect(typeof optimizer.optimizeCss).toBe('function');
    });

    test("should have configuration object", () => {
      expect(optimizer.CONFIG).toBeDefined();
      expect(typeof optimizer.CONFIG).toBe('object');
    });

    test("should handle CSS processing", async () => {
      const mockCSS = "body { color: red; }";
      const result = await optimizer.optimizeCss(mockCSS, {
        output: 'test-output.css',
        aiFixes: false,
        autoprefixer: false,
        minification: false
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Error Handler Module", () => {
    test("should export ErrorHandler class", () => {
      expect(errorHandler.ErrorHandler).toBeDefined();
      expect(typeof errorHandler.ErrorHandler).toBe('function');
    });

    test("should create error handler instance", () => {
      const errorInstance = new errorHandler.ErrorHandler();
      expect(errorInstance).toBeDefined();
      expect(typeof errorInstance.handle).toBe('function');
    });

    test("should handle errors properly", () => {
      const errorInstance = new errorHandler.ErrorHandler();
      const result = errorInstance.handle(new Error('Test error'));
      expect(result).toBeDefined();
      expect(result.message).toBe('Test error');
    });
  });

  describe("Security Module", () => {
    test("should export SecurityUtils class", () => {
      expect(security.SecurityUtils).toBeDefined();
      expect(typeof security.SecurityUtils).toBe('function');
    });

    test("should validate CSS content", () => {
      const securityInstance = new security.SecurityUtils();
      const result = securityInstance.validateCSS("body { color: red; }");
      expect(result.isValid).toBe(true);
    });

    test("should detect malicious content", () => {
      const securityInstance = new security.SecurityUtils();
      const result = securityInstance.validateCSS("body { color: red; javascript:alert('xss'); }");
      expect(result.isValid).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
    });
  });

  describe("File Handler Module", () => {
    test("should export FileHandler class", () => {
      expect(fileHandler.FileHandler).toBeDefined();
      expect(typeof fileHandler.FileHandler).toBe('function');
    });

    test("should create file handler instance", () => {
      const fileInstance = new fileHandler.FileHandler();
      expect(fileInstance).toBeDefined();
      expect(typeof fileInstance.readFile).toBe('function');
    });

    test("should handle file operations", () => {
      const fileInstance = new fileHandler.FileHandler();
      expect(fileInstance.readFile).toBeDefined();
      expect(fileInstance.writeFile).toBeDefined();
      expect(fileInstance.exists).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    test("should process complete optimization workflow", async () => {
      const mockCSS = `
        .test {
          color: red;
          background: blue;
          margin: 10px;
          padding: 5px;
        }
      `;

      const result = await optimizer.optimizeCss(mockCSS, {
        output: 'integration-test.css',
        aiFixes: false,
        autoprefixer: true,
        minification: false
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processedCSS).toBeDefined();
      expect(result.processedCSS.length).toBeGreaterThan(0);
    });

    test("should handle errors gracefully", async () => {
      const result = await optimizer.optimizeCss(null, {
        output: 'error-test.css'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Performance Tests", () => {
    test("should handle large CSS files efficiently", async () => {
      const largeCSS = Array(1000).fill('.class{color:red;}').join('\n');
      const startTime = Date.now();
      
      const result = await optimizer.optimizeCss(largeCSS, {
        output: 'performance-test.css',
        aiFixes: false,
        autoprefixer: false,
        minification: false
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});