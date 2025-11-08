// Enhanced file handler tests
import { jest } from '@jest/globals';
import { FileHandler, resolveCSSFiles, selectCSSFilesInteractively } from '../file-handler.js';
import fs from 'fs-extra';
import glob from 'glob';
import chalk from 'chalk';
import path from 'path';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('glob');
jest.mock('chalk');
jest.mock('readline');

describe('FileHandler', () => {
  let fileHandler;
  let mockFs;
  let mockGlob;
  let mockChalk;

  beforeEach(() => {
    mockFs = {
      pathExists: jest.fn(),
      stat: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      copy: jest.fn(),
      access: jest.fn(),
      ensureDir: jest.fn(),
      remove: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn()
    };
    
    mockGlob = {
      glob: jest.fn()
    };
    
    mockChalk = {
      yellow: jest.fn(text => `YELLOW:${text}`),
      red: jest.fn(text => `RED:${text}`),
      blue: jest.fn(text => `BLUE:${text}`),
      green: jest.fn(text => `GREEN:${text}`),
      gray: jest.fn(text => `GRAY:${text}`),
      cyan: jest.fn(text => `CYAN:${text}`),
      bold: jest.fn(text => `BOLD:${text}`)
    };

    fs.mockImplementation(() => mockFs);
    glob.mockImplementation(() => mockGlob.glob);
    chalk.mockImplementation(() => mockChalk);
    
    fileHandler = new FileHandler();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const handler = new FileHandler();
      
      expect(handler.options.maxFileSize).toBe(10 * 1024 * 1024);
      expect(handler.options.allowedExtensions).toEqual(['.css']);
      expect(handler.options.excludePatterns).toContain('node_modules/**');
      expect(handler.options.includePatterns).toEqual([]);
    });

    test('should merge custom options with defaults', () => {
      const customOptions = {
        maxFileSize: 5 * 1024 * 1024,
        allowedExtensions: ['.css', '.scss'],
        includePatterns: ['src/**/*.css']
      };
      
      const handler = new FileHandler(customOptions);
      
      expect(handler.options.maxFileSize).toBe(5 * 1024 * 1024);
      expect(handler.options.allowedExtensions).toEqual(['.css', '.scss']);
      expect(handler.options.includePatterns).toEqual(['src/**/*.css']);
      expect(handler.options.excludePatterns).toContain('node_modules/**'); // Default preserved
    });
  });

  describe('resolveFiles', () => {
    test('should resolve array of inputs', async () => {
      const resolveSingleSpy = jest.spyOn(fileHandler, 'resolveSingleInput')
        .mockResolvedValueOnce(['/file1.css'])
        .mockResolvedValueOnce(['/file2.css']);
      
      const validateFilesSpy = jest.spyOn(fileHandler, 'validateFiles')
        .mockResolvedValue(['/file1.css', '/file2.css']);
      
      const result = await fileHandler.resolveFiles(['input1', 'input2']);
      
      expect(result).toEqual(['/file1.css', '/file2.css']);
      expect(resolveSingleSpy).toHaveBeenCalledTimes(2);
      expect(validateFilesSpy).toHaveBeenCalledTimes(1);
    });

    test('should resolve single input', async () => {
      const resolveSingleSpy = jest.spyOn(fileHandler, 'resolveSingleInput')
        .mockResolvedValue(['/file1.css']);
      
      const validateFilesSpy = jest.spyOn(fileHandler, 'validateFiles')
        .mockResolvedValue(['/file1.css']);
      
      const result = await fileHandler.resolveFiles('input1');
      
      expect(result).toEqual(['/file1.css']);
      expect(resolveSingleSpy).toHaveBeenCalledTimes(1);
      expect(validateFilesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveSingleInput', () => {
    test('should resolve glob pattern', async () => {
      const resolveGlobSpy = jest.spyOn(fileHandler, 'resolveGlobPattern')
        .mockResolvedValue(['/file1.css', '/file2.css']);
      
      const result = await fileHandler.resolveSingleInput('**/*.css');
      
      expect(result).toEqual(['/file1.css', '/file2.css']);
      expect(resolveGlobSpy).toHaveBeenCalledWith('**/*.css');
    });

    test('should resolve directory path', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      });
      
      const discoverSpy = jest.spyOn(fileHandler, 'discoverCSSFiles')
        .mockResolvedValue(['/dir/file1.css']);
      
      const result = await fileHandler.resolveSingleInput('/some/directory');
      
      expect(result).toEqual(['/dir/file1.css']);
      expect(discoverSpy).toHaveBeenCalledWith('/some/directory');
    });

    test('should resolve file path', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      });
      
      const result = await fileHandler.resolveSingleInput('/file.css');
      
      expect(result).toEqual(['/file.css']);
    });

    test('should throw error for non-existent path', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      
      await expect(fileHandler.resolveSingleInput('/nonexistent'))
        .rejects.toThrow('Path not found: /nonexistent');
    });

    test('should return empty array for non-file, non-directory', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => false
      });
      
      const result = await fileHandler.resolveSingleInput('/special');
      
      expect(result).toEqual([]);
    });
  });

  describe('isGlobPattern', () => {
    test('should identify glob patterns correctly', () => {
      expect(fileHandler.isGlobPattern('**/*.css')).toBe(true);
      expect(fileHandler.isGlobPattern('src/**/*.js')).toBe(true);
      expect(fileHandler.isGlobPattern('test?')).toBe(true);
      expect(fileHandler.isGlobPattern('file[1-3].css')).toBe(true);
    });

    test('should reject non-glob patterns', () => {
      expect(fileHandler.isGlobPattern('style.css')).toBe(false);
      expect(fileHandler.isGlobPattern('/path/to/file')).toBe(false);
      expect(fileHandler.isGlobPattern('file-name.css')).toBe(false);
    });
  });

  describe('resolveGlobPattern', () => {
    test('should throw error for dangerous patterns', () => {
      const dangerousPatterns = [
        '../../etc/passwd',
        '~/.ssh/id_rsa',
        '../secret/file.css'
      ];

      dangerousPatterns.forEach(pattern => {
        expect(() => fileHandler.resolveGlobPattern(pattern))
          .toThrow('Dangerous path pattern detected');
      });
    });

    test('should resolve glob pattern with validation', async () => {
      const mockFiles = ['/safe/file1.css', '/safe/file2.css', '/safe/file.js'];
      mockGlob.glob.mockResolvedValue(mockFiles);
      
      // Mock SecurityUtils.validatePath to pass all files
      const { SecurityUtils } = await import('../security.js');
      jest.spyOn(SecurityUtils, 'validatePath').mockImplementation(path => path);
      
      const result = await fileHandler.resolveGlobPattern('**/*.css');
      
      expect(result).toEqual(['/safe/file1.css', '/safe/file2.css']);
      expect(mockGlob.glob).toHaveBeenCalledWith('**/*.css', {
        cwd: process.cwd(),
        absolute: true,
        ignore: fileHandler.options.excludePatterns,
        nodir: true
      });
    });

    test('should handle validation errors gracefully', async () => {
      const mockFiles = ['/safe/file1.css', '/dangerous/file2.css'];
      mockGlob.glob.mockResolvedValue(mockFiles);
      
      // Mock SecurityUtils.validatePath to reject dangerous file
      const { SecurityUtils } = await import('../security.js');
      jest.spyOn(SecurityUtils, 'validatePath')
        .mockImplementationOnce(path => path)
        .mockImplementationOnce(() => { throw new Error('Dangerous path'); });
      
      console.warn = jest.fn();
      
      const result = await fileHandler.resolveGlobPattern('**/*.css');
      
      expect(result).toEqual(['/safe/file1.css']);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping file from glob')
      );
    });
  });

  describe('discoverCSSFiles', () => {
    test('should discover CSS files in directory', async () => {
      const mockFiles = ['/dir/file1.css', '/dir/subdir/file2.css'];
      mockGlob.glob.mockResolvedValue(mockFiles);
      
      const result = await fileHandler.discoverCSSFiles('/dir');
      
      expect(result).toEqual(mockFiles);
      expect(mockGlob.glob).toHaveBeenCalledWith('/dir/**/*.css', {
        absolute: true,
        ignore: fileHandler.options.excludePatterns,
        nodir: true
      });
    });
  });

  describe('validateFiles', () => {
    const mockFiles = ['/valid1.css', '/valid2.css', '/invalid.css', '/dangerous.css'];

    beforeEach(() => {
      // Mock SecurityUtils.validatePath
      const { SecurityUtils } = await import('../security.js');
      jest.spyOn(SecurityUtils, 'validatePath')
        .mockImplementation(path => {
          if (path.includes('dangerous')) {
            throw new Error('Dangerous path');
          }
          return path;
        });
    });

    test('should validate files and return only valid ones', async () => {
      mockFs.pathExists.mockImplementation(path => 
        Promise.resolve(!path.includes('invalid'))
      );
      
      mockFs.stat.mockImplementation(path => {
        if (path.includes('invalid')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve({
          isFile: () => true,
          size: 1024
        });
      });
      
      mockFs.access.mockResolvedValue();
      
      console.warn = jest.fn();
      
      const result = await fileHandler.validateFiles(mockFiles);
      
      expect(result).toEqual(['/valid1.css', '/valid2.css']);
      expect(console.warn).toHaveBeenCalledTimes(2); // invalid and dangerous files
    });

    test('should skip files with invalid extensions', async () => {
      const filesWithExtensions = ['/valid.css', '/invalid.js', '/valid2.css'];
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      });
      mockFs.access.mockResolvedValue();
      
      console.warn = jest.fn();
      
      const result = await fileHandler.validateFiles(filesWithExtensions);
      
      expect(result).toEqual(['/valid.css', '/valid2.css']);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file type')
      );
    });

    test('should skip files that are too large', async () => {
      const largeFile = '/large.css';
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockImplementation(path => {
        if (path === largeFile) {
          return Promise.resolve({
            isFile: () => true,
            size: 20 * 1024 * 1024 // 20MB
          });
        }
        return Promise.resolve({
          isFile: () => true,
          size: 1024
        });
      });
      mockFs.access.mockResolvedValue();
      
      console.warn = jest.fn();
      
      const result = await fileHandler.validateFiles(['/valid.css', largeFile]);
      
      expect(result).toEqual(['/valid.css']);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('File too large')
      );
    });

    test('should skip files without read permissions', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      });
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      
      console.warn = jest.fn();
      
      const result = await fileHandler.validateFiles(['/no-permission.css']);
      
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No read permissions')
      );
    });

    test('should handle validation errors gracefully', async () => {
      mockFs.pathExists.mockImplementation(() => {
        throw new Error('Validation error');
      });
      
      console.error = jest.fn();
      
      const result = await fileHandler.validateFiles(['/error.css']);
      
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error validating')
      );
    });
  });

  describe('generateOutputPath', () => {
    test('should generate path with output directory', () => {
      const result = fileHandler.generateOutputPath('/input/style.css', {
        outputDir: '/output'
      });
      
      expect(result).toBe('/output/style.css');
    });

    test('should generate path with suffix', () => {
      const result = fileHandler.generateOutputPath('/input/style.css', {
        suffix: '.min'
      });
      
      expect(result).toBe('/input/style.min.css');
    });

    test('should generate default optimized path', () => {
      const result = fileHandler.generateOutputPath('/input/style.css');
      
      expect(result).toBe('/input/style.optimized.css');
    });

    test('should handle complex file paths', () => {
      const result = fileHandler.generateOutputPath('/very/complex/path/to/file-name.css', {
        suffix: '.processed'
      });
      
      expect(result).toBe('/very/complex/path/to/file-name.processed.css');
    });
  });

  describe('createBackup', () => {
    test('should create backup file', async () => {
      mockFs.copy.mockResolvedValue();
      
      const result = await fileHandler.createBackup('/original/style.css');
      
      expect(result).toBe('/original/style.backup.css');
      expect(mockFs.copy).toHaveBeenCalledWith('/original/style.css', '/original/style.backup.css');
    });

    test('should throw error on backup failure', async () => {
      mockFs.copy.mockRejectedValue(new Error('Copy failed'));
      
      await expect(fileHandler.createBackup('/original/style.css'))
        .rejects.toThrow('Failed to create backup: Copy failed');
    });
  });

  describe('getFileInfo', () => {
    test('should return file info for existing file', async () => {
      const mockStats = {
        size: 2048,
        mtime: new Date('2023-01-01T00:00:00.000Z')
      };
      
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue('body { color: red; }');
      
      const result = await fileHandler.getFileInfo('/test/style.css');
      
      expect(result).toEqual({
        exists: true,
        size: 2048,
        modified: '2023-01-01T00:00:00.000Z',
        extension: '.css',
        path: '/test/style.css',
        file: '/test/style.css',
        lines: 1,
        lastModified: mockStats.mtime,
        encoding: 'utf8',
        readable: true
      });
    });

    test('should return error info for non-existent file', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));
      
      const result = await fileHandler.getFileInfo('/nonexistent.css');
      
      expect(result).toEqual({
        exists: false,
        size: 0,
        modified: null,
        extension: '.css',
        path: '/nonexistent.css',
        file: '/nonexistent.css',
        lines: 0,
        lastModified: null,
        encoding: 'utf8',
        readable: false,
        error: 'File not found'
      });
    });

    test('should handle read errors gracefully', async () => {
      const mockStats = {
        size: 2048,
        mtime: new Date()
      };
      
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockRejectedValue(new Error('Read error'));
      
      const result = await fileHandler.getFileInfo('/test/style.css');
      
      expect(result.exists).toBe(true);
      expect(result.readable).toBe(false);
      expect(result.error).toBe('Read error');
    });
  });

  describe('getBatchFileInfo', () => {
    test('should get info for multiple files', async () => {
      const files = ['/file1.css', '/file2.css'];
      const mockStats = {
        size: 1024,
        mtime: new Date()
      };
      
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue('test content');
      
      const result = await fileHandler.getBatchFileInfo(files);
      
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('/file1.css');
      expect(result[1].path).toBe('/file2.css');
      expect(mockFs.stat).toHaveBeenCalledTimes(2);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    test('should clean up temporary files', async () => {
      const tempFiles = ['/tmp/file1.tmp', '/tmp/file2.tmp'];
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.remove.mockResolvedValue();
      
      await fileHandler.cleanup(tempFiles);
      
      expect(mockFs.pathExists).toHaveBeenCalledTimes(2);
      expect(mockFs.remove).toHaveBeenCalledTimes(2);
      expect(mockFs.remove).toHaveBeenCalledWith('/tmp/file1.tmp');
      expect(mockFs.remove).toHaveBeenCalledWith('/tmp/file2.tmp');
    });

    test('should handle cleanup errors gracefully', async () => {
      const tempFiles = ['/tmp/file1.tmp', '/tmp/file2.tmp'];
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.remove.mockRejectedValueOnce(new Error('Remove failed'));
      mockFs.remove.mockResolvedValue(); // Second call succeeds
      
      console.warn = jest.fn();
      
      await fileHandler.cleanup(tempFiles);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not clean up /tmp/file1.tmp')
      );
    });

    test('should skip non-existent files', async () => {
      const tempFiles = ['/tmp/nonexistent.tmp'];
      
      mockFs.pathExists.mockResolvedValue(false);
      
      await fileHandler.cleanup(tempFiles);
      
      expect(mockFs.remove).not.toHaveBeenCalled();
    });
  });
});

