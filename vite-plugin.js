import { optimizeCssFile } from "./css-optimizer.js";
import { SimplePurgeCSS } from "./simple-purgecss.js";
import { CriticalCSSExtractor } from "./critical-css-extractor.js";
import { FrameworkOptimizer } from "./framework-optimizer.js";
import { AdvancedReporter } from "./advanced-reporter.js";
import fs from "fs-extra";
import path from "path";
import { createHash } from "crypto";

/**
 * Vite plugin for CSS optimization
 * Integrates the CSS Optimizer into Vite's build process
 */
export function cssOptimizerPlugin(options = {}) {
  const defaultOptions = {
    // Core optimization options
    enable: true,
    minify: true,
    createBackup: false,

    // Advanced features
    enablePurgeCSS: false,
    enableCriticalCSS: false,
    enableFrameworkOptimization: false,

    // PurgeCSS options
    purgeCSS: {
      content: [],
      css: [],
      safelist: [],
      variables: true,
    },

    // Critical CSS options
    criticalCSS: {
      html: [],
      inline: false,
      minify: true,
    },

    // Framework optimization
    framework: {
      type: null, // 'react', 'vue', 'angular', 'tailwind'
      detect: true,
    },

    // Reporting
    enableReporting: false,
    reportOutput: "./css-optimization-report.html",

    // Performance
    cache: true,
    concurrency: 4,

    // Development vs Production
    applyInDev: false,

    ...options,
  };

  let isProduction = false;
  let cache = new Map();
  let reporter = null;

  return {
    name: "css-optimizer",

    configResolved(config) {
      isProduction = config.command === "build" && config.isProduction;

      if (defaultOptions.enableReporting) {
        reporter = new AdvancedReporter({
          outputPath: defaultOptions.reportOutput,
          verbose: defaultOptions.verbose,
        });
      }
    },

    async buildStart() {
      if (
        !defaultOptions.enable ||
        (!isProduction && !defaultOptions.applyInDev)
      ) {
        return;
      }

      console.log("🚀 CSS Optimizer Vite Plugin - Starting optimization...");

      // Initialize framework optimizer if enabled
      if (defaultOptions.enableFrameworkOptimization) {
        const frameworkOptimizer = new FrameworkOptimizer({
          type: defaultOptions.framework.type,
          detect: defaultOptions.framework.detect,
        });

        const detectedFramework = await frameworkOptimizer.detectFramework(
          process.cwd(),
        );
        if (detectedFramework) {
          console.log(`📦 Detected framework: ${detectedFramework}`);
        }
      }
    },

    async generateBundle(options, bundle) {
      if (
        !defaultOptions.enable ||
        (!isProduction && !defaultOptions.applyInDev)
      ) {
        return;
      }

      const cssFiles = Object.keys(bundle).filter((fileName) =>
        fileName.endsWith(".css"),
      );

      if (cssFiles.length === 0) {
        console.log("📄 No CSS files found for optimization");
        return;
      }

      console.log(`📁 Found ${cssFiles.length} CSS file(s) to optimize`);

      const optimizationResults = [];

      // Process each CSS file
      for (const cssFile of cssFiles) {
        const cssAsset = bundle[cssFile];

        if (cssAsset.type !== "asset") {
          continue;
        }

        try {
          const result = await this.optimizeCSSFile(
            cssFile,
            cssAsset.source,
            defaultOptions,
          );
          optimizationResults.push(result);

          // Update the bundle with optimized CSS
          cssAsset.source = result.optimizedCode;

          console.log(
            `✅ Optimized ${cssFile}: ${result.compression}% reduction`,
          );
        } catch (error) {
          console.error(`❌ Failed to optimize ${cssFile}:`, error.message);
          optimizationResults.push({
            file: cssFile,
            success: false,
            error: error.message,
          });
        }
      }

      // Generate report if enabled
      if (defaultOptions.enableReporting && reporter) {
        await reporter.generateReport(optimizationResults, {
          format: "html",
          includeRecommendations: true,
        });

        console.log(
          `📊 Optimization report generated: ${defaultOptions.reportOutput}`,
        );
      }

      // Log summary
      const successful = optimizationResults.filter((r) => r.success);
      const failed = optimizationResults.filter((r) => !r.success);

      if (successful.length > 0) {
        const totalOriginalSize = successful.reduce(
          (sum, r) => sum + r.originalSize,
          0,
        );
        const totalOptimizedSize = successful.reduce(
          (sum, r) => sum + r.optimizedSize,
          0,
        );
        const totalCompression = (
          ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) *
          100
        ).toFixed(1);

        console.log(`\n📊 Optimization Summary:`);
        console.log(`   ✅ Successfully optimized: ${successful.length} files`);
        console.log(`   ❌ Failed: ${failed.length} files`);
        console.log(`   📏 Total size reduction: ${totalCompression}%`);
        console.log(
          `   📦 Original: ${(totalOriginalSize / 1024).toFixed(2)}KB → Optimized: ${(totalOptimizedSize / 1024).toFixed(2)}KB`,
        );
      }
    },

    async optimizeCSSFile(fileName, cssContent, options) {
      const startTime = Date.now();
      let optimizedCode = cssContent;
      let originalSize = cssContent.length;
      let optimizationSteps = [];

      try {
        // Check cache first
        if (options.cache) {
          const contentHash = createHash("md5")
            .update(cssContent)
            .digest("hex");
          const cacheKey = `${fileName}-${contentHash}`;

          if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            return {
              file: fileName,
              success: true,
              optimizedCode: cached.code,
              originalSize,
              optimizedSize: cached.code.length,
              compression: (
                ((originalSize - cached.code.length) / originalSize) *
                100
              ).toFixed(1),
              steps: cached.steps,
              processingTime: Date.now() - startTime,
              fromCache: true,
            };
          }
        }

        // Step 1: Basic optimization
        console.log(`   🔧 Optimizing ${fileName}...`);
        const basicResult = await optimizeCssFile(cssContent, {
          minify: options.minify,
          createBackup: false,
          verbose: false,
        });

        optimizedCode = basicResult.optimizedCode || optimizedCode;
        optimizationSteps.push("Basic optimization");

        // Step 2: Framework-specific optimization
        if (options.enableFrameworkOptimization) {
          const frameworkOptimizer = new FrameworkOptimizer({
            type: options.framework.type,
            detect: false, // Already detected in buildStart
          });

          const frameworkResult = await frameworkOptimizer.optimizeCSS(
            optimizedCode,
            {
              framework: options.framework.type,
              minify: options.minify,
            },
          );

          if (frameworkResult.optimizedCode) {
            optimizedCode = frameworkResult.optimizedCode;
            optimizationSteps.push("Framework optimization");
          }
        }

        // Step 3: PurgeCSS (unused CSS removal)
        if (options.enablePurgeCSS && options.purgeCSS.content.length > 0) {
          const purgeCSS = new SimplePurgeCSS({
            content: options.purgeCSS.content,
            css: [fileName], // Current file
            output: null, // Don't write to file, just get result
            safelist: options.purgeCSS.safelist,
            variables: options.purgeCSS.variables,
            verbose: false,
          });

          // Create temporary file for PurgeCSS
          const tempFile = `temp-${Date.now()}.css`;
          await fs.writeFile(tempFile, optimizedCode);

          try {
            const purgeResult = await purgeCSS.process();
            if (purgeResult.code) {
              optimizedCode = purgeResult.code;
              optimizationSteps.push("Unused CSS removal");
            }
          } finally {
            await fs.remove(tempFile);
          }
        }

        // Step 4: Critical CSS extraction (if inline is enabled)
        if (
          options.enableCriticalCSS &&
          options.criticalCSS.inline &&
          options.criticalCSS.html.length > 0
        ) {
          const criticalExtractor = new CriticalCSSExtractor({
            html: options.criticalCSS.html,
            css: [fileName],
            inline: true,
            minify: options.criticalCSS.minify,
            verbose: false,
          });

          // Create temporary file for critical CSS extraction
          const tempFile = `temp-critical-${Date.now()}.css`;
          await fs.writeFile(tempFile, optimizedCode);

          try {
            const criticalResult = await criticalExtractor.process();
            if (criticalResult.criticalCSS) {
              optimizedCode = criticalResult.criticalCSS;
              optimizationSteps.push("Critical CSS extraction");
            }
          } finally {
            await fs.remove(tempFile);
          }
        }

        const optimizedSize = optimizedCode.length;
        const compression = (
          ((originalSize - optimizedSize) / originalSize) *
          100
        ).toFixed(1);
        const processingTime = Date.now() - startTime;

        // Cache result
        if (options.cache) {
          const contentHash = createHash("md5")
            .update(cssContent)
            .digest("hex");
          const cacheKey = `${fileName}-${contentHash}`;
          cache.set(cacheKey, {
            code: optimizedCode,
            steps: optimizationSteps,
          });
        }

        return {
          file: fileName,
          success: true,
          optimizedCode,
          originalSize,
          optimizedSize,
          compression,
          steps: optimizationSteps,
          processingTime,
          fromCache: false,
        };
      } catch (error) {
        return {
          file: fileName,
          success: false,
          error: error.message,
          originalSize,
          optimizedSize: originalSize,
          compression: 0,
          steps: [],
          processingTime: Date.now() - startTime,
        };
      }
    },

    // Handle HMR in development
    handleHotUpdate({ file, modules, read }) {
      if (
        !defaultOptions.enable ||
        (!isProduction && !defaultOptions.applyInDev)
      ) {
        return;
      }

      if (file.endsWith(".css")) {
        console.log(`🔥 HMR: Optimizing updated CSS file ${file}`);

        // Invalidate cache for this file
        for (const [key] of cache) {
          if (key.startsWith(file)) {
            cache.delete(key);
          }
        }
      }
    },
  };
}

