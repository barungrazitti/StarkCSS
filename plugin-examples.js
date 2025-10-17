/**
 * Usage examples for Vite and Webpack plugins
 */

// ============================================================================
// VITE PLUGIN EXAMPLES
// ============================================================================

import { cssOptimizerPlugin, createCSSOptimizerPlugin } from "./vite-plugin.js";

// Example 1: Basic usage in vite.config.js
export const basicViteConfig = {
  plugins: [
    cssOptimizerPlugin({
      enable: true,
      minify: true,
    }),
  ],
};

// Example 2: Production-ready configuration
export const productionViteConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      preset: "production",
      purgeCSS: {
        content: ["index.html", "src/**/*.{js,ts,jsx,tsx}"],
        safelist: ["active", "show"],
      },
      criticalCSS: {
        html: ["index.html"],
        inline: true,
      },
      enableReporting: true,
      reportOutput: "./dist/css-optimization-report.html",
    }),
  ],
};

// Example 3: React-specific optimization
export const reactViteConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      preset: "react",
      minify: true,
      enableFrameworkOptimization: true,
    }),
  ],
};

// Example 4: Tailwind CSS optimization
export const tailwindViteConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      preset: "tailwind",
      purgeCSS: {
        content: [
          "./index.html",
          "./src/**/*.{js,ts,jsx,tsx}",
          "./public/index.html",
        ],
        safelist: [
          {
            pattern: /bg-(red|green|blue)-500/,
          },
        ],
      },
    }),
  ],
};

// Example 5: Custom configuration
export const customViteConfig = {
  plugins: [
    cssOptimizerPlugin({
      enable: true,
      minify: true,
      enablePurgeCSS: true,
      purgeCSS: {
        content: ["src/**/*.{html,js,ts,jsx,tsx}"],
        safelist: ["dark-mode", "mobile-menu"],
        variables: true,
      },
      enableCriticalCSS: true,
      criticalCSS: {
        html: ["src/index.html"],
        inline: false,
        minify: true,
      },
      enableFrameworkOptimization: true,
      framework: {
        type: "vue",
        detect: false,
      },
      enableReporting: true,
      reportOutput: "./reports/css-report.html",
      cache: true,
      concurrency: 8,
      applyInDev: false,
    }),
  ],
};

// ============================================================================
// WEBPACK PLUGIN EXAMPLES
// ============================================================================

import {
  CSSOptimizerWebpackPlugin,
  createCSSOptimizerPlugin,
} from "./webpack-plugin.js";

// Example 1: Basic usage in webpack.config.js
export const basicWebpackConfig = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CSSOptimizerWebpackPlugin({
      enable: true,
      minify: true,
    }),
  ],
};

// Example 2: Production-ready configuration
export const productionWebpackConfig = {
  mode: "production",
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "css/[name].[contenthash].css",
    }),
    createCSSOptimizerPlugin({
      preset: "production",
      purgeCSS: {
        content: ["src/**/*.{html,js,ts,jsx,tsx}"],
        safelist: ["active", "show"],
      },
      criticalCSS: {
        html: ["src/index.html"],
        inline: true,
      },
      enableReporting: true,
      reportOutput: "./dist/css-optimization-report.html",
    }),
  ],
};

// Example 3: Vue.js optimization
export const vueWebpackConfig = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        oneOf: [
          {
            resourceQuery: /module/,
            use: [
              "vue-style-loader",
              {
                loader: "css-loader",
                options: {
                  modules: true,
                },
              },
            ],
          },
          {
            use: ["vue-style-loader", "css-loader"],
          },
        ],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    createCSSOptimizerPlugin({
      preset: "vue",
      enableFrameworkOptimization: true,
      framework: {
        type: "vue",
        detect: false,
      },
    }),
  ],
};

// Example 4: Angular optimization
export const angularWebpackConfig = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    createCSSOptimizerPlugin({
      preset: "angular",
      enableFrameworkOptimization: true,
      framework: {
        type: "angular",
        detect: false,
      },
      include: /\.component\.css$/i, // Only optimize component CSS
    }),
  ],
};

// Example 5: Custom configuration with advanced options
export const customWebpackConfig = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        exclude: /node_modules/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          "postcss-loader",
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "styles/[name].[contenthash].css",
      chunkFilename: "styles/[id].[contenthash].css",
    }),
    new CSSOptimizerWebpackPlugin({
      enable: true,
      minify: true,
      enablePurgeCSS: true,
      purgeCSS: {
        content: [
          "src/**/*.html",
          "src/**/*.{js,ts,jsx,tsx}",
          "public/index.html",
        ],
        safelist: [/^bg-/, /^text-/, "active", "show", "hide"],
        variables: true,
      },
      enableCriticalCSS: true,
      criticalCSS: {
        html: ["src/index.html"],
        inline: true,
        minify: true,
      },
      enableFrameworkOptimization: true,
      framework: {
        type: "react",
        detect: true,
      },
      enableReporting: true,
      reportOutput: "./reports/css-optimization-report.html",
      cache: true,
      concurrency: 4,
      applyInDev: false,
      test: /\.css$/i,
      include: undefined,
      exclude: /node_modules/,
    }),
  ],
};