describe('Convenience Functions', () => {
  let mockFileHandler;

  beforeEach(() => {
    mockFileHandler = {
      resolveFiles: jest.fn(),
      selectFilesInteractively: jest.fn()
    };
    
    jest.spyOn(FileHandler.prototype, 'constructor')
      .mockImplementation(() => mockFileHandler);
  });

  describe('resolveCSSFiles', () => {
    test('should create FileHandler and resolve files', async () => {
      const input = ['file1.css', 'file2.css'];
      const options = { maxFileSize: 5 * 1024 * 1024 };
      const expected = ['/resolved/file1.css', '/resolved/file2.css'];
      
      mockFileHandler.resolveFiles.mockResolvedValue(expected);
      
      const result = await resolveCSSFiles(input, options);
      
      expect(result).toBe(expected);
      expect(FileHandler).toHaveBeenCalledWith(options);
      expect(mockFileHandler.resolveFiles).toHaveBeenCalledWith(input);
    });
  });

  describe('selectCSSFilesInteractively', () => {
    test('should create FileHandler and select files interactively', async () => {
      const startPath = '/test';
      const options = { allowedExtensions: ['.css', '.scss'] };
      const expected = ['/selected/file1.css'];
      
      mockFileHandler.selectFilesInteractively.mockResolvedValue(expected);
      
      const result = await selectCSSFilesInteractively(startPath, options);
      
      expect(result).toBe(expected);
      expect(FileHandler).toHaveBeenCalledWith(options);
      expect(mockFileHandler.selectFilesInteractively).toHaveBeenCalledWith(startPath);
    });
  });
});

