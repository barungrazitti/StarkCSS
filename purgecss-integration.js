import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

/**
 * PurgeCSS integration for unused CSS removal
 * This module provides intelligent unused CSS detection and removal
 */

export class PurgeCSSIntegration {
  constructor(options = {}) {
    this.options = {
      // Content files to scan for CSS usage
      content: options.content || [
        "**/*.html",
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
        "**/*.vue",
        "**/*.svelte",
      ],

      // CSS files to process
      css: options.css || ["**/*.css"],

      // Output options
      output: options.output || null,

      // Safety options
      safelist: options.safelist || [],
      blocklist: options.blocklist || [],

      // Extraction options
      defaultExtractor: options.defaultExtractor || this.defaultExtractor,

      // Framework-specific extractors
      extractors: options.extractors || [],

      // Variables and keyframes preservation
      variables: options.variables !== false, // Default: preserve variables
      keyframes: options.keyframes !== false, // Default: preserve keyframes
      fontFace: options.fontFace !== false, // Default: preserve font-face

      // Advanced options
      rejected: options.rejected === true, // Show rejected CSS
      rejectedCss: options.rejectedCss === true, // Output rejected CSS to file

      ...options,
    };
  }

  /**
   * Default extractor for content files
   */
  defaultExtractor(content) {
    // Capture all potential CSS selectors
    const selectors = [];

    // Class selectors - more precise pattern
    const classMatches = content.match(/class=["'][^"']*["']/g) || [];
    classMatches.forEach((match) => {
      const classes = match.match(/class=["']([^"']*)["']/);
      if (classes && classes[1]) {
        selectors.push(
          ...classes[1].split(/\s+/).filter((cls) => cls.length > 0),
        );
      }
    });

    // Also catch className attributes in JSX
    const jsxMatches = content.match(/className=\{[^}]*\}/g) || [];
    jsxMatches.forEach((match) => {
      const classNames = match.match(/className=\{([^}]*)\}/);
      if (classNames && classNames[1]) {
        // Extract string literals from JSX expressions
        const strings = classNames[1].match(/["']([^"']*)["']/g) || [];
        strings.forEach((str) => {
          const cls = str.replace(/["']/g, "");
          selectors.push(...cls.split(/\s+/).filter((c) => c.length > 0));
        });
      }
    });

    // ID selectors
    const idMatches = content.match(/id=["'][^"']*["']/g) || [];
    idMatches.forEach((match) => {
      const ids = match.match(/id=["']([^"']*)["']/);
      if (ids && ids[1]) {
        selectors.push("#" + ids[1]);
      }
    });

    // Attribute selectors
    const attrMatches = content.match(/\[[^\]]+\]/g) || [];
    selectors.push(...attrMatches);

    // Element selectors (common HTML tags)
    const elementMatches =
      content.match(
        /\b(a|div|span|p|h[1-6]|ul|ol|li|img|button|input|form|section|article|nav|header|footer|main|aside|body|html)\b/g,
      ) || [];
    selectors.push(...elementMatches);

    // Pseudo-classes and pseudo-elements
    const pseudoMatches = content.match(/:[a-zA-Z-]+/g) || [];
    selectors.push(...pseudoMatches);

