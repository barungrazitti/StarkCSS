#!/usr/bin/env node

import { FileHandler } from "./file-handler.js";
import { optimizeCss } from "./css-optimizer.js";
import chalk from "chalk";
import path from "path";

/**
 * Enhanced CSS Optimizer with advanced file handling
 */
export class EnhancedCSSOptimizer {
  constructor(options = {}) {
    this.fileHandler = new FileHandler(options.fileHandler);
    this.options = {
      createBackup: true,
      enableAI: true,
      enableMinification: false,
      verbose: false,
      analyze: false,
      ...options,
    };
  }

  /**
   * Optimize CSS from file path input
   */
  async optimizeFromPath(inputPath, outputPath = null) {
    try {
      console.log(chalk.blue.bold("🚀 Enhanced CSS Optimizer"));
      console.log(chalk.blue("=".repeat(40)));

      // Resolve and validate input files
      const files = await this.fileHandler.resolveFiles(inputPath);

      if (files.length === 0) {
        console.log(chalk.yellow("⚠️ No valid CSS files found."));
        return { success: false, message: "No valid CSS files found" };
      }

      console.log(
        chalk.green(`📁 Found ${files.length} CSS file(s) to optimize`),
      );

      const results = [];

      for (const filePath of files) {
        console.log(
          chalk.blue(
            `\n📄 Processing: ${path.relative(process.cwd(), filePath)}`,
          ),
        );

        try {
          // Generate output path
          const output =
            outputPath ||
            this.fileHandler.generateOutputPath(filePath, {
              suffix: ".optimized",
            });

          // Create backup if requested
          let backupPath = null;
          if (this.options.createBackup) {
            backupPath = await this.fileHandler.createBackup(filePath);
            console.log(
              chalk.gray(`💾 Backup created: ${path.basename(backupPath)}`),
            );
          }

          // Get file info
          const fileInfo = await this.fileHandler.getFileInfo(filePath);
          console.log(
            chalk.gray(
              `📏 Size: ${(fileInfo.size / 1024).toFixed(2)}KB, Lines: ${fileInfo.lines}`,
            ),
          );

          // Optimize the CSS
          const result = await optimizeCss(filePath, output, {
            createBackup: false, // Already handled
            analyze: this.options.analyze,
            minify: this.options.enableMinification,
            verbose: this.options.verbose,
            enableAI: this.options.enableAI,
          });

          results.push({
            inputPath: filePath,
            outputPath: output,
            backupPath,
            fileInfo,
            result,
            success: true,
          });

          console.log(chalk.green(`✅ Optimized: ${path.basename(output)}`));
          console.log(
            chalk.gray(
              `🗜️ Size: ${(fileInfo.size / 1024).toFixed(2)}KB → ${(result.finalSize / 1024).toFixed(2)}KB (${result.compressionRatio.toFixed(1)}%)`,
            ),
          );
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to optimize ${filePath}: ${error.message}`),
          );

          results.push({
            inputPath: filePath,
            error: error.message,
            success: false,
          });
        }
      }

      // Generate summary report
      this.generateSummaryReport(results);

      return {
        success: true,
        results,
        totalFiles: files.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };
    } catch (error) {
      console.error(chalk.red(`❌ Optimization failed: ${error.message}`));
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive optimization mode
   */
  async optimizeInteractive() {
    try {
      console.log(chalk.blue.bold("🎯 Interactive CSS Optimization"));
      console.log(chalk.blue("=".repeat(40)));

      // Let user select files interactively
      const selectedFiles = await this.fileHandler.selectFilesInteractively();

      if (selectedFiles.length === 0) {
        console.log(chalk.yellow("⚠️ No files selected."));
        return { success: false, message: "No files selected" };
      }

      console.log(
        chalk.green(
          `\n📋 Selected ${selectedFiles.length} file(s) for optimization`,
        ),
      );

      // Proceed with optimization
      return await this.optimizeFromPath(selectedFiles);
    } catch (error) {
      console.error(
        chalk.red(`❌ Interactive optimization failed: ${error.message}`),
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch optimization with glob patterns
   */
  async optimizeBatch(pattern, options = {}) {
    try {
      console.log(chalk.blue.bold("🔍 Batch CSS Optimization"));
      console.log(chalk.blue(`Pattern: ${pattern}`));
      console.log(chalk.blue("=".repeat(40)));

      // Resolve files using glob pattern
      const files = await this.fileHandler.resolveGlobPattern(pattern);

      if (files.length === 0) {
        console.log(chalk.yellow("⚠️ No files found matching pattern."));
        return { success: false, message: "No files found" };
      }

      console.log(
        chalk.green(`📁 Found ${files.length} file(s) matching pattern`),
      );

      // Process files with concurrency control
      const concurrency = options.concurrency || 4;
      const results = [];

      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);

        console.log(
          chalk.blue(
            `\n🔄 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(files.length / concurrency)}`,
          ),
        );

        const batchPromises = batch.map(async (filePath) => {
          try {
            const output = this.fileHandler.generateOutputPath(filePath, {
              suffix: ".optimized",
            });

            const result = await optimizeCss(filePath, output, {
              createBackup: options.createBackup !== false,
              analyze: options.analyze || false,
              minify: options.minify || false,
              verbose: options.verbose || false,
              enableAI: options.enableAI !== false,
            });

            return {
              inputPath: filePath,
              outputPath: output,
              result,
              success: true,
            };
          } catch (error) {
            return {
              inputPath: filePath,
              error: error.message,
              success: false,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Show progress for this batch
        const successful = batchResults.filter((r) => r.success).length;
        console.log(
          chalk.green(
            `✅ Batch completed: ${successful}/${batch.length} files optimized`,
          ),
        );
      }

      // Generate summary report
      this.generateSummaryReport(results);

      return {
        success: true,
        results,
        totalFiles: files.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };
    } catch (error) {
      console.error(
        chalk.red(`❌ Batch optimization failed: ${error.message}`),
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(results) {
    console.log(chalk.blue.bold("\n📊 Optimization Summary"));
    console.log(chalk.blue("=".repeat(40)));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      const totalOriginalSize = successful.reduce(
        (sum, r) => sum + (r.fileInfo?.size || 0),
        0,
      );
      const totalFinalSize = successful.reduce(
        (sum, r) => sum + (r.result?.finalSize || 0),
        0,
      );
      const avgCompression =
        successful.length > 0
          ? successful.reduce(
              (sum, r) => sum + (r.result?.compressionRatio || 0),
              0,
            ) / successful.length
          : 0;

      console.log(
        chalk.green(`✅ Successfully optimized: ${successful.length} files`),
      );
      console.log(
        chalk.blue(
          `📏 Total size: ${this.formatBytes(totalOriginalSize)} → ${this.formatBytes(totalFinalSize)}`,
        ),
      );

      if (totalOriginalSize > 0) {
        const totalCompression =
          ((totalOriginalSize - totalFinalSize) / totalOriginalSize) * 100;
        console.log(
          chalk.blue(`🗜️ Total compression: ${totalCompression.toFixed(1)}%`),
        );
      }

      console.log(
        chalk.blue(`📊 Average compression: ${avgCompression.toFixed(1)}%`),
      );

      if (this.options.verbose) {
        console.log(chalk.blue("\n📄 Detailed results:"));
        successful.forEach((result, index) => {
          const compression = result.result?.compressionRatio || 0;
          console.log(
            chalk.gray(
              `  ${index + 1}. ${path.basename(result.inputPath)}: ${compression.toFixed(1)}% compression`,
            ),
          );
        });
      }
    }

    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${failed.length} files`));
      if (this.options.verbose) {
        failed.forEach((result) => {
          console.log(
            chalk.red(
              `  • ${path.basename(result.inputPath)}: ${result.error}`,
            ),
          );
        });
      }
    }

    console.log(chalk.green.bold("\n🎉 Optimization completed!"));
  }

  /**
   * Format bytes for human readable output
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

/**
 * Quick optimization function for simple use cases
 */
export async function optimizeCSSFile(inputPath, options = {}) {
  const optimizer = new EnhancedCSSOptimizer(options);
  return await optimizer.optimizeFromPath(inputPath, options.outputPath);
}

/**
 * Interactive optimization function
 */
export async function optimizeCSSInteractive(options = {}) {
  const optimizer = new EnhancedCSSOptimizer(options);
  return await optimizer.optimizeInteractive();
}

/**
 * Batch optimization function
 */
export async function optimizeCSSBatch(pattern, options = {}) {
  const optimizer = new EnhancedCSSOptimizer(options);
  return await optimizer.optimizeBatch(pattern, options);
}

export default EnhancedCSSOptimizer;
