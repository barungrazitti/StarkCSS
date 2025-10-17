import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

/**
 * Simplified PurgeCSS integration for unused CSS removal
 */

export class SimplePurgeCSS {
  constructor(options = {}) {
    this.options = {
      content: options.content || ["**/*.html"],
      css: options.css || ["**/*.css"],
      output: options.output || null,
      safelist: options.safelist || [],
      verbose: options.verbose || false,
      ...options,
    };
  }

  /**
   * Extract selectors from HTML content
   */
  extractSelectorsFromHTML(content) {
    const selectors = new Set();

    // Extract class names
    const classMatches = content.match(/class=["']([^"']+)["']/g) || [];
    classMatches.forEach((match) => {
      const classes = match.match(/class=["']([^"']+)["']/)[1].split(/\s+/);
      classes.forEach((cls) => {
        if (cls) selectors.add(`.${cls}`);
      });
    });

    // Extract IDs
    const idMatches = content.match(/id=["']([^"']+)["']/g) || [];
    idMatches.forEach((match) => {
      const id = match.match(/id=["']([^"']+)["']/)[1];
      if (id) selectors.add(`#${id}`);
    });

    // Extract tag names
    const tagMatches = content.match(/<([a-zA-Z][a-zA-Z0-9]*)/g) || [];
    tagMatches.forEach((match) => {
      const tag = match.replace(/</, "");
      if (
        [
          "div",
          "span",
          "p",
          "a",
          "img",
          "button",
          "input",
          "form",
          "section",
          "article",
          "nav",
          "header",
          "footer",
          "main",
          "body",
          "html",
        ].includes(tag)
      ) {
        selectors.add(tag);
      }
    });

    return Array.from(selectors);
  }

  /**
   * Extract selectors from JavaScript/TypeScript content
   */
  extractSelectorsFromJS(content) {
    const selectors = new Set();

    // Extract class names from common patterns
    const classPatterns = [
      /className=["']([^"']+)["']/g,
      /classList\.(add|remove|toggle|contains)\(["']([^"']+)["']/g,
      /querySelector\(["']([^"']+)["']/g,
      /querySelectorAll\(["']([^"']+)["']/g,
      /\.classList\s*=\s*["']([^"']+)["']/g,
    ];

    classPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const selector = match[1] || match[2];
        if (selector) {
          if (selector.startsWith(".")) {
            selectors.add(selector);
          } else if (
            !selector.includes("#") &&
            !selector.includes("[") &&
            !selector.includes(":")
          ) {
            selectors.add(`.${selector}`);
          } else {
            selectors.add(selector);
          }
        }
      }
    });

    return Array.from(selectors);
  }

