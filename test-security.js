import { SecurityUtils } from "./security.js";

describe("Security Utils", () => {
  describe("validatePath", () => {
    test("should accept valid paths", () => {
      const validPath = "./test.css";
      const result = SecurityUtils.validatePath(validPath);
      expect(result).toContain("test.css");
    });

    test("should reject path traversal attempts", () => {
      expect(() => {
        SecurityUtils.validatePath("../../../etc/passwd");
      }).toThrow("Path traversal detected");
    });

    test("should reject null/undefined paths", () => {
      expect(() => {
        SecurityUtils.validatePath(null);
      }).toThrow("Invalid file path");
    });

    test("should reject dangerous patterns", () => {
      expect(() => {
        SecurityUtils.validatePath("CON");
      }).toThrow("Dangerous path pattern");
    });
  });

  describe("sanitizeLogData", () => {
    test("should mask API keys", () => {
      const message = "Bearer gsk_1234567890abcdef1234567890abcdef12345678";
      const sanitized = SecurityUtils.sanitizeLogData(message);
      expect(sanitized).toContain("1234...[REDACTED]");
      expect(sanitized).not.toContain(
        "1234567890abcdef1234567890abcdef12345678",
      );
    });

    test("should handle empty messages", () => {
      expect(SecurityUtils.sanitizeLogData(null)).toBeNull();
      expect(SecurityUtils.sanitizeLogData("")).toBe("");
    });
  });

  describe("validateCSSContent", () => {
    test("should accept valid CSS", () => {
      const validCSS = "body { color: red; }";
      expect(() => SecurityUtils.validateCSSContent(validCSS)).not.toThrow();
    });

    test("should reject JavaScript URLs", () => {
      const dangerousCSS = "body { background: url(javascript:alert(1)); }";
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS)).toThrow(
        "Security issues found",
      );
    });

    test("should reject expression()", () => {
      const dangerousCSS = "body { width: expression(alert(1)); }";
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS)).toThrow(
        "Security issues found",
      );
    });

    test("should reject oversized CSS", () => {
      const largeCSS = "a".repeat(51 * 1024 * 1024); // 51MB
      expect(() => SecurityUtils.validateCSSContent(largeCSS)).toThrow(
        "CSS content too large",
      );
    });
  });

  describe("validateNumber", () => {
    test("should validate numbers within range", () => {
      expect(SecurityUtils.validateNumber("5", 1, 10)).toBe(5);
      expect(SecurityUtils.validateNumber("15", 1, 10)).toBe(10); // capped at max
      expect(SecurityUtils.validateNumber("0", 1, 10)).toBe(1); // capped at min
    });

    test("should handle invalid input", () => {
      expect(SecurityUtils.validateNumber("invalid", 1, 10)).toBe(0); // default
      expect(SecurityUtils.validateNumber(null, 1, 10)).toBe(0); // default
    });
  });

  describe("validateFloat", () => {
    test("should validate float numbers", () => {
      expect(SecurityUtils.validateFloat("0.5", 0, 1)).toBe(0.5);
      expect(SecurityUtils.validateFloat("1.5", 0, 1)).toBe(1); // capped at max
    });
  });

  describe("validateBoolean", () => {
    test("should validate boolean values", () => {
      expect(SecurityUtils.validateBoolean(true)).toBe(true);
      expect(SecurityUtils.validateBoolean("true")).toBe(true);
      expect(SecurityUtils.validateBoolean("false")).toBe(false);
      expect(SecurityUtils.validateBoolean("random")).toBe(true); // non-false = true
      expect(SecurityUtils.validateBoolean(null)).toBe(false); // default
    });
  });

  describe("validateRegex", () => {
    test("should accept safe regex patterns", () => {
      expect(() => SecurityUtils.validateRegex("test")).not.toThrow();
    });

    test("should reject dangerous regex patterns", () => {
      expect(() => SecurityUtils.validateRegex("(.+)+")).toThrow();
    });

    test("should reject invalid patterns", () => {
      expect(() => SecurityUtils.validateRegex(null)).toThrow(
        "Invalid regex pattern",
      );
    });
  });

  describe("createHash", () => {
    test("should create consistent hash", () => {
      const content = "test content";
      const hash1 = SecurityUtils.createHash(content);
      const hash2 = SecurityUtils.createHash(content);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });
  });
});