/**
 * Create a pre-configured Vite plugin for common use cases
 */
export function createCSSOptimizerPlugin(config = {}) {
  const presets = {
    // Basic optimization for most projects
    basic: {
      enable: true,
      minify: true,
      enablePurgeCSS: false,
      enableCriticalCSS: false,
      enableFrameworkOptimization: false,
      enableReporting: false,
    },

    // Full optimization for production
    production: {
      enable: true,
      minify: true,
      enablePurgeCSS: true,
      enableCriticalCSS: true,
      enableFrameworkOptimization: true,
      enableReporting: true,
      applyInDev: false,
    },

    // Development with optimization
    development: {
      enable: true,
      minify: false,
      enablePurgeCSS: false,
      enableCriticalCSS: false,
      enableFrameworkOptimization: true,
      enableReporting: false,
      applyInDev: true,
    },

    // Framework-specific optimizations
    react: {
      enable: true,
      minify: true,
      enableFrameworkOptimization: true,
      framework: {
        type: "react",
        detect: false,
      },
    },

    vue: {
      enable: true,
      minify: true,
      enableFrameworkOptimization: true,
      framework: {
        type: "vue",
        detect: false,
      },
    },

    angular: {
      enable: true,
      minify: true,
      enableFrameworkOptimization: true,
      framework: {
        type: "angular",
        detect: false,
      },
    },

    tailwind: {
      enable: true,
      minify: true,
      enablePurgeCSS: true,
      enableFrameworkOptimization: true,
      framework: {
        type: "tailwind",
        detect: false,
      },
    },
  };

  const preset = presets[config.preset] || {};
  const options = { ...preset, ...config };

  return cssOptimizerPlugin(options);
}

export default cssOptimizerPlugin;