// ============================================================================
// CONFIGURATION TEMPLATES
// ============================================================================

/**
 * Development configuration template
 */
export const createDevConfig = (framework = null) => ({
  plugins: [
    createCSSOptimizerPlugin({
      preset: "development",
      ...(framework && { framework: { type: framework, detect: false } }),
    }),
  ],
});

/**
 * Production configuration template
 */
export const createProdConfig = (options = {}) => ({
  plugins: [
    createCSSOptimizerPlugin({
      preset: "production",
      purgeCSS: {
        content: ["src/**/*.{html,js,ts,jsx,tsx}", "public/index.html"],
        ...options.purgeCSS,
      },
      criticalCSS: {
        html: ["src/index.html"],
        ...options.criticalCSS,
      },
      enableReporting: true,
      reportOutput: options.reportOutput || "./dist/css-report.html",
      ...options,
    }),
  ],
});

/**
 * Framework-specific configuration template
 */
export const createFrameworkConfig = (framework, options = {}) => {
  const presetMap = {
    react: "react",
    vue: "vue",
    angular: "angular",
    tailwind: "tailwind",
  };

  return {
    plugins: [
      createCSSOptimizerPlugin({
        preset: presetMap[framework] || "basic",
        framework: {
          type: framework,
          detect: false,
        },
        ...options,
      }),
    ],
  };
};

// ============================================================================
// MIGRATION EXAMPLES
// ============================================================================

/**
 * Migrating from existing CSS optimization tools
 */

// Example: Migrating from PurgeCSS
export const migrateFromPurgeCSS = {
  // Before:
  // plugins: [
  //   new PurgeCSSPlugin({
  //     paths: glob.sync(`${PATHS.src}/**/*.{html,js,ts,jsx,tsx}`, { nodir: true }),
  //     defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
  //   }),
  // ],

  // After:
  plugins: [
    createCSSOptimizerPlugin({
      enablePurgeCSS: true,
      purgeCSS: {
        content: ["src/**/*.{html,js,ts,jsx,tsx}"],
        safelist: [],
        variables: true,
      },
      minify: true, // Additional minification
      enableFrameworkOptimization: true, // Framework-specific optimizations
    }),
  ],
};

// Example: Migrating from cssnano
export const migrateFromCssnano = {
  // Before:
  // plugins: [
  //   new MiniCssExtractPlugin(),
  //   new CssMinimizerPlugin(),
  // ],

  // After:
  plugins: [
    new MiniCssExtractPlugin(),
    createCSSOptimizerPlugin({
      minify: true, // Includes cssnano-like optimizations
      enablePurgeCSS: true, // Additional unused CSS removal
      enableFrameworkOptimization: true, // Framework-specific optimizations
    }),
  ],
};

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * Recommended configuration for different project types
 */

// Small to medium projects
export const smallProjectConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      preset: "basic",
      enableReporting: true,
    }),
  ],
};

// Large enterprise projects
export const enterpriseConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      preset: "production",
      enablePurgeCSS: true,
      purgeCSS: {
        content: [
          "src/**/*.{html,js,ts,jsx,tsx}",
          "public/**/*.html",
          "docs/**/*.md",
        ],
        safelist: [/^theme-/, /^brand-/, "debug"],
      },
      enableCriticalCSS: true,
      criticalCSS: {
        html: ["src/index.html", "src/app.html"],
        inline: true,
      },
      enableFrameworkOptimization: true,
      enableReporting: true,
      reportOutput: "./reports/css-optimization-report.html",
      cache: true,
      concurrency: 8,
    }),
  ],
};

// Component library projects
export const componentLibraryConfig = {
  plugins: [
    createCSSOptimizerPlugin({
      enable: true,
      minify: true,
      enablePurgeCSS: false, // Don't remove unused CSS in libraries
      enableFrameworkOptimization: true,
      enableReporting: true,
      reportOutput: "./docs/css-report.html",
    }),
  ],
};

export default {
  // Vite examples
  basicViteConfig,
  productionViteConfig,
  reactViteConfig,
  tailwindViteConfig,
  customViteConfig,

  // Webpack examples
  basicWebpackConfig,
  productionWebpackConfig,
  vueWebpackConfig,
  angularWebpackConfig,
  customWebpackConfig,

  // Templates
  createDevConfig,
  createProdConfig,
  createFrameworkConfig,

  // Migration examples
  migrateFromPurgeCSS,
  migrateFromCssnano,

  // Best practices
  smallProjectConfig,
  enterpriseConfig,
  componentLibraryConfig,
};