    return selectors;
  }

  /**
   * Extract selectors from content files
   */
  async extractUsedSelectors(contentFiles) {
    const usedSelectors = new Set();

    console.log(chalk.blue("🔍 Scanning content files for CSS usage..."));

    for (const pattern of contentFiles) {
      try {
        const files = await glob(pattern, {
          cwd: process.cwd(),
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
        });

        for (const file of files) {
          try {
            const content = await fs.readFile(file, "utf8");
            const selectors = this.defaultExtractor(content);

            selectors.forEach((selector) => {
              if (selector && selector.length > 0) {
                usedSelectors.add(selector);
              }
            });

            if (this.options.verbose) {
              console.log(
                chalk.gray(
                  `   📄 Scanned: ${path.relative(process.cwd(), file)} (${selectors.length} selectors)`,
                ),
              );
            }
          } catch (error) {
            console.warn(
              chalk.yellow(`⚠️ Could not read ${file}: ${error.message}`),
            );
          }
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️ Could not resolve pattern ${pattern}: ${error.message}`,
          ),
        );
      }
    }

    console.log(
      chalk.green(
        `✅ Found ${usedSelectors.size} unique selectors in content files`,
      ),
    );
    return Array.from(usedSelectors);
  }

  /**
   * Parse CSS and extract selectors
   */
  parseCSSSelectors(css) {
    const selectors = new Set();

    // Simple regex-based selector extraction
    const selectorMatches = css.match(/([^{]+)\s*\{/g) || [];
    selectorMatches.forEach((match) => {
      const selector = match.replace(/\s*\{.*$/, "").trim();
      if (selector && !selector.startsWith("@")) {
        selectors.add(selector);
      }
    });

    return Array.from(selectors);
  }

  /**
   * Check if a selector should be preserved
   */
  shouldPreserveSelector(selector) {
    // Always preserve safelisted selectors
    if (this.options.safelist.includes(selector)) {
      return true;
    }

    // Check safelist with class/ID prefixes
    for (const safelistItem of this.options.safelist) {
      if (typeof safelistItem === "string") {
        if (
          selector === "." + safelistItem ||
          selector === "#" + safelistItem
        ) {
          return true;
        }
      } else if (safelistItem instanceof RegExp) {
        if (safelistItem.test(selector)) {
          return true;
        }
      }
    }

    // Always preserve CSS variables
    if (this.options.variables && selector.includes("--")) {
      return true;
    }

    // Preserve keyframe animations
    if (this.options.keyframes && selector.includes("@keyframes")) {
      return true;
    }

    // Preserve font-face
    if (this.options.fontFace && selector.includes("@font-face")) {
      return true;
    }

    // Preserve pseudo-elements that might be used dynamically
    if (
      selector.includes("::") &&
      ["::before", "::after", "::first-line", "::first-letter"].some((pseudo) =>
        selector.includes(pseudo),
      )
    ) {
      return true;
    }

    // Preserve :hover, :focus, :active states
    if (
      [":hover", ":focus", ":active", ":visited"].some((state) =>
        selector.includes(state),
      )
    ) {
      return true;
    }

    // Preserve responsive media queries
    if (selector.includes("@media")) {
      return true;
    }

    return false;
  }

  /**
   * Remove unused CSS from CSS content
   */
  async removeUnusedCSS(css, usedSelectors) {
    console.log(chalk.blue("🗑️ Removing unused CSS..."));

    const cssSelectors = this.parseCSSSelectors(css);
    const usedSet = new Set(usedSelectors);

    let removedCount = 0;
    let preservedCount = 0;
    const removedRules = [];

    // Split CSS into individual rules while preserving structure
    const rules = [];
    const lines = css.split("\n");
    let currentRule = [];
    let currentSelector = "";
    let braceCount = 0;
    let inRule = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Count braces to track rule boundaries
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (
        trimmedLine.includes("{") &&
        !trimmedLine.startsWith("@") &&
        braceCount === 1
      ) {
        // Start of a new selector rule
        if (currentRule.length > 0) {
          rules.push({
            selector: currentSelector,
            content: currentRule.join("\n"),
          });
        }

        currentSelector = trimmedLine.replace(/\s*\{.*$/, "").trim();
        currentRule = [line];
        inRule = true;
      } else if (braceCount === 0 && inRule) {
        // End of current rule
        currentRule.push(line);
        rules.push({
          selector: currentSelector,
          content: currentRule.join("\n"),
        });

        currentSelector = "";
        currentRule = [];
        inRule = false;
      } else {
        // Continue current rule or add non-rule content
        currentRule.push(line);
      }
    }

    // Add any remaining content
    if (currentRule.length > 0) {
      rules.push({
        selector: currentSelector || "non-rule",
        content: currentRule.join("\n"),
      });
    }

    // Process each rule
    const preservedRules = [];
    const rejectedSelectors = [];

    for (const rule of rules) {
      if (rule.selector === "non-rule") {
        // Always preserve non-rule content (comments, @import, etc.)
        preservedRules.push(rule.content);
      } else {
        // Check if selector should be preserved
        const isUsed =
          usedSet.has(rule.selector) ||
          usedSelectors.some((used) => {
            // Check for exact match with various forms
            if (rule.selector === used) return true;
            if (rule.selector === "." + used) return true;
            if (rule.selector === "#" + used) return true;

            // Handle compound selectors - be more precise
            const parts = rule.selector.split(/[\s>+~,]/).map((p) => p.trim());
            return parts.some(
              (part) =>
                part === "." + used || part === "#" + used || part === used,
            );
          }) ||
          this.shouldPreserveSelector(rule.selector);

        if (isUsed) {
          preservedRules.push(rule.content);
          preservedCount++;
        } else {
          removedRules.push(rule.content);
          rejectedSelectors.push(rule.selector);
          removedCount++;
        }
      }
    }

    // Rebuild CSS
    const optimizedCSS = preservedRules.join("\n\n").trim();

    console.log(chalk.green(`✅ Preserved ${preservedCount} used selectors`));
    console.log(chalk.yellow(`🗑️ Removed ${removedCount} unused selectors`));

    if (this.options.rejected && rejectedSelectors.length > 0) {
      console.log(chalk.blue("\n📋 Removed selectors:"));
      rejectedSelectors.slice(0, 10).forEach((selector) => {
        console.log(chalk.gray(`   • ${selector}`));
      });
      if (rejectedSelectors.length > 10) {
        console.log(
          chalk.gray(`   ... and ${rejectedSelectors.length - 10} more`),
        );
      }
    }

    // Save rejected CSS if requested
    if (this.options.rejectedCss && rejectedSelectors.length > 0) {
      const rejectedCSS = removedRules.join("\n\n");
      const rejectedPath = this.options.output
        ? path.join(path.dirname(this.options.output), "rejected.css")
        : "rejected.css";

      await fs.writeFile(rejectedPath, rejectedCSS);
      console.log(chalk.blue(`💾 Rejected CSS saved to: ${rejectedPath}`));
    }

    return {
      css: optimizedCSS,
      stats: {
        originalSelectors: cssSelectors.length,
        preservedSelectors: preservedCount,
        removedSelectors: removedCount,
        compressionRatio:
          css.length > 0
            ? ((css.length - optimizedCSS.length) / css.length) * 100
            : 0,
      },
      rejectedSelectors,
    };
  }

  /**
   * Process CSS files and remove unused CSS
   */
  async processFiles(cssFiles, contentFiles) {
    console.log(
      chalk.blue.bold("🧹 PurgeCSS Integration - Removing Unused CSS"),
    );
    console.log(chalk.blue("=".repeat(50)));

    // Extract used selectors from content files
    const usedSelectors = await this.extractUsedSelectors(contentFiles);

    const results = [];

    for (const cssFile of cssFiles) {
      try {
        console.log(
          chalk.blue(
            `\n📄 Processing: ${path.relative(process.cwd(), cssFile)}`,
          ),
        );

        // Read CSS file
        const css = await fs.readFile(cssFile, "utf8");
        const originalSize = css.length;

        // Remove unused CSS
        const result = await this.removeUnusedCSS(css, usedSelectors);

        // Generate output path
        const outputPath =
          this.options.output || cssFile.replace(/\.css$/, ".purged.css");

        // Write optimized CSS
        await fs.writeFile(outputPath, result.css);

        const finalSize = result.css.length;
        const compressionRatio =
          ((originalSize - finalSize) / originalSize) * 100;

        console.log(chalk.green(`✅ Processed: ${path.basename(outputPath)}`));
        console.log(
          chalk.gray(
            `📏 Size: ${(originalSize / 1024).toFixed(2)}KB → ${(finalSize / 1024).toFixed(2)}KB (${compressionRatio.toFixed(1)}% reduction)`,
          ),
        );
        console.log(
          chalk.gray(
            `🎯 Selectors: ${result.stats.originalSelectors} → ${result.stats.preservedSelectors} (${result.stats.removedSelectors} removed)`,
          ),
        );

        results.push({
          inputFile: cssFile,
          outputFile: outputPath,
          originalSize,
          finalSize,
          compressionRatio,
          stats: result.stats,
          success: true,
        });
      } catch (error) {
        console.error(
          chalk.red(`❌ Failed to process ${cssFile}: ${error.message}`),
        );
        results.push({
          inputFile: cssFile,
          error: error.message,
          success: false,
        });
      }
    }

    // Generate summary
    this.generateSummary(results);

    return results;
  }

  /**
   * Generate processing summary
   */
  generateSummary(results) {
    console.log(chalk.blue.bold("\n📊 PurgeCSS Summary"));
    console.log(chalk.blue("=".repeat(30)));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      const totalOriginal = successful.reduce(
        (sum, r) => sum + r.originalSize,
        0,
      );
      const totalFinal = successful.reduce((sum, r) => sum + r.finalSize, 0);
      const totalRemoved = successful.reduce(
        (sum, r) => sum + r.stats.removedSelectors,
        0,
      );
      const totalPreserved = successful.reduce(
        (sum, r) => sum + r.stats.preservedSelectors,
        0,
      );

      console.log(
        chalk.green(`✅ Successfully processed: ${successful.length} files`),
      );
      console.log(
        chalk.blue(
          `📏 Total size: ${(totalOriginal / 1024).toFixed(2)}KB → ${(totalFinal / 1024).toFixed(2)}KB`,
        ),
      );
      console.log(
        chalk.blue(
          `🗑️ Total reduction: ${(((totalOriginal - totalFinal) / totalOriginal) * 100).toFixed(1)}%`,
        ),
      );
      console.log(
        chalk.blue(
          `🎯 Selectors: ${totalPreserved} preserved, ${totalRemoved} removed`,
        ),
      );
    }

    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${failed.length} files`));
    }
  }
}

/**
 * Convenience function for quick PurgeCSS processing
 */
export async function purgeUnusedCSS(cssFiles, contentFiles, options = {}) {
  const purgeCSS = new PurgeCSSIntegration(options);
  return await purgeCSS.processFiles(cssFiles, contentFiles);
}

export default PurgeCSSIntegration;
