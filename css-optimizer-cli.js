#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

import { performance } from "perf_hooks";
import { glob } from "glob";
import chokidar from "chokidar";
import dotenv from "dotenv";

// Import our optimizer functions
import { optimizeCssFile } from "./css-optimizer.js";
import { CLIEnhancer } from "./cli-enhancer.js";

// Load environment variables
dotenv.config({ override: true });

// CLI Program Setup
const program = new Command();

program
  .name("css-optimizer")
  .description("🎨 Advanced CSS optimizer with AI-powered fixes")
  .version("2.1.0");

// Global options
program
  .option("-v, --verbose", "Enable verbose logging")
  .option("--no-backup", "Skip creating backup file")
  .option("--no-cache", "Disable caching mechanism")
  .option("--minify", "Enable minification for production builds")
  .option("--analyze", "Analyze CSS and show detailed statistics")
  .option("--watch", "Watch files for changes and optimize automatically")
  .option("--ai", "Enable AI-powered fixes (requires GROQ_API_KEY)")
  .option("--no-ai", "Disable AI-powered fixes")
  .option("--config <path>", "Path to configuration file")
  .option("--output <path>", "Output file or directory")
  .option(
    "--concurrency <number>",
    "Number of files to process concurrently",
    "4",
  )
  .option("--exclude <pattern>", "Exclude files matching pattern")
  .option("--include <pattern>", "Include only files matching pattern")
  .option("--dry-run", "Show what would be optimized without making changes")
  .option(
    "--report <format>",
    "Generate report in format (json|html|text)",
    "text",
  );

