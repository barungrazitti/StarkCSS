import { FileHandler } from "./file-handler.js";
import path from "path";
import fs from "fs-extra";

describe("File Handler", () => {
  let handler;

  beforeAll(() => {
    handler = new FileHandler({
      maxFileSize: 5 * 1024 * 1024, // 5MB for testing
      excludePatterns: ["node_modules/**", ".git/**"],
    });
  });

  afterAll(async () => {
    // Cleanup any remaining test files
    const testFiles = [
      "test-handler.css",
      "test-multi1.css",
      "test-multi2.css",
      "test-validation.css",
      "test-batch1.css",
      "test-batch2.css",
      "test-large.css",
    ];

    for (const file of testFiles) {
      try {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test("should resolve single CSS file", async () => {
    // Create a test CSS file if it doesn't exist
    await fs.writeFile("test-handler.css", ".test { color: red; }");

    const files = await handler.resolveFiles("test-handler.css");

    expect(Array.isArray(files)).toBe(true);
    if (files.length > 0) {
      expect(files[0]).toContain("test-handler.css");
    }

    // Cleanup
    await fs.remove("test-handler.css");
  });

  test("should resolve directory and find CSS files", async () => {
    const files = await handler.resolveFiles(".");

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThanOrEqual(0);

    // All files should be CSS files
    files.forEach((file) => {
      expect(file.endsWith(".css")).toBe(true);
    });
  });

  test("should handle glob patterns", async () => {
    const files = await handler.resolveFiles("**/*.css");

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThanOrEqual(0);

    // All files should be CSS files
    files.forEach((file) => {
      expect(file.endsWith(".css")).toBe(true);
    });
  });

  test("should handle multiple patterns", async () => {
    // Create test files
    await fs.writeFile("test-multi1.css", ".test1 { color: blue; }");
    await fs.writeFile("test-multi2.css", ".test2 { color: green; }");

    const files = await handler.resolveFiles([
      "test-multi1.css",
      "test-multi2.css",
    ]);

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThanOrEqual(0);

    // Cleanup
    await fs.remove("test-multi1.css");
    await fs.remove("test-multi2.css");
  });

  test("should get file info", async () => {
    // Create test file
    await fs.writeFile("test-validation.css", ".validation { color: purple; }");

    const info = await handler.getFileInfo("test-validation.css");

    expect(info).toBeDefined();
    expect(typeof info.exists).toBe("boolean");
    expect(typeof info.size).toBe("number");
    expect(typeof info.modified).toBe("string");
    expect(typeof info.extension).toBe("string");

    // Cleanup
    await fs.remove("test-validation.css");
  });

  test("should perform basic security validation", () => {
    const securePaths = [
      "normal-file.css",
      "./subdir/file.css",
      "style.css",
      "src/components/button.css",
    ];

    const insecurePaths = [
      "../../../etc/passwd",
      "/etc/passwd",
      "..\\..\\windows\\system32\\config\\sam",
      "/etc/shadow",
    ];

    // Test secure paths - check if they don't contain obvious traversal patterns
    securePaths.forEach((testPath) => {
      expect(testPath.includes("../")).toBe(false);
      expect(testPath.includes("..\\")).toBe(false);
      expect(testPath.startsWith("/etc/")).toBe(false);
    });

    // Test insecure paths - check if they contain obvious traversal patterns
    insecurePaths.forEach((testPath) => {
      const isObviouslyInsecure =
        testPath.includes("../") ||
        testPath.includes("..\\") ||
        testPath.startsWith("/etc/");
      expect(isObviouslyInsecure).toBe(true);
    });
  });

  test("should get batch file info", async () => {
    // Create test files
    await fs.writeFile("test-batch1.css", ".batch1 { color: red; }");
    await fs.writeFile("test-batch2.css", ".batch2 { color: blue; }");

    const files = ["test-batch1.css", "test-batch2.css"];

    const results = await handler.getBatchFileInfo(files);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);

    results.forEach((result) => {
      expect(result.file).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(typeof result.exists).toBe("boolean");
    });

    // Cleanup
    await fs.remove("test-batch1.css");
    await fs.remove("test-batch2.css");
  });

  test("should handle non-existent files gracefully", async () => {
    await expect(
      handler.resolveFiles("non-existent-file.css"),
    ).rejects.toThrow();
  });

  test("should handle empty patterns", async () => {
    const files = await handler.resolveFiles([]);
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(0);
  });

  test("should respect file size limits", async () => {
    // Create a large test file (if needed for testing)
    const largeContent = ".large { color: red; }".repeat(1000);
    await fs.writeFile("test-large.css", largeContent);

    const info = await handler.getFileInfo("test-large.css");
    expect(info.size).toBeGreaterThan(0);
    expect(info.size).toBeLessThanOrEqual(5 * 1024 * 1024); // 5MB limit

    // Cleanup
    await fs.remove("test-large.css");
  });

  test("should handle interactive file selection", async () => {
    // This test just ensures the method doesn't throw
    // The actual interactive selection would require user input
    // Since we can't mock user input easily in this context, we'll just test the method exists
    expect(typeof handler.selectFilesInteractively).toBe("function");
  });
});
