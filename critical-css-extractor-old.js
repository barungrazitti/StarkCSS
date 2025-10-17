import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

/**
 * Critical CSS extraction and inlining
 * Identifies and extracts above-the-fold CSS for better performance
 */

export class CriticalCSSExtractor {
  constructor(options = {}) {
    this.options = {
      // HTML files to process
      html: options.html || ["**/*.html"],

      // CSS files to extract from
      css: options.css || ["**/*.css"],

      // Viewport dimensions for critical detection
      viewport: {
        width: options.viewport?.width || 1200,
        height: options.viewport?.height || 900,
      },

      // Critical selectors (always included)
      criticalSelectors: options.criticalSelectors || [
        "html",
        "body",
        "head",
        "title",
        "header",
        "nav",
        "main",
        "footer",
        ".hero",
        ".above-fold",
        ".critical",
        "[data-critical]",
      ],

      // Output options
      output: options.output || {
        critical: "critical.css",
        inlined: "critical-inlined.html",
        remaining: "remaining.css",
      },

      // Inline options
      inline: options.inline !== false, // Default: inline critical CSS

      // Minify critical CSS
      minify: options.minify === true,

      // Verbose logging
      verbose: options.verbose || false,

      ...options,
    };
  }

  /**
   * Parse HTML and identify critical elements
   */
  parseHTML(html) {
    const criticalElements = [];

    // Simple HTML parsing to find above-fold elements
    const lines = html.split("\n");
    let currentLine = 0;
    let inBody = false;
    let bodyStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes("<body")) {
        inBody = true;
        bodyStartLine = i;
        continue;
      }

      if (line.includes("</body>") || (inBody && i > bodyStartLine + 50)) {
        // Stop after body tag or after reasonable number of lines
        break;
      }

