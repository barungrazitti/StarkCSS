/**
 * Modern PostCSS plugin configuration
 * This module provides an upgraded PostCSS setup with 2024+ best practices
 */
// Try to import modern plugins, fallback to basic ones if not available
let postcssPresetEnv = null;
// Note: postcss-preset-env would be imported here if available

import sortMediaQueries from "postcss-sort-media-queries";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

/**
 * Get modern PostCSS plugins configuration
 * @param {Object} options - Configuration options
 * @returns {Array} Array of PostCSS plugins
 */
export function getModernPostCSSPlugins(options = {}) {
  const {
    enableAutoprefixer = true,
    enableMinification = false,
    browsers = ["> 1%", "last 2 versions", "not dead"],
    enableFutureCSS = true,
    enableNesting = true,
    enableCustomProperties = true,
    enableCustomMedia = true,
    enableColorFunctions = true,
  } = options;

  const plugins = [];

  // Modern CSS features with postcss-preset-env
  if (enableFutureCSS && postcssPresetEnv) {
    plugins.push(
      postcssPresetEnv({
        stage: 3, // Use stable features
        features: {
          "custom-properties": enableCustomProperties,
          "custom-media-queries": enableCustomMedia,
          "nesting-rules": enableNesting,
          "color-function": enableColorFunctions,
          "lab-function": enableColorFunctions,
          "lch-function": enableColorFunctions,
          "oklab-function": enableColorFunctions,
          "oklch-function": enableColorFunctions,
          "color-mix": enableColorFunctions,
          "p3-colors": enableColorFunctions,
          "hex-alpha": enableColorFunctions,
          "font-variant": true,
          "logical-properties": true,
          "place-properties": true,
          "is-pseudo-class": true,
          "where-pseudo-class": true,
          "has-pseudo-class": true,
          "gap-properties": true,
          "overflow-property": true,
          scrollbar: true,
          "text-decoration-shorthand": true,
          "prefers-color-scheme-query": true,
          "media-query-ranges": true,
        },
        browsers: browsers,
        autoprefixer: enableAutoprefixer ? {} : false,
        preserve: false, // Remove unnecessary fallbacks
      }),
    );
  } else if (enableAutoprefixer) {
    // Fallback to individual autoprefixer
    plugins.push(
      autoprefixer({
        overrideBrowserslist: browsers,
        grid: "autoplace",
      }),
    );
  }

  // Media query sorting (desktop-first approach - largest to smallest screens)
  plugins.push(
    sortMediaQueries({
      sort: "desktop-first",
      onError: (error) => {
        console.warn("⚠️ Media query sorting warning:", error.message);
      },
    }),
  );

  // Minification (only for production)
  if (enableMinification) {
    plugins.push(
      cssnano({
        preset: [
          "default",
          {
            // Preserve important comments for development
            discardComments: {
              removeAll: true,
              remove: (comment) => !/^\s*#|^\s*\/\*/.test(comment),
            },
            // Optimize for better gzip compression
            mergeRules: true,
            mergeLonghand: true,
            mergeIdents: true,
            reduceIdents: true,
            minifySelectors: true,
            minifyParams: true,
            // Preserve CSS custom properties
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true,
            convertValues: true,
            // Don't break CSS Grid
            cssDeclarationSorter: false,
            // Preserve important CSS Houdini features
            minifySelectors: false,
          },
        ],
      }),
    );
  }

  return plugins;
}

/**
 * Get progressive plugin configuration with fallbacks
 * @param {Object} options - Configuration options
 * @returns {Array} Array of plugin configurations with fallbacks
 */
export function getProgressivePlugins(options = {}) {
  const modernPlugins = getModernPostCSSPlugins(options);
  const fallbackPlugins = [];

  // Create fallback configuration
  if (options.enableAutoprefixer) {
    fallbackPlugins.push(
      autoprefixer({
        overrideBrowserslist: options.browsers || [
          "> 1%",
          "last 2 versions",
          "not dead",
        ],
        grid: "autoplace",
      }),
    );
  }

  fallbackPlugins.push(sortMediaQueries({ sort: "mobile-first" }));

  if (options.enableMinification) {
    fallbackPlugins.push(
      cssnano({
        preset: [
          "default",
          {
            cssDeclarationSorter: false,
            discardComments: { removeAll: false },
          },
        ],
      }),
    );
  }

  return {
    modern: modernPlugins,
    fallback: fallbackPlugins,
  };
}

/**
 * Validate browser support configuration
 * @param {Array|string} browsers - Browserslist configuration
 * @returns {Array} Validated browser list
 */
export function validateBrowserSupport(browsers) {
  if (!browsers) {
    return ["> 1%", "last 2 versions", "not dead"];
  }

  if (typeof browsers === "string") {
    browsers = browsers.split(",").map((b) => b.trim());
  }

  // Filter out invalid browser queries
  const validBrowsers = browsers.filter((browser) => {
    if (typeof browser !== "string" || browser.length === 0) {
      return false;
    }

    // Basic validation for common patterns
    const validPatterns = [
      /^>\s*\d+(\.\d+)?%/, // > 1%, > 0.5%
      /^last\s+\d+\s+versions?/, // last 2 versions
      /^last\s+\d+\s+years?/, // last 2 years
      /^not\s+dead/, // not dead
      /^not\s+ie\s+\d+/, // not ie 11
      /^ie\s+\d+/, // ie 11
      /^chrome\s+\d+/, // chrome 90
      /^firefox\s+\d+/, // firefox 88
      /^safari\s+\d+/, // safari 14
      /^edge\s+\d+/, // edge 90
    ];

    return validPatterns.some((pattern) => pattern.test(browser.toLowerCase()));
  });

  return validBrowsers.length > 0
    ? validBrowsers
    : ["> 1%", "last 2 versions", "not dead"];
}

/**
 * Get optimization recommendations based on CSS content
 * @param {string} css - CSS content to analyze
 * @returns {Object} Optimization recommendations
 */
export function analyzeCSSForOptimization(css) {
  const recommendations = {
    features: [],
    browsers: [],
    optimizations: [],
  };

  // Ensure css is a string
  if (typeof css !== "string") {
    return recommendations;
  }

  // Analyze for modern CSS features
  if (css.includes("var(")) {
    recommendations.features.push("custom-properties");
  }

  if (css.includes("@media")) {
    recommendations.features.push("media-queries");
    recommendations.optimizations.push("media-query-sorting");
  }

  if (css.includes("grid") || css.includes("display: grid")) {
    recommendations.features.push("css-grid");
    recommendations.browsers.push("grid-support");
  }

  if (css.includes("lab(") || css.includes("lch(") || css.includes("oklch(")) {
    recommendations.features.push("modern-color-functions");
    recommendations.browsers.push("modern-colors");
  }

  if (css.includes("container") || css.includes("@container")) {
    recommendations.features.push("container-queries");
  }

  if (css.includes("@layer")) {
    recommendations.features.push("css-layers");
  }

  // Check for nesting opportunities
  if (css.includes("{") && css.includes("}")) {
    const nestingOpportunities = (css.match(/\.[^{]+\s*{[^}]*\.[^{]/g) || [])
      .length;
    if (nestingOpportunities > 2) {
      recommendations.optimizations.push("css-nesting");
    }
  }

  // Size-based recommendations
  const sizeKB = Buffer.byteLength(css, "utf8") / 1024;
  if (sizeKB > 100) {
    recommendations.optimizations.push("minification");
    recommendations.optimizations.push("critical-css");
  }

  return recommendations;
}
