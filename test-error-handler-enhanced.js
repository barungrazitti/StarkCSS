// Enhanced error handler tests
import { jest } from '@jest/globals';
import { ErrorHandler } from '../error-handler.js';

describe('ErrorHandler', () => {
  describe('withErrorHandling', () => {
    test('should execute successful function and return result', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await ErrorHandler.withErrorHandling(successFn, 'Test Operation');
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    test('should handle thrown errors and return error info', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const result = await ErrorHandler.withErrorHandling(failFn, 'Test Operation');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Test error');
      expect(result.context).toBe('Test Operation');
      expect(failFn).toHaveBeenCalledTimes(1);
    });

    test('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const syncFailFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const result = await ErrorHandler.withErrorHandling(syncFailFn, 'Sync Operation');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Sync error');
      expect(result.context).toBe('Sync Operation');
    });
  });

  describe('categorizeError', () => {
    test('should categorize file not found error', () => {
      const error = { code: 'ENOENT', message: 'File not found' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('FILE_NOT_FOUND');
    });

    test('should categorize permission denied error', () => {
      const error = { code: 'EACCES', message: 'Permission denied' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('PERMISSION_DENIED');
    });

    test('should categorize disk full error', () => {
      const error = { code: 'ENOSPC', message: 'No space left on device' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('DISK_FULL');
    });

    test('should categorize timeout error', () => {
      const error = { name: 'AbortError', message: 'Operation timed out' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('TIMEOUT');
    });

    test('should categorize service unavailable error', () => {
      const error = { message: '503 Service Unavailable' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('SERVICE_UNAVAILABLE');
    });

    test('should categorize authentication error', () => {
      const error = { message: '401 Unauthorized' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('AUTHENTICATION_ERROR');
    });

    test('should categorize bad request error', () => {
      const error = { message: '400 Bad Request' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('BAD_REQUEST');
    });

    test('should categorize network error', () => {
      const error = { message: 'fetch failed' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('NETWORK_ERROR');
    });

    test('should categorize CSS parse error', () => {
      const error = { message: 'CSS parse error: invalid syntax' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('CSS_PARSE_ERROR');
    });

    test('should categorize size error', () => {
      const error = { message: 'File too large' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('SIZE_ERROR');
    });

    test('should categorize security error', () => {
      const error = { message: 'Path traversal detected' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('SECURITY_ERROR');
    });

    test('should categorize unknown error', () => {
      const error = { message: 'Some unknown error' };
      const category = ErrorHandler.categorizeError(error);
      
      expect(category).toBe('UNKNOWN_ERROR');
    });
  });

  describe('isRecoverable', () => {
    test('should identify network error as recoverable', () => {
      const error = { message: 'fetch failed' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(true);
    });

    test('should identify service unavailable as recoverable', () => {
      const error = { message: '503 Service Unavailable' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(true);
    });

    test('should identify timeout as recoverable', () => {
      const error = { name: 'AbortError', message: 'Operation timed out' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(true);
    });

    test('should identify authentication error as recoverable', () => {
      const error = { message: '401 Unauthorized' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(true);
    });

    test('should identify file not found as not recoverable', () => {
      const error = { code: 'ENOENT', message: 'File not found' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(false);
    });

    test('should identify disk full as not recoverable', () => {
      const error = { code: 'ENOSPC', message: 'No space left on device' };
      const recoverable = ErrorHandler.isRecoverable(error);
      
      expect(recoverable).toBe(false);
    });
  });

  describe('logError', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn()
      };
      global.console = consoleSpy;
    });

    afterEach(() => {
      global.console = console;
    });

    test('should log file not found error with helpful message', () => {
      const errorInfo = {
        context: 'File Operation',
        message: 'ENOENT: no such file or directory',
        type: 'FILE_NOT_FOUND',
        recoverable: false
      };
      
      ErrorHandler.logError(errorInfo);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ File Operation: File not found - ENOENT: no such file or directory'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '   💡 Check if the file path is correct and the file exists.'
      );
    });

    test('should log permission denied error with helpful message', () => {
      const errorInfo = {
        context: 'File Operation',
        message: 'EACCES: permission denied',
        type: 'PERMISSION_DENIED',
        recoverable: false
      };
      
      ErrorHandler.logError(errorInfo);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ File Operation: Permission denied - EACCES: permission denied'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '   💡 Check file permissions and try running with appropriate access rights.'
      );
    });

    test('should log timeout error with recovery suggestion', () => {
      const errorInfo = {
        context: 'API Call',
        message: 'Operation timed out',
        type: 'TIMEOUT',
        recoverable: true
      };
      
      ErrorHandler.logError(errorInfo);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '⏱️ API Call: Operation timed out - Operation timed out'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '   🔄 This is a temporary issue. You can try again.'
      );
    });

    test('should log service unavailable error with helpful message', () => {
      const errorInfo = {
        context: 'API Call',
        message: '503 Service Unavailable',
        type: 'SERVICE_UNAVAILABLE',
        recoverable: true
      };
      
      ErrorHandler.logError(errorInfo);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '🚫 API Call: Service temporarily unavailable - 503 Service Unavailable'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '   💡 The service is temporarily down. Please try again later.'
      );
    });

    test('should log unknown error with recovery suggestion if recoverable', () => {
      const errorInfo = {
        context: 'Unknown Operation',
        message: 'Something went wrong',
        type: 'UNKNOWN_ERROR',
        recoverable: true
      };
      
      ErrorHandler.logError(errorInfo);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Unknown Operation: Something went wrong'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '   🔄 This error might be temporary. You can try again.'
      );
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should succeed on first attempt', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await ErrorHandler.withRetry(successFn, 3, 1000, 'Test Operation');
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on recoverable error and succeed', async () => {
      const error = new Error('Network error');
      const fn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const promise = ErrorHandler.withRetry(fn, 3, 1000, 'Test Operation');
      
      // Fast-forward past all timers
      await jest.advanceTimersByTimeAsync(1000);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries for recoverable error', async () => {
      const error = new Error('Network error');
      const fn = jest.fn().mockRejectedValue(error);
      
      const promise = ErrorHandler.withRetry(fn, 3, 1000, 'Test Operation');
      
      // Fast-forward past all timers
      await jest.advanceTimersByTimeAsync(1000 + 2000 + 4000); // 1s, 2s, 4s
      
      const result = await promise;
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-recoverable error', async () => {
      const error = { code: 'ENOENT', message: 'File not found' };
      const fn = jest.fn().mockRejectedValue(error);
      
      const result = await ErrorHandler.withRetry(fn, 3, 1000, 'Test Operation');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('File not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should use exponential backoff', async () => {
      const error = new Error('Network error');
      const fn = jest.fn().mockRejectedValue(error);
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      const promise = ErrorHandler.withRetry(fn, 3, 1000, 'Test Operation');
      
      // Let first retry happen
      await jest.advanceTimersByTimeAsync(1000);
      
      // Let second retry happen
      await jest.advanceTimersByTimeAsync(2000);
      
      // Let third retry happen
      await jest.advanceTimersByTimeAsync(4000);
      
      await promise;
      
      // Check that setTimeout was called with correct delays
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 2000);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(3, expect.any(Function), 4000);
      
      setTimeoutSpy.mockRestore();
    });
  });

  describe('withFallback', () => {
    test('should use primary function when successful', async () => {
      const primaryFn = jest.fn().mockResolvedValue('primary result');
      const fallbackFn = jest.fn().mockResolvedValue('fallback result');
      
      const result = await ErrorHandler.withFallback(primaryFn, fallbackFn, 'Test Operation');
      
      expect(result).toBe('primary result');
      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    test('should use fallback when primary fails', async () => {
      const primaryError = new Error('Primary failed');
      const primaryFn = jest.fn().mockRejectedValue(primaryError);
      const fallbackFn = jest.fn().mockResolvedValue('fallback result');
      
      const result = await ErrorHandler.withFallback(primaryFn, fallbackFn, 'Test Operation');
      
      expect(result).toBe('fallback result');
      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    test('should handle fallback failure', async () => {
      const primaryError = new Error('Primary failed');
      const fallbackError = new Error('Fallback failed');
      const primaryFn = jest.fn().mockRejectedValue(primaryError);
      const fallbackFn = jest.fn().mockRejectedValue(fallbackError);
      
      await expect(
        ErrorHandler.withFallback(primaryFn, fallbackFn, 'Test Operation')
      ).rejects.toThrow('Fallback failed');
    });

    test('should log warning when using fallback', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const primaryError = new Error('Primary failed');
      const primaryFn = jest.fn().mockRejectedValue(primaryError);
      const fallbackFn = jest.fn().mockResolvedValue('fallback result');
      
      return ErrorHandler.withFallback(primaryFn, fallbackFn, 'Test Operation')
        .then(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            '⚠️ Test Operation primary method failed, using fallback: Primary failed'
          );
          consoleWarnSpy.mockRestore();
        });
    });
  });

  describe('validatePrerequisites', () => {
    test('should pass when all prerequisites are met', () => {
      const prerequisites = [
        { condition: true, message: 'Prerequisite 1' },
        { condition: true, message: 'Prerequisite 2' }
      ];
      
      expect(() => {
        ErrorHandler.validatePrerequisites(prerequisites, 'Test Operation');
      }).not.toThrow();
    });

    test('should throw when prerequisites are not met', () => {
      const prerequisites = [
        { condition: true, message: 'Prerequisite 1' },
        { condition: false, message: 'Prerequisite 2' },
        { condition: false, message: 'Prerequisite 3' }
      ];
      
      expect(() => {
        ErrorHandler.validatePrerequisites(prerequisites, 'Test Operation');
      }).toThrow('Prerequisites not met for Test Operation: Prerequisite 2, Prerequisite 3');
    });

    test('should throw prerequisite error with correct code', () => {
      const prerequisites = [
        { condition: false, message: 'Missing requirement' }
      ];
      
      try {
        ErrorHandler.validatePrerequisites(prerequisites, 'Test Operation');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('PREREQUISITE_ERROR');
        expect(error.message).toContain('Prerequisites not met for Test Operation');
      }
    });
  });

  describe('createProgressTracker', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        log: jest.fn()
      };
      global.console = consoleSpy;
    });

    afterEach(() => {
      global.console = console;
    });

    test('should create progress tracker with correct steps', () => {
      const tracker = ErrorHandler.createProgressTracker(3, 'Test Operation');
      
      expect(typeof tracker.step).toBe('function');
      expect(typeof tracker.complete).toBe('function');
    });

    test('should log progress steps correctly', () => {
      const tracker = ErrorHandler.createProgressTracker(3, 'Test Operation');
      
      tracker.step('First step');
      tracker.step('Second step');
      tracker.step('Third step');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📊 Test Operation: First step (1/3 - 33%)'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📊 Test Operation: Second step (2/3 - 67%)'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📊 Test Operation: Third step (3/3 - 100%)'
      );
    });

    test('should log completion message', () => {
      const tracker = ErrorHandler.createProgressTracker(3, 'Test Operation');
      
      tracker.complete('Operation completed successfully');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ Test Operation: Operation completed successfully'
      );
    });
  });
});