      if (inBody) {
        // Extract elements from this line
        const elementMatches =
          line.match(
            /<([a-zA-Z][a-zA-Z0-9]*)[^>]*(class=["'][^"']*["'])?[^>]*>/g,
          ) || [];

        elementMatches.forEach((match) => {
          const tagMatch = match.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
          const classMatch = match.match(/class=["']([^"']*)["']/);
          const idMatch = match.match(/id=["']([^"']*)["']/);

          if (tagMatch) {
            const element = {
              tag: tagMatch[1],
              classes: classMatch
                ? classMatch[1].split(/\s+/).filter((c) => c)
                : [],
              id: idMatch ? idMatch[1] : null,
              line: i + 1,
              content: match,
            };

            criticalElements.push(element);
          }
        });
      }
    }

    return criticalElements;
  }

  /**
   * Generate critical selectors from HTML elements
   */
  generateCriticalSelectors(elements) {
    const selectors = new Set();

    // Add default critical selectors
    this.options.criticalSelectors.forEach((selector) => {
      selectors.add(selector);
    });

    // Generate selectors from elements
    elements.forEach((element) => {
      // Tag selector
      selectors.add(element.tag);

      // Class selectors
      element.classes.forEach((cls) => {
        selectors.add(`.${cls}`);
      });

      // ID selector
      if (element.id) {
        selectors.add(`#${element.id}`);
      }

      // Common combinations
      if (element.classes.length > 0) {
        element.classes.forEach((cls) => {
          selectors.add(`${element.tag}.${cls}`);
        });
      }

      if (element.id && element.classes.length > 0) {
        element.classes.forEach((cls) => {
          selectors.add(`#${element.id}.${cls}`);
        });
      }
    });

    // Add common pseudo-selectors for critical elements (limited to avoid Set size issues)
    const criticalPseudo = [
      ':hover', ':focus', ':active'
    ];
    
    const currentSelectors = Array.from(selectors);
    currentSelectors.forEach(selector => {
      criticalPseudo.forEach(pseudo => {
        if (!selector.includes('::') && !selector.includes(':hover') && !selector.includes(':focus') && !selector.includes(':active')) {
          if (selectors.size < 1000) { // Prevent Set size overflow
            selectors.add(selector + pseudo);
          }
        }
      });
    });
    });

    return Array.from(selectors);
  }

  /**
   * Extract critical CSS rules based on selectors
   */
  extractCriticalCSS(css, criticalSelectors) {
    const criticalRules = [];
    const remainingRules = [];

    // Remove comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");

    // Split into rule blocks
    const ruleBlocks = css.split(/(?<=\})/);

    for (const block of ruleBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const braceIndex = trimmed.indexOf("{");
      if (braceIndex === -1) continue;

      const selectorPart = trimmed.substring(0, braceIndex).trim();
      const contentPart = trimmed.substring(braceIndex);

      if (selectorPart && contentPart) {
        const selectors = selectorPart
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);

        // Check if any selector matches critical selectors
        const isCritical = selectors.some((selector) => {
          // Direct match
          if (criticalSelectors.includes(selector)) {
            return true;
          }

          // Partial match
          for (const critical of criticalSelectors) {
            if (selector.includes(critical) || critical.includes(selector)) {
              return true;
            }
          }

          // Media queries are usually critical for responsive design
          if (selector.includes("@media")) {
            return true;
          }

          // Font-face and keyframes are critical
          if (
            selector.includes("@font-face") ||
            selector.includes("@keyframes")
          ) {
            return true;
          }

          // CSS variables
          if (selector.includes(":root") || selector.includes("--")) {
            return true;
          }

          return false;
        });

        const rule = {
          selectors,
          content: contentPart,
          original: trimmed,
        };

        if (isCritical) {
          criticalRules.push(rule);
        } else {
          remainingRules.push(rule);
        }
      }
    }

    return {
      criticalCSS: criticalRules.map((rule) => rule.original).join("\n\n"),
      remainingCSS: remainingRules.map((rule) => rule.original).join("\n\n"),
      criticalRules: criticalRules.length,
      remainingRules: remainingRules.length,
    };
  }

  /**
   * Inline critical CSS into HTML
   */
  inlineCriticalCSS(html, criticalCSS) {
    // Find the head tag and insert critical CSS
    const headIndex = html.indexOf("<head");

    if (headIndex === -1) {
      // No head tag, add one
      return `<head>
<style>
${criticalCSS}
</style>
</head>
${html}`;
    }

    // Find the end of head tag
    const headEndIndex = html.indexOf("</head>", headIndex);

    if (headEndIndex === -1) {
      // Malformed HTML, just append after head start
      const afterHeadStart = html.indexOf(">", headIndex) + 1;
      return (
        html.slice(0, afterHeadStart) +
        `
<style>
${criticalCSS}
</style>
` +
        html.slice(afterHeadStart)
      );
    }

    // Insert before closing head tag
    return (
      html.slice(0, headEndIndex) +
      `
<style>
${criticalCSS}
</style>
` +
      html.slice(headEndIndex)
    );
  }

  /**
   * Process HTML file
   */
  async processHTMLFile(htmlFile, cssFiles) {
    console.log(
      chalk.blue(`📄 Processing: ${path.relative(process.cwd(), htmlFile)}`),
    );

    const html = await fs.readFile(htmlFile, "utf8");

    // Parse HTML and identify critical elements
    const elements = this.parseHTML(html);
    console.log(chalk.gray(`   🔍 Found ${elements.length} critical elements`));

    // Generate critical selectors
    const criticalSelectors = this.generateCriticalSelectors(elements);
    console.log(
      chalk.gray(
        `   🎯 Generated ${criticalSelectors.length} critical selectors`,
      ),
    );

    if (this.options.verbose) {
      console.log(
        chalk.gray(
          `   📋 Critical selectors: ${criticalSelectors.slice(0, 10).join(", ")}${criticalSelectors.length > 10 ? "..." : ""}`,
        ),
      );
    }

    // Extract critical CSS from all CSS files
    let allCriticalCSS = "";
    let allRemainingCSS = "";
    let totalCriticalRules = 0;
    let totalRemainingRules = 0;

    for (const cssFile of cssFiles) {
      try {
        const css = await fs.readFile(cssFile, "utf8");
        const result = this.extractCriticalCSS(css, criticalSelectors);

        allCriticalCSS += result.criticalCSS + "\n\n";
        allRemainingCSS += result.remainingCSS + "\n\n";

        totalCriticalRules += result.criticalRules;
        totalRemainingRules += result.remainingRules;

        if (this.options.verbose) {
          console.log(
            chalk.gray(
              `      📄 ${path.basename(cssFile)}: ${result.criticalRules} critical, ${result.remainingRules} remaining`,
            ),
          );
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `   ⚠️ Could not read CSS file ${cssFile}: ${error.message}`,
          ),
        );
      }
    }

    // Clean up CSS
    allCriticalCSS = allCriticalCSS.trim();
    allRemainingCSS = allRemainingCSS.trim();

    // Minify if requested
    if (this.options.minify) {
      allCriticalCSS = this.minifyCSS(allCriticalCSS);
      allRemainingCSS = this.minifyCSS(allRemainingCSS);
    }

    // Generate output paths
    const baseName = path.basename(htmlFile, path.extname(htmlFile));
    const dir = path.dirname(htmlFile);

    const criticalPath = path.join(
      dir,
      typeof this.options.output === "string"
        ? this.options.output
        : this.options.output.critical.replace("{name}", baseName),
    );

    const inlinedPath = path.join(
      dir,
      typeof this.options.output === "string"
        ? baseName + "-inlined.html"
        : this.options.output.inlined.replace("{name}", baseName),
    );

    const remainingPath = path.join(
      dir,
      typeof this.options.output === "string"
        ? baseName + "-remaining.css"
        : this.options.output.remaining.replace("{name}", baseName),
    );

    // Write critical CSS
    await fs.writeFile(criticalPath, allCriticalCSS);

    // Write remaining CSS
    if (allRemainingCSS) {
      await fs.writeFile(remainingPath, allRemainingCSS);
    }

    // Inline critical CSS into HTML if requested
    let inlinedHTML = html;
    if (this.options.inline) {
      inlinedHTML = this.inlineCriticalCSS(html, allCriticalCSS);
      await fs.writeFile(inlinedPath, inlinedHTML);
    }

    const criticalSize = Buffer.byteLength(allCriticalCSS, "utf8");
    const remainingSize = Buffer.byteLength(allRemainingCSS, "utf8");
    const originalSize = criticalSize + remainingSize;

    console.log(
      chalk.green(
        `   ✅ Critical CSS: ${(criticalSize / 1024).toFixed(2)}KB (${totalCriticalRules} rules)`,
      ),
    );
    if (remainingSize > 0) {
      console.log(
        chalk.blue(
          `   📄 Remaining CSS: ${(remainingSize / 1024).toFixed(2)}KB (${totalRemainingRules} rules)`,
        ),
      );
    }
    if (this.options.inline) {
      console.log(
        chalk.green(`   💾 Inlined HTML: ${path.basename(inlinedPath)}`),
      );
    }

    return {
      htmlFile,
      criticalPath,
      inlinedPath: this.options.inline ? inlinedPath : null,
      remainingPath: remainingSize > 0 ? remainingPath : null,
      criticalSize,
      remainingSize,
      originalSize,
      criticalRules: totalCriticalRules,
      remainingRules: totalRemainingRules,
      elementsFound: elements.length,
      selectorsGenerated: criticalSelectors.length,
      success: true,
    };
  }

  /**
   * Simple CSS minification
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
      .replace(/\s+/g, " ") // Collapse whitespace
      .replace(/;\s*}/g, "}") // Remove semicolons before closing braces
      .replace(/\s*{\s*/g, "{") // Remove spaces around braces
      .replace(/\s*}\s*/g, "}")
      .replace(/\s*;\s*/g, ";") // Remove spaces around semicolons
      .replace(/\s*:\s*/g, ":") // Remove spaces around colons
      .replace(/\s*,\s*/g, ",") // Remove spaces around commas
      .trim();
  }

  /**
   * Process all HTML files
   */
  async process() {
    console.log(chalk.blue.bold("⚡ Critical CSS Extractor"));
    console.log(chalk.blue("=".repeat(30)));

    // Find HTML files
    const htmlFiles = [];
    for (const pattern of this.options.html) {
      try {
        const files = await glob(pattern, {
          cwd: process.cwd(),
          absolute: true,
          ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
        });
        htmlFiles.push(...files);
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️ Could not resolve HTML pattern ${pattern}: ${error.message}`,
          ),
        );
      }
    }

    if (htmlFiles.length === 0) {
      console.log(chalk.yellow("⚠️ No HTML files found"));
      return [];
    }

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

    console.log(
      chalk.blue(
        `📁 Found ${htmlFiles.length} HTML file(s) and ${cssFiles.length} CSS file(s)`,
      ),
    );

    const results = [];

    for (const htmlFile of htmlFiles) {
      try {
        const result = await this.processHTMLFile(htmlFile, cssFiles);
        results.push(result);
      } catch (error) {
        console.error(
          chalk.red(`❌ Error processing ${htmlFile}: ${error.message}`),
        );
        results.push({
          htmlFile,
          error: error.message,
          success: false,
        });
      }

      console.log(); // Empty line for readability
    }

    // Generate summary
    this.generateSummary(results);

    return results;
  }

  /**
   * Generate summary
   */
  generateSummary(results) {
    console.log(chalk.blue.bold("📊 Critical CSS Summary"));
    console.log(chalk.blue("=".repeat(30)));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      const totalCritical = successful.reduce(
        (sum, r) => sum + r.criticalSize,
        0,
      );
      const totalRemaining = successful.reduce(
        (sum, r) => sum + r.remainingSize,
        0,
      );
      const totalOriginal = successful.reduce(
        (sum, r) => sum + r.originalSize,
        0,
      );
      const totalElements = successful.reduce(
        (sum, r) => sum + r.elementsFound,
        0,
      );
      const totalSelectors = successful.reduce(
        (sum, r) => sum + r.selectorsGenerated,
        0,
      );

      console.log(chalk.green(`✅ Processed: ${successful.length} HTML files`));
      console.log(chalk.blue(`🎯 Elements analyzed: ${totalElements}`));
      console.log(chalk.blue(`🔍 Selectors generated: ${totalSelectors}`));
      console.log(
        chalk.blue(`⚡ Critical CSS: ${(totalCritical / 1024).toFixed(2)}KB`),
      );
      if (totalRemaining > 0) {
        console.log(
          chalk.blue(
            `📄 Remaining CSS: ${(totalRemaining / 1024).toFixed(2)}KB`,
          ),
        );
      }
      console.log(
        chalk.blue(`📊 Total CSS: ${(totalOriginal / 1024).toFixed(2)}KB`),
      );

      if (totalOriginal > 0) {
        const criticalPercentage = (totalCritical / totalOriginal) * 100;
        console.log(
          chalk.blue(`📈 Critical ratio: ${criticalPercentage.toFixed(1)}%`),
        );
      }
    }

    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${failed.length} files`));
    }
  }
}

/**
 * Convenience function
 */
export async function extractCriticalCSS(options = {}) {
  const extractor = new CriticalCSSExtractor(options);
  return await extractor.process();
}

export default CriticalCSSExtractor;
