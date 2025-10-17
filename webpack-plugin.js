import { optimizeCssFile } from "./css-optimizer.js";
import { SimplePurgeCSS } from "./simple-purgecss.js";
import { CriticalCSSExtractor } from "./critical-css-extractor.js";
import { FrameworkOptimizer } from "./framework-optimizer.js";
import { AdvancedReporter } from "./advanced-reporter.js";
import fs from "fs-extra";
import path from "path";
import { createHash } from "crypto";

/**
 * Webpack plugin for CSS optimization
 * Integrates the CSS Optimizer into Webpack's build process
 */
export class CSSOptimizerWebpackPlugin {
  constructor(options = {}) {
    this.defaultOptions = {
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

      // Webpack-specific options
      test: /\.css$/i,
      include: undefined,
      exclude: /node_modules/,

      ...options,
    };

    this.options = this.defaultOptions;
    this.cache = new Map();
    this.reporter = null;
    this.optimizationResults = [];
  }

  apply(compiler) {
    const pluginName = "CSSOptimizerWebpackPlugin";

    // Check if optimization should be enabled
    const shouldEnable =
      this.options.enable &&
      (compiler.options.mode === "production" || this.options.applyInDev);

    if (!shouldEnable) {
      return;
    }

    // Initialize plugin
    compiler.hooks.beforeCompile.tapAsync(pluginName, (params, callback) => {
      console.log("🚀 CSS Optimizer Webpack Plugin - Starting optimization...");

      // Initialize reporter if enabled
      if (this.options.enableReporting) {
        this.reporter = new AdvancedReporter({
          outputPath: this.options.reportOutput,
          verbose: this.options.verbose,
        });
      }

      // Initialize framework optimizer if enabled
      if (this.options.enableFrameworkOptimization) {
        this.initializeFrameworkOptimizer();
      }

      callback();
    });

    // Process CSS assets during emission
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      this.processCSSAssets(compilation)
        .then(() => callback())
        .catch(callback);
    });

    // Generate report after compilation
    compiler.hooks.afterEmit.tapAsync(pluginName, (compilation, callback) => {
      this.generateReport()
        .then(() => callback())
        .catch(callback);
    });
  }

  async initializeFrameworkOptimizer() {
    this.frameworkOptimizer = new FrameworkOptimizer({
      type: this.options.framework.type,
      detect: this.options.framework.detect,
    });

    if (this.options.framework.detect) {
      const detectedFramework = await this.frameworkOptimizer.detectFramework(
        process.cwd(),
      );
      if (detectedFramework) {
        console.log(`📦 Detected framework: ${detectedFramework}`);
        this.options.framework.type = detectedFramework;
      }
    }
  }

  async processCSSAssets(compilation) {
    const cssAssets = [];

    // Find all CSS assets
    for (const [filename, asset] of Object.entries(compilation.assets)) {
      if (this.shouldProcessFile(filename)) {
        cssAssets.push({
          filename,
          source: asset.source(),
          asset,
        });
      }
    }

    if (cssAssets.length === 0) {
      console.log("📄 No CSS files found for optimization");
      return;
    }

    console.log(`📁 Found ${cssAssets.length} CSS file(s) to optimize`);

    // Process CSS files concurrently
    const promises = cssAssets.map((cssAsset) =>
      this.optimizeCSSAsset(cssAsset, compilation),
    );

    const results = await Promise.all(promises);
    this.optimizationResults = results;

    // Log summary
    this.logOptimizationSummary(results);
  }

  shouldProcessFile(filename) {
    // Check if file matches test pattern
    if (!this.options.test.test(filename)) {
      return false;
    }

    // Check include pattern
    if (this.options.include && !this.options.include.test(filename)) {
      return false;
    }

    // Check exclude pattern
    if (this.options.exclude && this.options.exclude.test(filename)) {
      return false;
    }

    return true;
  }

  async optimizeCSSAsset(cssAsset, compilation) {
    const { filename, source, asset } = cssAsset;
    const startTime = Date.now();

    try {
      const result = await this.optimizeCSSFile(filename, source);

      // Update the asset with optimized CSS
      compilation.assets[filename] = {
        source: () => result.optimizedCode,
        size: () => result.optimizedCode.length,
      };

      console.log(`✅ Optimized ${filename}: ${result.compression}% reduction`);

      return {
        file: filename,
        success: true,
        ...result,
      };
    } catch (error) {
      console.error(`❌ Failed to optimize ${filename}:`, error.message);

      return {
        file: filename,
        success: false,
        error: error.message,
        originalSize: source.length,
        optimizedSize: source.length,
        compression: 0,
        steps: [],
        processingTime: Date.now() - startTime,
      };
    }
  }

  async optimizeCSSFile(fileName, cssContent) {
    const startTime = Date.now();
    let optimizedCode = cssContent;
    let originalSize = cssContent.length;
    let optimizationSteps = [];

    try {
      // Check cache first
      if (this.options.cache) {
        const contentHash = createHash("md5").update(cssContent).digest("hex");
        const cacheKey = `${fileName}-${contentHash}`;

        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          return {
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
        minify: this.options.minify,
        createBackup: false,
        verbose: false,
      });

      optimizedCode = basicResult.optimizedCode || optimizedCode;
      optimizationSteps.push("Basic optimization");

      // Step 2: Framework-specific optimization
      if (this.options.enableFrameworkOptimization && this.frameworkOptimizer) {
        const frameworkResult = await this.frameworkOptimizer.optimizeCSS(
          optimizedCode,
          {
            framework: this.options.framework.type,
            minify: this.options.minify,
          },
        );

        if (frameworkResult.optimizedCode) {
          optimizedCode = frameworkResult.optimizedCode;
          optimizationSteps.push("Framework optimization");
        }
      }

      // Step 3: PurgeCSS (unused CSS removal)
      if (
        this.options.enablePurgeCSS &&
        this.options.purgeCSS.content.length > 0
      ) {
        const purgeCSS = new SimplePurgeCSS({
          content: this.options.purgeCSS.content,
          css: [fileName], // Current file
          output: null, // Don't write to file, just get result
          safelist: this.options.purgeCSS.safelist,
          variables: this.options.purgeCSS.variables,
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
        this.options.enableCriticalCSS &&
        this.options.criticalCSS.inline &&
        this.options.criticalCSS.html.length > 0
      ) {
        const criticalExtractor = new CriticalCSSExtractor({
          html: this.options.criticalCSS.html,
          css: [fileName],
          inline: true,
          minify: this.options.criticalCSS.minify,
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
      if (this.options.cache) {
        const contentHash = createHash("md5").update(cssContent).digest("hex");
        const cacheKey = `${fileName}-${contentHash}`;
        this.cache.set(cacheKey, {
          code: optimizedCode,
          steps: optimizationSteps,
        });
      }

      return {
        optimizedCode,
        originalSize,
        optimizedSize,
        compression,
        steps: optimizationSteps,
        processingTime,
        fromCache: false,
      };
    } catch (error) {
      throw error;
    }
  }

  logOptimizationSummary(results) {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

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
  }

  async generateReport() {
    if (
      this.options.enableReporting &&
      this.reporter &&
      this.optimizationResults.length > 0
    ) {
      await this.reporter.generateReport(this.optimizationResults, {
        format: "html",
        includeRecommendations: true,
      });

      console.log(
        `📊 Optimization report generated: ${this.options.reportOutput}`,
      );
    }
  }
}

/**
 * Create a pre-configured Webpack plugin for common use cases
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

  return new CSSOptimizerWebpackPlugin(options);
}

export default CSSOptimizerWebpackPlugin;