  /**
   * Get all used selectors from content files
   */
  async getUsedSelectors() {
    const allSelectors = new Set();

    console.log(chalk.blue("🔍 Scanning content files..."));

    for (const pattern of this.options.content) {
      try {
        const files = await glob(pattern, {
          cwd: process.cwd(),
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
        });

        for (const file of files) {
          try {
            const content = await fs.readFile(file, "utf8");
            let selectors = [];

            if (file.endsWith(".html") || file.endsWith(".htm")) {
              selectors = this.extractSelectorsFromHTML(content);
            } else if (
              file.endsWith(".js") ||
              file.endsWith(".jsx") ||
              file.endsWith(".ts") ||
              file.endsWith(".tsx")
            ) {
              selectors = this.extractSelectorsFromJS(content);
            }

            selectors.forEach((selector) => allSelectors.add(selector));

            if (this.options.verbose) {
              console.log(
                chalk.gray(
                  `   📄 ${path.relative(process.cwd(), file)}: ${selectors.length} selectors`,
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

    console.log(chalk.green(`✅ Found ${allSelectors.size} unique selectors`));
    return Array.from(allSelectors);
  }

  /**
   * Parse CSS rules
   */
  parseCSSRules(css) {
    const rules = [];

    // Remove comments first
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");

    // Split by closing braces to get individual rules
    const ruleBlocks = css.split(/(?<=\})/);

    for (const block of ruleBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const braceIndex = trimmed.indexOf("{");
      if (braceIndex === -1) continue;

      const selectorPart = trimmed.substring(0, braceIndex).trim();
      const contentPart = trimmed.substring(braceIndex);

      if (selectorPart && contentPart) {
        // Handle multiple selectors separated by commas
        const selectors = selectorPart
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);

        rules.push({
          selectors,
          content: contentPart,
          original: trimmed,
        });
      }
    }

    return rules;
  }

  /**
   * Check if any selector in a rule is used
   */
  isRuleUsed(rule, usedSelectors) {
    // Check if any selector in the rule is used
    for (const selector of rule.selectors) {
      // Direct match
      if (usedSelectors.includes(selector)) {
        return true;
      }

      // More precise matching for complex selectors
      for (const used of usedSelectors) {
        // Check for exact class match (e.g., .btn matches .btn but not .unused-button)
        if (selector === "." + used || selector === "#" + used) {
          return true;
        }

        // Check for compound selectors (e.g., .btn.primary matches .btn)
        const selectorParts = selector.split(/[\s>+~,]/).map((s) => s.trim());
        if (
          selectorParts.includes("." + used) ||
          selectorParts.includes("#" + used)
        ) {
          return true;
        }
      }

      // Check safelist
      if (this.options.safelist.includes(selector)) {
        return true;
      }

      // Preserve special rules
      if (
        selector.startsWith("@") ||
        selector.includes(":hover") ||
        selector.includes(":focus") ||
        selector.includes(":active") ||
        selector.includes("::before") ||
        selector.includes("::after")
      ) {
        return true;
      }

      // Preserve CSS variables if enabled
      if (this.options.variables) {
        // Check if selector is :root (common place for CSS variables)
        if (selector === ":root") {
          return true;
        }
        // Check if rule content contains CSS variable definitions
        if (rule.content && rule.content.includes("--")) {
          return true;
        }
        // Check if selector itself contains CSS variables
        if (selector.includes("--")) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Process CSS file
   */
  async processCSSFile(cssFile, usedSelectors) {
    console.log(
      chalk.blue(`📄 Processing: ${path.relative(process.cwd(), cssFile)}`),
    );

    const css = await fs.readFile(cssFile, "utf8");
    const originalSize = css.length;

    const rules = this.parseCSSRules(css);
    const usedRules = [];
    const removedSelectors = [];

    for (const rule of rules) {
      if (this.isRuleUsed(rule, usedSelectors)) {
        usedRules.push(rule.original);
      } else {
        removedSelectors.push(...rule.selectors);
      }
    }

    const optimizedCSS = usedRules.join("\n\n");
    const finalSize = optimizedCSS.length;
    const reduction = ((originalSize - finalSize) / originalSize) * 100;

    console.log(
      chalk.green(
        `   ✅ Size: ${(originalSize / 1024).toFixed(2)}KB → ${(finalSize / 1024).toFixed(2)}KB (${reduction.toFixed(1)}% reduction)`,
      ),
    );
    console.log(
      chalk.gray(
        `   🎯 Rules: ${rules.length} → ${usedRules.length} (${rules.length - usedRules.length} removed)`,
      ),
    );

    if (removedSelectors.length > 0 && this.options.verbose) {
      console.log(
        chalk.gray(
          `   🗑️ Removed: ${removedSelectors.slice(0, 5).join(", ")}${removedSelectors.length > 5 ? "..." : ""}`,
        ),
      );
    }

    return {
      originalCSS: css,
      optimizedCSS,
      originalSize,
      finalSize,
      reduction,
      originalRules: rules.length,
      finalRules: usedRules.length,
      removedSelectors,
    };
  }

  /**
   * Process all CSS files
   */
  async process() {
    console.log(chalk.blue.bold("🧹 Simple PurgeCSS - Removing Unused CSS"));
    console.log(chalk.blue("=".repeat(45)));

    // Get used selectors
    const usedSelectors = await this.getUsedSelectors();

    // Find CSS files
    const cssFiles = [];
    for (const pattern of this.options.css) {
      try {
        const files = await glob(pattern, {
          cwd: process.cwd(),
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
        });
        cssFiles.push(...files);
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️ Could not resolve CSS pattern ${pattern}: ${error.message}`,
          ),
        );
      }
    }

    if (cssFiles.length === 0) {
      console.log(chalk.yellow("⚠️ No CSS files found"));
      return [];
    }

    console.log(chalk.blue(`📁 Found ${cssFiles.length} CSS file(s)`));

    const results = [];

    for (const cssFile of cssFiles) {
      try {
        const result = await this.processCSSFile(cssFile, usedSelectors);

        // Generate output path
        const outputPath =
          this.options.output || cssFile.replace(/\.css$/, ".purged.css");

        // Write optimized CSS
        await fs.writeFile(outputPath, result.optimizedCSS);

        results.push({
          inputFile: cssFile,
          outputFile: outputPath,
          ...result,
          success: true,
        });

        console.log(chalk.green(`   💾 Saved: ${path.basename(outputPath)}`));
      } catch (error) {
        console.error(chalk.red(`   ❌ Error: ${error.message}`));
        results.push({
          inputFile: cssFile,
          error: error.message,
          success: false,
        });
      }

      console.log(); // Empty line for readability
    }

    // Summary
    this.generateSummary(results);

    return results;
  }

  /**
   * Generate summary
   */
  generateSummary(results) {
    console.log(chalk.blue.bold("📊 Summary"));
    console.log(chalk.blue("=".repeat(20)));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      const totalOriginal = successful.reduce(
        (sum, r) => sum + r.originalSize,
        0,
      );
      const totalFinal = successful.reduce((sum, r) => sum + r.finalSize, 0);
      const totalReduction =
        ((totalOriginal - totalFinal) / totalOriginal) * 100;

      console.log(chalk.green(`✅ Processed: ${successful.length} files`));
      console.log(
        chalk.blue(
          `📏 Total size: ${(totalOriginal / 1024).toFixed(2)}KB → ${(totalFinal / 1024).toFixed(2)}KB`,
        ),
      );
      console.log(
        chalk.blue(`🗑️ Total reduction: ${totalReduction.toFixed(1)}%`),
      );
    }

    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${failed.length} files`));
    }
  }
}

/**
 * Convenience function
 */
export async function purgeCSS(options = {}) {
  const purgeCSS = new SimplePurgeCSS(options);
  return await purgeCSS.process();
}

export default SimplePurgeCSS;
