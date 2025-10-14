import path from "path";
import crypto from "crypto";

/**
 * Security utilities for CSS optimizer
 */
export class SecurityUtils {
  /**
   * Validate and sanitize file paths to prevent path traversal
   */
  static validatePath(userPath, allowedBaseDir = process.cwd()) {
    if (!userPath || typeof userPath !== "string") {
      throw new Error("Invalid file path provided");
    }

    // Resolve the path and check if it's within allowed directory
    const resolvedPath = path.resolve(userPath);
    const normalizedBase = path.resolve(allowedBaseDir);

    if (!resolvedPath.startsWith(normalizedBase)) {
      throw new Error("Path traversal detected - access denied");
    }

    // Additional checks for dangerous patterns
    const dangerousPatterns = [
      /\.\./, // Parent directory traversal
      /[<>:"|?*]/, // Invalid characters in filenames
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(userPath))) {
      throw new Error("Dangerous path pattern detected");
    }

    return resolvedPath;
  }

  /**
   * Sanitize API keys and sensitive data in logs
   */
  static sanitizeLogData(message) {
    if (!message || typeof message !== "string") {
      return message;
    }

    // Mask API keys (common patterns)
    const apiKeyPatterns = [
      /Bearer\s+([a-zA-Z0-9_-]{20,})/gi,
      /api[_-]?key["\s:]+([a-zA-Z0-9_-]{20,})/gi,
      /gsk_[a-zA-Z0-9_-]{30,}/gi,
      /sk-[a-zA-Z0-9_-]{48}/gi,
    ];

    let sanitized = message;
    apiKeyPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, (match, key) => {
        if (key) {
          const visible = key.substring(0, 8);
          return match.replace(key, `${visible}...[REDACTED]`);
        }
        return match;
      });
    });

    return sanitized;
  }

  /**
   * Validate CSS content for security issues
   */
  static validateCSSContent(css) {
    if (!css || typeof css !== "string") {
      throw new Error("Invalid CSS content");
    }

    // Check for potentially dangerous CSS
    const dangerousPatterns = [
      /javascript:/gi, // JavaScript URLs
      /expression\s*\(/gi, // IE expression()
      /@import\s+url\s*\(\s*javascript:/gi, // JavaScript imports
      /behavior\s*:\s*url/gi, // IE behaviors
      /-ms-behavior/gi, // IE behaviors
      /binding\s*:/gi, // Mozilla binding
    ];

    const foundIssues = [];
    dangerousPatterns.forEach((pattern, index) => {
      if (pattern.test(css)) {
        foundIssues.push(`Dangerous CSS pattern ${index + 1} detected`);
      }
    });

    if (foundIssues.length > 0) {
      throw new Error(`Security issues found: ${foundIssues.join(", ")}`);
    }

    // Size validation
    const maxSize = 50 * 1024 * 1024; // 50MB max
    if (Buffer.byteLength(css, "utf8") > maxSize) {
      throw new Error("CSS content too large");
    }

    return true;
  }

  /**
   * Validate numeric configuration values
   */
  static validateNumber(value, min = 0, max = Infinity, defaultValue = 0) {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      return defaultValue;
    }

    return Math.max(min, Math.min(max, parsed));
  }

  /**
   * Validate float configuration values
   */
  static validateFloat(value, min = 0, max = Infinity, defaultValue = 0) {
    const parsed = parseFloat(value);

    if (isNaN(parsed)) {
      return defaultValue;
    }

    return Math.max(min, Math.min(max, parsed));
  }

  /**
   * Validate boolean configuration values
   */
  static validateBoolean(value, defaultValue = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return value.toLowerCase() !== "false";
    }

    return defaultValue;
  }

  /**
   * Create a safe hash for caching/identification
   */
  static createHash(content) {
    return crypto
      .createHash("sha256")
      .update(content)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Validate regex patterns to prevent ReDoS attacks
   */
  static validateRegex(pattern, timeoutMs = 1000) {
    if (
      !pattern ||
      (typeof pattern !== "string" && !(pattern instanceof RegExp))
    ) {
      throw new Error("Invalid regex pattern");
    }

    // Convert RegExp to string for validation
    const patternStr = pattern instanceof RegExp ? pattern.source : pattern;

    // Check for potentially dangerous regex patterns
    const dangerousPatterns = [
      "(.+)+", // Catastrophic backtracking
      "(.+)*", // Catastrophic backtracking
      "(.+)?", // Catastrophic backtracking
      "(a+)+", // Nested quantifiers
      "(a+)*", // Nested quantifiers
      "(a+)?", // Nested quantifiers
      "\\(.+\\)+", // Nested quantifiers with groups
      "\\(.+\\)*", // Nested quantifiers with groups
    ];

    dangerousPatterns.forEach((dangerous) => {
      if (patternStr.includes(dangerous)) {
        throw new Error("Potentially dangerous regex pattern detected");
      }
    });

    try {
      // Test the regex with timeout
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      const testString = "a".repeat(1000);

      const timeout = setTimeout(() => {
        throw new Error("Regex evaluation timeout - potential ReDoS");
      }, timeoutMs);

      try {
        regex.test(testString);
        clearTimeout(timeout);
        return regex;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } catch (error) {
      if (error.message === "Regex evaluation timeout - potential ReDoS") {
        throw error;
      }
      throw new Error(`Invalid regex pattern: ${error.message}`);
    }
  }
}
