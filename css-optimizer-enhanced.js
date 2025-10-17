#!/usr/bin/env node

import { EnhancedCSSOptimizer } from "./enhanced-optimizer.js";
import chalk from "chalk";
import path from "path";

/**
 * Simple CLI wrapper for the enhanced CSS optimizer
 * This provides an easy way to use the new file handling capabilities
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const optimizer = new EnhancedCSSOptimizer({
    createBackup: !args.includes("--no-backup"),
    enableAI: !args.includes("--no-ai"),
    enableMinification: args.includes("--minify") || args.includes("-m"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    analyze: args.includes("--analyze") || args.includes("-a"),
  });

  try {
    let result;

    if (args.includes("--interactive") || args.includes("-i")) {
      // Interactive mode
      result = await optimizer.optimizeInteractive();
    } else if (args.includes("--batch") || args.includes("-b")) {
      // Batch mode - get pattern from args
      const patternIndex = args.findIndex(
        (arg) => arg === "--batch" || arg === "-b",
      );
      const pattern = args[patternIndex + 1] || "*.css";

      result = await optimizer.optimizeBatch(pattern, {
        concurrency: parseInt(
          args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ||
            "4",
        ),
        createBackup: !args.includes("--no-backup"),
        minify: args.includes("--minify") || args.includes("-m"),
        verbose: args.includes("--verbose") || args.includes("-v"),
        enableAI: !args.includes("--no-ai"),
      });
    } else {
      // Direct file/path optimization
      const inputPath = args[0];
      const outputPath = args.includes("--output")
        ? args[args.indexOf("--output") + 1]
        : null;

      result = await optimizer.optimizeFromPath(inputPath, outputPath);
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(chalk.blue.bold("🎨 Enhanced CSS Optimizer CLI"));
  console.log(chalk.blue("=".repeat(40)));
  console.log();
  console.log(chalk.yellow("USAGE:"));
  console.log("  node css-optimizer-enhanced.js <input> [options]");
  console.log("  node css-optimizer-enhanced.js --interactive [options]");
  console.log("  node css-optimizer-enhanced.js --batch <pattern> [options]");
  console.log();
  console.log(chalk.yellow("INPUTS:"));
  console.log("  <input>        CSS file, directory, or glob pattern");
  console.log(
    '  <pattern>      Glob pattern for batch mode (e.g., "**/*.css")',
  );
  console.log();
  console.log(chalk.yellow("OPTIONS:"));
  console.log("  -i, --interactive    Interactive file selection mode");
  console.log("  -b, --batch          Batch processing mode");
  console.log("  -m, --minify         Enable minification");
  console.log("  -a, --analyze        Analyze CSS and show statistics");
  console.log("  -v, --verbose        Enable verbose logging");
  console.log("      --output <path>  Output file or directory");
  console.log("      --no-backup      Skip creating backup files");
  console.log("      --no-ai          Disable AI-powered fixes");
  console.log(
    "      --concurrency <n> Number of files to process concurrently (batch mode)",
  );
  console.log("  -h, --help           Show this help message");
  console.log();
  console.log(chalk.yellow("EXAMPLES:"));
  console.log("  # Optimize a single file");
  console.log("  node css-optimizer-enhanced.js style.css");
  console.log();
  console.log("  # Optimize all CSS files in directory");
  console.log("  node css-optimizer-enhanced.js ./src/");
  console.log();
  console.log("  # Interactive file selection");
  console.log("  node css-optimizer-enhanced.js --interactive");
  console.log();
  console.log("  # Batch processing with glob pattern");
  console.log('  node css-optimizer-enhanced.js --batch "**/*.css"');
  console.log();
  console.log("  # Minify and analyze with verbose output");
  console.log(
    "  node css-optimizer-enhanced.js style.css --minify --analyze --verbose",
  );
  console.log();
  console.log(chalk.green("FEATURES:"));
  console.log("  ✅ Advanced file path resolution (files, dirs, globs)");
  console.log("  ✅ Interactive file selection");
  console.log("  ✅ Security validation and path traversal protection");
  console.log("  ✅ Batch processing with concurrency control");
  console.log("  ✅ Automatic backup creation");
  console.log("  ✅ Detailed progress reporting");
  console.log("  ✅ AI-powered CSS fixes (with GROQ_API_KEY)");
  console.log("  ✅ Integration with existing optimizer features");
}

// Run CLI
main().catch(console.error);