describe('Interactive File Selection', () => {
  let fileHandler;
  let mockReadline;

  beforeEach(() => {
    fileHandler = new FileHandler();
    
    mockReadline = {
      createInterface: jest.fn(() => ({
        question: jest.fn(),
        close: jest.fn()
      }))
    };
    
    // Mock dynamic import
    jest.mock('readline', () => ({
      createInterface: mockReadline.createInterface
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('selectFilesInteractively', () => {
    test('should handle no CSS files found', async () => {
      jest.spyOn(fileHandler, 'discoverCSSFiles').mockResolvedValue([]);
      
      console.log = jest.fn();
      
      const result = await fileHandler.selectFilesInteractively('/test');
      
      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No CSS files found')
      );
    });

    test('should handle user selecting "all" files', async () => {
      const cssFiles = ['/test/file1.css', '/test/file2.css'];
      
      jest.spyOn(fileHandler, 'discoverCSSFiles').mockResolvedValue(cssFiles);
      
      const mockInterface = {
        question: jest.fn((_, callback) => callback('all')),
        close: jest.fn()
      };
      
      mockReadline.createInterface.mockReturnValue(mockInterface);
      
      const result = await fileHandler.selectFilesInteractively('/test');
      
      expect(result).toBe(cssFiles);
      expect(mockInterface.close).toHaveBeenCalled();
    });

    test('should handle user selecting specific files', async () => {
      const cssFiles = ['/test/file1.css', '/test/file2.css', '/test/file3.css'];
      
      jest.spyOn(fileHandler, 'discoverCSSFiles').mockResolvedValue(cssFiles);
      
      const mockInterface = {
        question: jest.fn((_, callback) => callback('1,3')),
        close: jest.fn()
      };
      
      mockReadline.createInterface.mockReturnValue(mockInterface);
      
      const result = await fileHandler.selectFilesInteractively('/test');
      
      expect(result).toEqual(['/test/file1.css', '/test/file3.css']);
      expect(mockInterface.close).toHaveBeenCalled();
    });

    test('should handle invalid user input', async () => {
      const cssFiles = ['/test/file1.css', '/test/file2.css'];
      
      jest.spyOn(fileHandler, 'discoverCSSFiles').mockResolvedValue(cssFiles);
      
      const mockInterface = {
        question: jest.fn((_, callback) => callback('invalid,5,abc')),
        close: jest.fn()
      };
      
      mockReadline.createInterface.mockReturnValue(mockInterface);
      
      const result = await fileHandler.selectFilesInteractively('/test');
      
      expect(result).toEqual([]);
      expect(mockInterface.close).toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      jest.spyOn(fileHandler, 'discoverCSSFiles')
        .mockRejectedValue(new Error('Discovery error'));
      
      const mockInterface = {
        question: jest.fn(),
        close: jest.fn()
      };
      
      mockReadline.createInterface.mockReturnValue(mockInterface);
      
      await expect(fileHandler.selectFilesInteractively('/test'))
        .rejects.toThrow('Discovery error');
      
      expect(mockInterface.close).toHaveBeenCalled();
    });
  });
});