// Main optimize command
program
  .argument("[files...]", "CSS files or directories to optimize")
  .description("Optimize CSS files and directories")
  .action(async (files, _options, command) => {
    try {
      const opts = command.opts();
      await handleOptimize(files, opts);
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Batch command for processing multiple files
program
  .command("batch")
  .argument("<pattern>", "Glob pattern for files to process")
  .description("Process multiple files using glob patterns")
  .option("--recursive", "Search recursively in subdirectories")
  .action(async (pattern, options) => {
    try {
      const opts = program.opts();
      await handleBatch(pattern, { ...opts, ...options });
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Watch command
program
  .command("watch")
  .argument("[files...]", "CSS files or directories to watch")
  .description("Watch files for changes and optimize automatically")
  .option("--debounce <ms>", "Debounce time in milliseconds", "300")
  .action(async (files, options) => {
    try {
      const opts = { ...program.opts(), ...options, watch: true };
      await handleWatch(files, opts);
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Init command for creating configuration
program
  .command("init")
  .description("Initialize configuration file")
  .option("-f, --force", "Overwrite existing configuration")
  .action(async (options) => {
    try {
      await handleInit(options);
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Analyze command
program
  .command("analyze")
  .argument("[files...]", "CSS files or directories to analyze")
  .description("Analyze CSS files without optimization")
  .action(async (files, options) => {
    try {
      const opts = {
        ...program.opts(),
        ...options,
        analyze: true,
        dryRun: true,
      };
      await handleOptimize(files, opts);
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Interactive wizard command
program
  .command("wizard")
  .description("Run interactive configuration wizard")
  .action(async () => {
    try {
      const cli = new CLIEnhancer();
      const config = await cli.runConfigurationWizard();

      if (config) {
        cli.showSuccess(
          "Configuration completed! Run 'css-optimizer' to start optimizing.",
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Main handlers
async function handleOptimize(files, options) {
  const startTime = performance.now();

  // Initialize CLI enhancer
  const cli = new CLIEnhancer({
    enableProgress: true,
    enableSpinner: true,
    showETA: true,
  });

  cli.clear();
  console.log(chalk.blue.bold("🚀 CSS Optimizer CLI v2.1.0"));

  // Resolve files
  const targetFiles = await resolveFiles(files, options);

  if (targetFiles.length === 0) {
    cli.showWarning("No CSS files found to optimize.");
    return;
  }

  console.log(chalk.blue(`📁 Found ${targetFiles.length} file(s) to optimize`));

  // Create progress bar for file processing
  const progressBar = cli.createProgressBar(targetFiles.length, {
    label: "Optimizing files",
    width: 30,
    showPercentage: true,
    showETA: true,
  });

  // Process files with progress tracking
  const results = [];
  for (let i = 0; i < targetFiles.length; i++) {
    const file = targetFiles[i];
    progressBar.update(i, `Processing ${path.basename(file)}`);

    try {
      const result = await optimizeSingleFile(file, options);
      results.push(result);

      if (options.verbose) {
        progressBar.update(i + 1, `✅ ${path.basename(file)}`);
      }
    } catch (error) {
      results.push({
        file,
        success: false,
        error: error.message,
        duration: 0,
      });

      if (options.verbose) {
        progressBar.update(i + 1, `❌ ${path.basename(file)}`);
      }
    }
  }

  progressBar.complete("All files processed!");

  // Generate enhanced report
  await generateEnhancedReport(results, options, cli);

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  cli.showSuccess(`Completed in ${duration}s`);
}

async function handleBatch(pattern, options) {
  const startTime = performance.now();

  const cli = new CLIEnhancer({
    enableProgress: true,
    enableSpinner: true,
    showETA: true,
  });

  console.log(chalk.blue.bold("🔍 Batch Processing"));

  // Build glob pattern
  const globPattern = options.recursive ? `**/${pattern}` : pattern;
  const files = await glob(globPattern, {
    cwd: process.cwd(),
    absolute: true,
    ignore: options.exclude ? [options.exclude] : [],
  });

  const cssFiles = files.filter(
    (file) =>
      file.endsWith(".css") &&
      (!options.include || file.match(options.include)),
  );

  if (cssFiles.length === 0) {
    cli.showWarning("No CSS files found matching pattern.");
    return;
  }

  console.log(
    chalk.blue(`📁 Found ${cssFiles.length} file(s) matching pattern`),
  );

  // Create multi-step progress for batch processing
  const steps = [
    "Discovering files",
    "Processing with concurrency",
    "Generating report",
  ];

  const multiStep = cli.createMultiStepProgress(steps, {
    label: "Batch Processing",
  });

  multiStep.nextStep(`Found ${cssFiles.length} files`);

  // Process files with concurrency control and progress
  const concurrency = parseInt(options.concurrency);
  const results = [];

  const progressBar = cli.createProgressBar(cssFiles.length, {
    label: "Processing files",
    width: 30,
    showPercentage: true,
  });

  for (let i = 0; i < cssFiles.length; i += concurrency) {
    const batch = cssFiles.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((file) =>
        optimizeSingleFile(file, options).catch((error) => ({
          file,
          success: false,
          error: error.message,
          duration: 0,
        })),
      ),
    );
    results.push(...batchResults);
    progressBar.update(Math.min(i + concurrency, cssFiles.length));
  }

  progressBar.complete("Batch processing complete");
  multiStep.nextStep();

  // Generate enhanced report
  await generateEnhancedReport(results, options, cli);
  multiStep.complete();

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  cli.showSuccess(`Batch processing completed in ${duration}s`);
}

async function handleWatch(files, options) {
  console.log(chalk.blue.bold("👀 Watching for changes..."));

  const targetFiles = await resolveFiles(files, options);

  if (targetFiles.length === 0) {
    console.log(chalk.yellow("⚠️  No CSS files found to watch."));
    return;
  }

  // Watch for changes
  const watcher = chokidar.watch(targetFiles, {
    ignored: options.exclude ? [options.exclude] : [],
    persistent: true,
    ignoreInitial: true,
  });

  const debounceTime = parseInt(options.debounce);
  let timeoutId;

  watcher.on("change", async (filePath) => {
    console.log(chalk.blue(`📝 File changed: ${filePath}`));

    // Debounce rapid changes
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        console.log(chalk.blue("⚡ Optimizing..."));
        const results = await processFiles([filePath], options);

        if (results.length > 0 && results[0].success) {
          console.log(chalk.green(`✅ Optimized: ${filePath}`));
        } else {
          console.log(chalk.red(`❌ Failed to optimize: ${filePath}`));
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Error optimizing ${filePath}:`),
          error.message,
        );
      }
    }, debounceTime);
  });

  watcher.on("add", (filePath) => {
    console.log(chalk.green(`➕ New file: ${filePath}`));
  });

  watcher.on("unlink", (filePath) => {
    console.log(chalk.red(`➖ File removed: ${filePath}`));
  });

  console.log(chalk.green("🎯 Watching files. Press Ctrl+C to stop."));

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log(chalk.blue("\n🛑 Shutting down watcher..."));
    await watcher.close();
    console.log(chalk.green("👋 Goodbye!"));
    process.exit(0);
  });
}

async function handleInit(options) {
  const cli = new CLIEnhancer();

  // Check if interactive mode is available
  if (process.stdin.isTTY && !options.force) {
    // Run interactive configuration wizard
    const config = await cli.runConfigurationWizard();

    if (!config) {
      return; // User cancelled
    }

    const configPath = options.config || "css-optimizer.config.js";
    const configContent = `/** @type {import('./css-optimizer-cli.js').OptimizerConfig} */
export default ${JSON.stringify(config, null, 2)};
`;

    await fs.writeFile(configPath, configContent);
    cli.showSuccess(`Configuration file created: ${configPath}`);
    cli.showInfo("Edit the file to customize your optimization settings.");
  } else {
    // Fallback to default configuration
    const configPath = options.config || "css-optimizer.config.js";

    if (fs.existsSync(configPath) && !options.force) {
      cli.showWarning(`Configuration file already exists: ${configPath}`);
      cli.showInfo("Use --force to overwrite.");
      return;
    }

    const defaultConfig = `/** @type {import('./css-optimizer-cli.js').OptimizerConfig} */
export default {
  // Input files or directories
  input: ['src/**/*.css', 'public/**/*.css'],
  
  // Output directory
  output: 'dist/',
  
  // Processing options
  options: {
    // Enable AI-powered fixes
    ai: true,
    
    // Create backup files
    backup: true,
    
    // Enable minification
    minify: false,
    
    // Enable verbose logging
    verbose: false,
    
    // Concurrency level
    concurrency: 4,
    
    // File patterns
    include: null, // Include only files matching this pattern
    exclude: ['node_modules/**', '.git/**'], // Exclude files matching this pattern
    
    // Report format
    report: 'text', // 'text' | 'json' | 'html'
    
    // Custom PostCSS plugins
    postcss: {
      plugins: []
    },
    
    // Browser targets for autoprefixer
    browsers: ['> 1%', 'last 2 versions', 'not dead'],
    
    // AI settings
    ai: {
      maxErrors: 5,
      temperature: 0.1,
      maxTokens: 1000
    }
  }
};
`;

    await fs.writeFile(configPath, defaultConfig);
    cli.showSuccess(`Configuration file created: ${configPath}`);
    cli.showInfo("Edit the file to customize your optimization settings.");
  }
}

// Helper functions
async function resolveFiles(files, options) {
  if (!files || files.length === 0) {
    // Default to current directory
    files = ["."];
  }

  const allFiles = [];

  for (const file of files) {
    const resolvedPath = path.resolve(file);

    if (await fs.pathExists(resolvedPath)) {
      const stats = await fs.stat(resolvedPath);

      if (stats.isDirectory()) {
        // Find all CSS files in directory
        const dirFiles = await glob("**/*.css", {
          cwd: resolvedPath,
          absolute: true,
          ignore: options.exclude
            ? [options.exclude]
            : ["node_modules/**", ".git/**"],
        });
        allFiles.push(...dirFiles);
      } else if (resolvedPath.endsWith(".css")) {
        allFiles.push(resolvedPath);
      }
    }
  }

  // Apply include filter if specified
  if (options.include) {
    return allFiles.filter((file) => file.match(options.include));
  }

  return allFiles;
}

async function processFiles(files, options) {
  const results = [];

  for (const file of files) {
    try {
      const result = await optimizeSingleFile(file, options);
      results.push(result);

      if (options.verbose) {
        console.log(chalk.blue(`📄 Processed: ${file}`));
      }
    } catch (error) {
      results.push({
        file,
        success: false,
        error: error.message,
        duration: 0,
      });

      if (options.verbose) {
        console.error(chalk.red(`❌ Failed: ${file}`), error.message);
      }
    }
  }

  return results;
}

async function processFilesWithConcurrency(files, options) {
  const concurrency = parseInt(options.concurrency);
  const results = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((file) =>
        optimizeSingleFile(file, options).catch((error) => ({
          file,
          success: false,
          error: error.message,
          duration: 0,
        })),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}

async function optimizeSingleFile(filePath, options) {
  const startTime = performance.now();

  if (options.dryRun) {
    // Just analyze without making changes
    const stats = await fs.stat(filePath);
    return {
      file: filePath,
      success: true,
      originalSize: stats.size,
      optimizedSize: stats.size,
      compression: 0,
      duration: 0,
      fixes: [],
      dryRun: true,
    };
  }

  // Use the existing optimizer
  const result = await optimizeCssFile(filePath, {
    outputPath: options.output,
    createBackup: options.backup,
    enableAI: options.ai !== false,
    enableMinification: options.minify,
    verbose: options.verbose,
  });

  const endTime = performance.now();
  const duration = endTime - startTime;

  return {
    file: filePath,
    success: true,
    ...result,
    duration,
  };
}

async function generateReport(results, options) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(chalk.blue.bold("\n📊 Optimization Report"));
  console.log(chalk.blue("=".repeat(50)));

  if (successful.length > 0) {
    const totalOriginal = successful.reduce(
      (sum, r) => sum + (r.originalSize || 0),
      0,
    );
    const totalOptimized = successful.reduce(
      (sum, r) => sum + (r.optimizedSize || 0),
      0,
    );
    const totalCompression =
      totalOriginal > 0
        ? (((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(1)
        : 0;

    console.log(
      chalk.green(`✅ Successfully optimized: ${successful.length} files`),
    );
    console.log(
      chalk.blue(
        `📏 Total size: ${formatBytes(totalOriginal)} → ${formatBytes(totalOptimized)}`,
      ),
    );
    console.log(chalk.blue(`🗜️  Compression: ${totalCompression}%`));

    if (options.verbose) {
      console.log(chalk.blue("\n📄 File details:"));
      successful.forEach((result) => {
        const compression =
          result.originalSize > 0
            ? (
                ((result.originalSize - result.optimizedSize) /
                  result.originalSize) *
                100
              ).toFixed(1)
            : 0;
        console.log(
          chalk.blue(
            `  ${result.file}: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${compression}%)`,
          ),
        );
      });
    }
  }

  if (failed.length > 0) {
    console.log(chalk.red(`❌ Failed: ${failed.length} files`));
    if (options.verbose) {
      failed.forEach((result) => {
        console.log(chalk.red(`  ${result.file}: ${result.error}`));
      });
    }
  }

  // Save detailed report if requested
  if (options.report && options.report !== "text") {
    await saveDetailedReport(results, options.report);
  }
}

async function generateEnhancedReport(results, options, cli) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(chalk.blue.bold("\n📊 Enhanced Optimization Report"));
  console.log(chalk.blue("=".repeat(50)));

  if (successful.length > 0) {
    const totalOriginal = successful.reduce(
      (sum, r) => sum + (r.originalSize || 0),
      0,
    );
    const totalOptimized = successful.reduce(
      (sum, r) => sum + (r.optimizedSize || 0),
      0,
    );
    const totalCompression =
      totalOriginal > 0
        ? (((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(1)
        : 0;
    const totalDuration = successful.reduce(
      (sum, r) => sum + (r.duration || 0),
      0,
    );

    // Create summary table
    const headers = ["Metric", "Value"];
    const rows = [
      ["Files Processed", successful.length.toString()],
      ["Total Original Size", formatBytes(totalOriginal)],
      ["Total Optimized Size", formatBytes(totalOptimized)],
      ["Compression Ratio", `${totalCompression}%`],
      ["Total Processing Time", `${totalDuration.toFixed(2)}ms`],
      [
        "Average Time per File",
        `${(totalDuration / successful.length).toFixed(2)}ms`,
      ],
    ];

    const summaryTable = cli.createTable(headers, rows, {
      maxWidth: 80,
      padding: 1,
    });
    console.log(summaryTable);

    // Show detailed file table if verbose
    if (options.verbose && successful.length > 0) {
      console.log(chalk.blue("\n📄 File Details:"));

      const fileHeaders = [
        "File",
        "Original",
        "Optimized",
        "Compression",
        "Time",
      ];
      const fileRows = successful.map((result) => {
        const compression =
          result.originalSize > 0
            ? (
                ((result.originalSize - result.optimizedSize) /
                  result.originalSize) *
                100
              ).toFixed(1)
            : 0;
        return [
          path.basename(result.file),
          formatBytes(result.originalSize),
          formatBytes(result.optimizedSize),
          `${compression}%`,
          `${(result.duration || 0).toFixed(2)}ms`,
        ];
      });

      const fileTable = cli.createTable(fileHeaders, fileRows, {
        maxWidth: 100,
        padding: 1,
      });
      console.log(fileTable);
    }

    // Show fixes if any
    const fixes = successful.flatMap((r) => r.fixes || []);
    if (fixes.length > 0) {
      console.log(chalk.blue("\n🔧 Applied Fixes:"));
      fixes.forEach((fix, index) => {
        console.log(chalk.green(`  ${index + 1}. ${fix}`));
      });
    }
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\n❌ Failed Files: ${failed.length}`));

    const errorHeaders = ["File", "Error"];
    const errorRows = failed.map((result) => [
      path.basename(result.file),
      result.error,
    ]);

    const errorTable = cli.createTable(errorHeaders, errorRows, {
      maxWidth: 100,
      padding: 1,
    });
    console.log(errorTable);
  }

  // Performance summary
  cli.showInfo(
    `Processing completed with ${successful.length} successful and ${failed.length} failed files`,
  );

  // Save detailed report if requested
  if (options.report && options.report !== "text") {
    await saveDetailedReport(results, options.report);
  }
}

async function saveDetailedReport(results, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `css-optimizer-report-${timestamp}.${format}`;

  if (format === "json") {
    await fs.writeFile(filename, JSON.stringify(results, null, 2));
    console.log(chalk.blue(`📄 Detailed report saved: ${filename}`));
  } else if (format === "html") {
    const html = generateHTMLReport(results);
    await fs.writeFile(filename, html);
    console.log(chalk.blue(`📄 HTML report saved: ${filename}`));
  }
}

function generateHTMLReport(results) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>CSS Optimizer Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>🎨 CSS Optimizer Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p class="success">✅ Successfully optimized: ${successful.length} files</p>
        <p class="error">❌ Failed: ${failed.length} files</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    ${
      successful.length > 0
        ? `
    <h2>Successful Optimizations</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Original Size</th>
            <th>Optimized Size</th>
            <th>Compression</th>
            <th>Duration</th>
        </tr>
        ${successful
          .map(
            (r) => `
        <tr>
            <td>${r.file}</td>
            <td>${formatBytes(r.originalSize)}</td>
            <td>${formatBytes(r.optimizedSize)}</td>
            <td>${(((r.originalSize - r.optimizedSize) / r.originalSize) * 100).toFixed(1)}%</td>
            <td>${r.duration.toFixed(2)}ms</td>
        </tr>
        `,
          )
          .join("")}
    </table>
    `
        : ""
    }
    
    ${
      failed.length > 0
        ? `
    <h2>Failed Optimizations</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Error</th>
        </tr>
        ${failed
          .map(
            (r) => `
        <tr>
            <td>${r.file}</td>
            <td class="error">${r.error}</td>
        </tr>
        `,
          )
          .join("")}
    </table>
    `
        : ""
    }
</body>
</html>
  `;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Parse command line arguments
program.parse();

// Export for testing
export {
  handleOptimize,
  handleBatch,
  handleWatch,
  handleInit,
  resolveFiles,
  processFiles,
  generateReport,
};
