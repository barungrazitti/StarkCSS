// test-error-handler.js - Unit tests for error handler
import { jest } from '@jest/globals';
import { SecurityError, FileError, ProcessingError } from '../error-handler.js';

describe('Error Handler Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SecurityError', () => {
    test('should create SecurityError with message', () => {
      const error = new SecurityError('Test security error');
      expect(error.name).toBe('SecurityError');
      expect(error.message).toBe('Test security error');
    });

    test('should create SecurityError with default message', () => {
      const error = new SecurityError();
      expect(error.name).toBe('SecurityError');
      expect(error.message).toBe('Security violation occurred');
    });
  });

  describe('FileError', () => {
    test('should create FileError with message', () => {
      const error = new FileError('Test file error');
      expect(error.name).toBe('FileError');
      expect(error.message).toBe('Test file error');
    });

    test('should create FileError with default message', () => {
      const error = new FileError();
      expect(error.name).toBe('FileError');
      expect(error.message).toBe('File operation failed');
    });
  });

  describe('ProcessingError', () => {
    test('should create ProcessingError with message', () => {
      const error = new ProcessingError('Test processing error');
      expect(error.name).toBe('ProcessingError');
      expect(error.message).toBe('Test processing error');
    });

    test('should create ProcessingError with default message', () => {
      const error = new ProcessingError();
      expect(error.name).toBe('ProcessingError');
      expect(error.message).toBe('CSS processing failed');
    });
  });

  describe('Error Inheritance', () => {
    test('should inherit from Error', () => {
      const securityError = new SecurityError('Test');
      const fileError = new FileError('Test');
      const processingError = new ProcessingError('Test');

      expect(securityError instanceof Error).toBe(true);
      expect(fileError instanceof Error).toBe(true);
      expect(processingError instanceof Error).toBe(true);
    });

    test('should have proper stack traces', () => {
      const error = new SecurityError('Test');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('Error Handling Functions', () => {
    test('should handle and wrap errors', () => {
      const originalError = new Error('Original error');
      const wrappedError = new ProcessingError('Wrapped: ' + originalError.message);
      
      expect(wrappedError.message).toBe('Wrapped: Original error');
    });

    test('should preserve original error in cause', () => {
      const originalError = new Error('Original');
      const wrappedError = new ProcessingError('Wrapped error');
      wrappedError.cause = originalError;
      
      expect(wrappedError.cause).toBe(originalError);
    });
  });
});