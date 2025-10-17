import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";
import { SecurityUtils } from "./security.js";

/**
 * Enhanced file handler with advanced path resolution and validation
 */
export class FileHandler {
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedExtensions: options.allowedExtensions || [".css"],
      excludePatterns: options.excludePatterns || [
        "node_modules/**",
        ".git/**",
        "dist/**",
        "build/**",
        ".cache/**",
        "**/*.backup.css",
        "**/*.optimized.css",
      ],
      includePatterns: options.includePatterns || [],
      ...options,
    };
  }

  /**
   * Resolve and validate CSS file paths from various input formats
   */
  async resolveFiles(input) {
    const files = [];

    if (Array.isArray(input)) {
      for (const item of input) {
        const resolved = await this.resolveSingleInput(item);
        files.push(...resolved);
      }
    } else {
      const resolved = await this.resolveSingleInput(input);
      files.push(...resolved);
    }

    // Remove duplicates and validate
    const uniqueFiles = [...new Set(files)];
    return await this.validateFiles(uniqueFiles);
  }

  /**
   * Resolve a single input (file, directory, or glob pattern)
   */
  async resolveSingleInput(input) {
    // Handle glob patterns
    if (this.isGlobPattern(input)) {
      return await this.resolveGlobPattern(input);
    }

    // Handle file paths
    const resolvedPath = path.resolve(input);

    if (!(await fs.pathExists(resolvedPath))) {
      throw new Error(`Path not found: ${input}`);
    }

    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      return await this.discoverCSSFiles(resolvedPath);
    } else if (stats.isFile()) {
      return [resolvedPath];
    }

    return [];
  }

  /**
   * Check if input is a glob pattern
   */
  isGlobPattern(input) {
    return input.includes("*") || input.includes("?") || input.includes("[");
  }

  /**
   * Resolve glob pattern with security validation
   */
  async resolveGlobPattern(pattern) {
    // Basic security check for glob patterns (allow wildcards but prevent traversal)
    if (pattern.includes("..") || pattern.includes("~")) {
      throw new Error(`Dangerous path pattern detected: ${pattern}`);
    }

    const files = await glob(pattern, {
      cwd: process.cwd(),
      absolute: true,
      ignore: this.options.excludePatterns,
      nodir: true,
    });

    // Validate each resolved file individually
    const validFiles = [];
    for (const file of files) {
      try {
        SecurityUtils.validatePath(file);
        if (
          this.options.allowedExtensions.includes(
            path.extname(file).toLowerCase(),
          )
        ) {
          validFiles.push(file);
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️ Skipping file from glob: ${file} - ${error.message}`,
          ),
        );
      }
    }

    return validFiles;
  }

  /**
   * Discover CSS files in directory recursively
   */
  async discoverCSSFiles(dirPath) {
    const cssPattern = path.join(dirPath, "**/*.css");

    return await glob(cssPattern, {
      absolute: true,
      ignore: this.options.excludePatterns,
      nodir: true,
    });
  }

  /**
   * Validate files for size, existence, and permissions
   */
  async validateFiles(files) {
    const validFiles = [];

    for (const file of files) {
      try {
        // Security validation
        try {
          SecurityUtils.validatePath(file);
        } catch (error) {
          console.warn(
            chalk.yellow(
              `⚠️ Skipping invalid path: ${file} - ${error.message}`,
            ),
          );
          continue;
        }

        // Check if file exists
        if (!(await fs.pathExists(file))) {
          console.warn(chalk.yellow(`⚠️ File not found: ${file}`));
          continue;
        }

        const stats = await fs.stat(file);

        // Check if it's actually a file
        if (!stats.isFile()) {
          console.warn(chalk.yellow(`⚠️ Not a file: ${file}`));
          continue;
        }

        // Check file extension
        const ext = path.extname(file).toLowerCase();
        if (!this.options.allowedExtensions.includes(ext)) {
          console.warn(chalk.yellow(`⚠️ Unsupported file type: ${file}`));
          continue;
        }

        // Check file size
        if (stats.size > this.options.maxFileSize) {
          console.warn(
            chalk.yellow(
              `⚠️ File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB): ${file}`,
            ),
          );
          continue;
        }

        // Check read permissions
        try {
          await fs.access(file, fs.constants.R_OK);
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ No read permissions: ${file}`));
          continue;
        }

        validFiles.push(file);
      } catch (error) {
        console.warn(
          chalk.red(`❌ Error validating ${file}: ${error.message}`),
        );
      }
    }

    return validFiles;
  }

  /**
   * Interactive file selection for CLI
   */
  async selectFilesInteractively(startPath = process.cwd()) {
    const { createInterface } = await import("readline");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log(chalk.blue.bold("🔍 Interactive CSS File Selection"));
      console.log(chalk.blue("=".repeat(40)));

      // Discover CSS files
      const cssFiles = await this.discoverCSSFiles(startPath);

      if (cssFiles.length === 0) {
        console.log(
          chalk.yellow("⚠️ No CSS files found in current directory."),
        );
        return [];
      }

      console.log(chalk.green(`Found ${cssFiles.length} CSS files:\n`));

      // Display files with numbers
      cssFiles.forEach((file, index) => {
        const relativePath = path.relative(startPath, file);
        const stats = fs.statSync(file);
        const size = (stats.size / 1024).toFixed(2);
        console.log(
          chalk.gray(
            `${(index + 1).toString().padStart(2)}. ${relativePath} (${size}KB)`,
          ),
        );
      });

      console.log("\n" + chalk.blue("Select files to optimize:"));
      console.log(
        chalk.gray(
          'Enter numbers separated by commas (e.g., 1,3,5) or "all" for all files',
        ),
      );

      const answer = await new Promise((resolve) => {
        rl.question(chalk.cyan("> "), resolve);
      });

      rl.close();

      if (answer.toLowerCase().trim() === "all") {
        return cssFiles;
      }

      // Parse selected numbers
      const selectedNumbers = answer
        .split(",")
        .map((n) => parseInt(n.trim()))
        .filter((n) => !isNaN(n) && n > 0 && n <= cssFiles.length);

      return selectedNumbers.map((n) => cssFiles[n - 1]);
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  /**
   * Generate output path based on input and options
   */
  generateOutputPath(inputPath, options = {}) {
    const parsedPath = path.parse(inputPath);

    if (options.outputDir) {
      return path.join(options.outputDir, parsedPath.base);
    }

    if (options.suffix) {
      return path.join(
        parsedPath.dir,
        `${parsedPath.name}${options.suffix}${parsedPath.ext}`,
      );
    }

    // Default: add .optimized suffix
    return path.join(
      parsedPath.dir,
      `${parsedPath.name}.optimized${parsedPath.ext}`,
    );
  }

  /**
   * Create backup of original file
   */
  async createBackup(filePath) {
    const parsedPath = path.parse(filePath);
    const backupPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}.backup${parsedPath.ext}`,
    );

    try {
      await fs.copy(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Get file information for reporting
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf8");
      const extension = path.extname(filePath);

      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension: extension,
        path: filePath,
        file: filePath,
        lines: content.split("\n").length,
        lastModified: stats.mtime,
        encoding: "utf8",
        readable: true,
      };
    } catch (error) {
      const extension = path.extname(filePath);

      return {
        exists: false,
        size: 0,
        modified: null,
        extension: extension,
        path: filePath,
        file: filePath,
        lines: 0,
        lastModified: null,
        encoding: "utf8",
        readable: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch file information for multiple files
   */
  async getBatchFileInfo(files) {
    const info = [];

    for (const file of files) {
      const fileInfo = await this.getFileInfo(file);
      info.push(fileInfo);
    }

    return info;
  }

  /**
   * Clean up temporary files and backups
   */
  async cleanup(tempFiles = []) {
    for (const file of tempFiles) {
      try {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
        }
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️ Could not clean up ${file}: ${error.message}`),
        );
      }
    }
  }
}

/**
 * Convenience function for quick file resolution
 */
export async function resolveCSSFiles(input, options = {}) {
  const handler = new FileHandler(options);
  return await handler.resolveFiles(input);
}

/**
 * Convenience function for interactive file selection
 */
export async function selectCSSFilesInteractively(startPath, options = {}) {
  const handler = new FileHandler(options);
  return await handler.selectFilesInteractively(startPath);
}

export default FileHandler;
