// Enhanced security utilities tests
import { jest } from '@jest/globals';
import { SecurityUtils } from '../security.js';
import path from 'path';

describe('SecurityUtils', () => {
  describe('validatePath', () => {
    const testBaseDir = '/safe/directory';

    test('should validate and return resolved path for valid input', () => {
      const userPath = '/safe/directory/file.css';
      const result = SecurityUtils.validatePath(userPath, testBaseDir);
      
      expect(result).toBe(path.resolve(userPath));
    });

    test('should throw error for null or undefined path', () => {
      expect(() => SecurityUtils.validatePath(null, testBaseDir))
        .toThrow('Invalid file path provided');
      expect(() => SecurityUtils.validatePath(undefined, testBaseDir))
        .toThrow('Invalid file path provided');
    });

    test('should throw error for non-string path', () => {
      expect(() => SecurityUtils.validatePath(123, testBaseDir))
        .toThrow('Invalid file path provided');
      expect(() => SecurityUtils.validatePath({}, testBaseDir))
        .toThrow('Invalid file path provided');
    });

    test('should throw error for path traversal attempts', () => {
      const maliciousPaths = [
        '/safe/directory/../../../etc/passwd',
        '/safe/directory/../secret/config.js',
        '../../etc/shadow',
        '/safe/directory/./././../../private'
      ];

      maliciousPaths.forEach(maliciousPath => {
        expect(() => SecurityUtils.validatePath(maliciousPath, testBaseDir))
          .toThrow('Path traversal detected - access denied');
      });
    });

    test('should throw error for paths with dangerous characters', () => {
      const dangerousPaths = [
        '/safe/directory/file<name>.css',
        '/safe/directory/file>name.css',
        '/safe/directory/file:name.css',
        '/safe/directory/file|name.css',
        '/safe/directory/file?name.css',
        '/safe/directory/file*name.css'
      ];

      dangerousPaths.forEach(dangerousPath => {
        expect(() => SecurityUtils.validatePath(dangerousPath, testBaseDir))
          .toThrow('Dangerous path pattern detected');
      });
    });

    test('should throw error for Windows reserved names', () => {
      const reservedNames = [
        '/safe/directory/CON.css',
        '/safe/directory/PRN.css',
        '/safe/directory/AUX.css',
        '/safe/directory/NUL.css',
        '/safe/directory/COM1.css',
        '/safe/directory/LPT1.css',
        '/safe/directory/con.css', // lowercase
        '/safe/directory/prn.css'
      ];

      reservedNames.forEach(reservedPath => {
        expect(() => SecurityUtils.validatePath(reservedPath, testBaseDir))
          .toThrow('Dangerous path pattern detected');
      });
    });

    test('should allow valid CSS file paths', () => {
      const validPaths = [
        '/safe/directory/style.css',
        '/safe/directory/subfolder/main.css',
        '/safe/directory/file-with-dashes.css',
        '/safe/directory/file_with_underscores.css',
        '/safe/directory/file123.css'
      ];

      validPaths.forEach(validPath => {
        const result = SecurityUtils.validatePath(validPath, testBaseDir);
        expect(result).toBe(path.resolve(validPath));
      });
    });

    test('should handle relative paths within base directory', () => {
      const relativePath = './subfolder/style.css';
      const fullPath = path.join(testBaseDir, relativePath);
      const result = SecurityUtils.validatePath(relativePath, testBaseDir);
      
      expect(result).toBe(path.resolve(fullPath));
    });
  });

  describe('sanitizeLogData', () => {
    test('should return input as-is for non-string input', () => {
      expect(SecurityUtils.sanitizeLogData(null)).toBeNull();
      expect(SecurityUtils.sanitizeLogData(undefined)).toBeUndefined();
      expect(SecurityUtils.sanitizeLogData(123)).toBe(123);
      expect(SecurityUtils.sanitizeLogData({})).toEqual({});
    });

    test('should sanitize Bearer tokens', () => {
      const message = 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890';
      const sanitized = SecurityUtils.sanitizeLogData(message);
      
      expect(sanitized).toContain('Bearer abcdefgh...[REDACTED]');
      expect(sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
    });

    test('should sanitize API keys with various patterns', () => {
      const testCases = [
        {
          input: 'API key: api_key_1234567890abcdefghijklmnopqrstuvwxyz',
          expected: 'api_key_1234567...[REDACTED]'
        },
        {
          input: 'Key: gsk_1234567890abcdefghijklmnopqrstuvwxyz1234567890',
          expected: 'gsk_12345678...[REDACTED]'
        },
        {
          input: 'Token: sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdef',
          expected: 'sk-12345678...[REDACTED]'
        },
        {
          input: 'Auth: api-key=1234567890abcdefghijklmnopqrstuvwxyz',
          expected: 'api-key=1234567...[REDACTED]'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const sanitized = SecurityUtils.sanitizeLogData(input);
        expect(sanitized).toContain(expected);
        expect(sanitized).not.toContain(input.match(/[a-zA-Z0-9_-]{20,}/)[0]);
      });
    });

    test('should handle multiple API keys in same message', () => {
      const message = 'Bearer key1: abcdefghijklmnopqrstuvwxyz1234567890 and key2: gsk_1234567890abcdefghijklmnopqrstuvwxyz';
      const sanitized = SecurityUtils.sanitizeLogData(message);
      
      expect(sanitized).toContain('abcdefgh...[REDACTED]');
      expect(sanitized).toContain('gsk_12345678...[REDACTED]');
      expect(sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
    });

    test('should leave non-sensitive data unchanged', () => {
      const message = 'Processing file: style.css, Size: 1024 bytes, Status: completed';
      const sanitized = SecurityUtils.sanitizeLogData(message);
      
      expect(sanitized).toBe(message);
    });

    test('should handle empty string', () => {
      const sanitized = SecurityUtils.sanitizeLogData('');
      expect(sanitized).toBe('');
    });
  });

  describe('validateCSSContent', () => {
    test('should throw error for null or undefined CSS', () => {
      expect(() => SecurityUtils.validateCSSContent(null))
        .toThrow('Invalid CSS content');
      expect(() => SecurityUtils.validateCSSContent(undefined))
        .toThrow('Invalid CSS content');
    });

    test('should throw error for non-string CSS', () => {
      expect(() => SecurityUtils.validateCSSContent(123))
        .toThrow('Invalid CSS content');
      expect(() => SecurityUtils.validateCSSContent({}))
        .toThrow('Invalid CSS content');
    });

    test('should throw error for CSS containing JavaScript URLs', () => {
      const dangerousCSS = `
        body {
          background: url(javascript:alert('XSS'));
        }
        a {
          behavior: url(javascript:eval('malicious'));
        }
      `;
      
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS))
        .toThrow('Security issues found: Dangerous CSS pattern 1 detected, Dangerous CSS pattern 4 detected');
    });

    test('should throw error for CSS containing IE expressions', () => {
      const dangerousCSS = `
        .element {
          width: expression(document.body.clientWidth > 800 ? '800px' : 'auto');
        }
      `;
      
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS))
        .toThrow('Security issues found: Dangerous CSS pattern 2 detected');
    });

    test('should throw error for CSS containing JavaScript imports', () => {
      const dangerousCSS = `
        @import url(javascript:alert('XSS'));
      `;
      
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS))
        .toThrow('Security issues found: Dangerous CSS pattern 3 detected');
    });

    test('should throw error for CSS containing IE behaviors', () => {
      const dangerousCSS = `
        .element {
          behavior: url(#default#time2);
          -ms-behavior: url(#default#time2);
        }
      `;
      
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS))
        .toThrow('Security issues found: Dangerous CSS pattern 4 detected, Dangerous CSS pattern 5 detected');
    });

    test('should throw error for CSS containing Mozilla bindings', () => {
      const dangerousCSS = `
        .element {
          binding: url('malicious.xbl');
        }
      `;
      
      expect(() => SecurityUtils.validateCSSContent(dangerousCSS))
        .toThrow('Security issues found: Dangerous CSS pattern 6 detected');
    });

    test('should throw error for excessively large CSS', () => {
      const largeCSS = 'a { color: red; }'.repeat(1000000); // ~25MB
      
      expect(() => SecurityUtils.validateCSSContent(largeCSS))
        .toThrow('CSS content too large');
    });

    test('should validate safe CSS content', () => {
      const safeCSS = `
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #fff;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
        }
      `;
      
      expect(() => SecurityUtils.validateCSSContent(safeCSS)).not.toThrow();
    });

    test('should handle empty CSS string', () => {
      expect(() => SecurityUtils.validateCSSContent('')).not.toThrow();
    });

    test('should handle CSS with only whitespace', () => {
      const whitespaceCSS = '   \n\n  \t\n   ';
      expect(() => SecurityUtils.validateCSSContent(whitespaceCSS)).not.toThrow();
    });
  });

  describe('validateNumber', () => {
    test('should return parsed number for valid input', () => {
      expect(SecurityUtils.validateNumber('42')).toBe(42);
      expect(SecurityUtils.validateNumber('0')).toBe(0);
      expect(SecurityUtils.validateNumber('-10')).toBe(-10);
      expect(SecurityUtils.validateNumber(42)).toBe(42);
    });

    test('should return default value for invalid input', () => {
      expect(SecurityUtils.validateNumber('invalid')).toBe(0);
      expect(SecurityUtils.validateNumber('')).toBe(0);
      expect(SecurityUtils.validateNumber(null)).toBe(0);
      expect(SecurityUtils.validateNumber(undefined)).toBe(0);
      expect(SecurityUtils.validateNumber({})).toBe(0);
    });

    test('should respect minimum and maximum bounds', () => {
      expect(SecurityUtils.validateNumber('50', 0, 100)).toBe(50);
      expect(SecurityUtils.validateNumber('-10', 0, 100)).toBe(0);
      expect(SecurityUtils.validateNumber('150', 0, 100)).toBe(100);
      expect(SecurityUtils.validateNumber('5', 10, 20)).toBe(10);
      expect(SecurityUtils.validateNumber('25', 10, 20)).toBe(20);
    });

    test('should use custom default value', () => {
      expect(SecurityUtils.validateNumber('invalid', 0, 100, 50)).toBe(50);
      expect(SecurityUtils.validateNumber(null, 0, 100, -1)).toBe(-1);
    });
  });

  describe('validateFloat', () => {
    test('should return parsed float for valid input', () => {
      expect(SecurityUtils.validateFloat('3.14')).toBe(3.14);
      expect(SecurityUtils.validateFloat('0.5')).toBe(0.5);
      expect(SecurityUtils.validateFloat('-2.5')).toBe(-2.5);
      expect(SecurityUtils.validateFloat(3.14)).toBe(3.14);
    });

    test('should return parsed integer as float', () => {
      expect(SecurityUtils.validateFloat('42')).toBe(42);
      expect(SecurityUtils.validateFloat(42)).toBe(42);
    });

    test('should return default value for invalid input', () => {
      expect(SecurityUtils.validateFloat('invalid')).toBe(0);
      expect(SecurityUtils.validateFloat('')).toBe(0);
      expect(SecurityUtils.validateFloat(null)).toBe(0);
    });

    test('should respect minimum and maximum bounds', () => {
      expect(SecurityUtils.validateFloat('3.14', 0, 5)).toBe(3.14);
      expect(SecurityUtils.validateFloat('-1.5', 0, 5)).toBe(0);
      expect(SecurityUtils.validateFloat('6.5', 0, 5)).toBe(5);
    });

    test('should use custom default value', () => {
      expect(SecurityUtils.validateFloat('invalid', 0, 10, 5.5)).toBe(5.5);
    });
  });

  describe('validateBoolean', () => {
    test('should return boolean input as-is', () => {
      expect(SecurityUtils.validateBoolean(true)).toBe(true);
      expect(SecurityUtils.validateBoolean(false)).toBe(false);
    });

    test('should parse string boolean values', () => {
      expect(SecurityUtils.validateBoolean('true')).toBe(true);
      expect(SecurityUtils.validateBoolean('TRUE')).toBe(true);
      expect(SecurityUtils.validateBoolean('True')).toBe(true);
      expect(SecurityUtils.validateBoolean('false')).toBe(false);
      expect(SecurityUtils.validateBoolean('FALSE')).toBe(false);
      expect(SecurityUtils.validateBoolean('False')).toBe(false);
    });

    test('should treat non-false strings as true', () => {
      expect(SecurityUtils.validateBoolean('yes')).toBe(true);
      expect(SecurityUtils.validateBoolean('1')).toBe(true);
      expect(SecurityUtils.validateBoolean('enabled')).toBe(true);
    });

    test('should return default value for non-boolean, non-string input', () => {
      expect(SecurityUtils.validateBoolean(null)).toBe(false);
      expect(SecurityUtils.validateBoolean(undefined)).toBe(false);
      expect(SecurityUtils.validateBoolean(123)).toBe(false);
      expect(SecurityUtils.validateBoolean({})).toBe(false);
    });

    test('should use custom default value', () => {
      expect(SecurityUtils.validateBoolean(null, false, true)).toBe(true);
      expect(SecurityUtils.validateBoolean(123, false, true)).toBe(true);
    });
  });

  describe('createHash', () => {
    test('should create consistent hash for same content', () => {
      const content = 'test content';
      const hash1 = SecurityUtils.createHash(content);
      const hash2 = SecurityUtils.createHash(content);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
      expect(typeof hash1).toBe('string');
    });

    test('should create different hashes for different content', () => {
      const content1 = 'content 1';
      const content2 = 'content 2';
      const hash1 = SecurityUtils.createHash(content1);
      const hash2 = SecurityUtils.createHash(content2);
      
      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty string', () => {
      const hash = SecurityUtils.createHash('');
      expect(hash).toHaveLength(16);
      expect(typeof hash).toBe('string');
    });

    test('should handle large content', () => {
      const largeContent = 'a'.repeat(10000);
      const hash = SecurityUtils.createHash(largeContent);
      
      expect(hash).toHaveLength(16);
      expect(typeof hash).toBe('string');
    });
  });

  describe('validateRegex', () => {
    test('should return RegExp object for valid string pattern', () => {
      const pattern = '\\d+';
      const result = SecurityUtils.validateRegex(pattern);
      
      expect(result).toBeInstanceOf(RegExp);
      expect(result.source).toBe('\\d+');
    });

    test('should return RegExp object as-is for valid RegExp input', () => {
      const pattern = /\d+/;
      const result = SecurityUtils.validateRegex(pattern);
      
      expect(result).toBe(pattern);
    });

    test('should throw error for null or undefined pattern', () => {
      expect(() => SecurityUtils.validateRegex(null))
        .toThrow('Invalid regex pattern');
      expect(() => SecurityUtils.validateRegex(undefined))
        .toThrow('Invalid regex pattern');
    });

    test('should throw error for non-string, non-RegExp input', () => {
      expect(() => SecurityUtils.validateRegex(123))
        .toThrow('Invalid regex pattern');
      expect(() => SecurityUtils.validateRegex({}))
        .toThrow('Invalid regex pattern');
    });

    test('should throw error for patterns with catastrophic backtracking', () => {
      const dangerousPatterns = [
        '(.+)+',
        '(.+)*',
        '(.+)?',
        '(a+)+',
        '(a+)*',
        '(a+)?',
        '\\(.+\\)+',
        '\\(.+\\)*'
      ];

      dangerousPatterns.forEach(pattern => {
        expect(() => SecurityUtils.validateRegex(pattern))
          .toThrow('Potentially dangerous regex pattern detected');
      });
    });

    test('should throw error for patterns with nested quantifiers', () => {
      const dangerousPatterns = [
        '((a+)b+)+',
        '(a+)+b',
        'a+(b+)+'
      ];

      dangerousPatterns.forEach(pattern => {
        expect(() => SecurityUtils.validateRegex(pattern))
          .toThrow('Potentially dangerous regex pattern detected');
      });
    });

    test('should throw error for regex that times out', () => {
      // This test simulates a ReDoS vulnerability
      const slowPattern = '(a+)+';
      
      expect(() => SecurityUtils.validateRegex(slowPattern, 100))
        .toThrow('Potentially dangerous regex pattern detected');
    });

    test('should validate safe regex patterns', () => {
      const safePatterns = [
        '\\d+',
        '[a-zA-Z0-9]+',
        '^\\s*\\d+\\s*$',
        '[^\\s]+',
        'https?://[^\\s]+'
      ];

      safePatterns.forEach(pattern => {
        expect(() => SecurityUtils.validateRegex(pattern, 1000)).not.toThrow();
      });
    });

    test('should handle complex but safe regex patterns', () => {
      const complexPattern = '^https?://(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?$';
      
      expect(() => SecurityUtils.validateRegex(complexPattern, 1000)).not.toThrow();
    });
  });
});