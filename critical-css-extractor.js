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
    // Handle legacy output options
    let output = options.output || {
      critical: "critical.css",
      inlined: "critical-inlined.html",
      remaining: "remaining.css",
    };

    // Support legacy criticalOutput/remainingOutput options
    if (options.criticalOutput) {
      output =
        typeof output === "string"
          ? options.criticalOutput
          : {
              ...output,
              critical: options.criticalOutput,
            };
    }

    if (options.remainingOutput) {
      output =
        typeof output === "string"
          ? output
          : {
              ...output,
              remaining: options.remainingOutput,
            };
    }

    this.options = {
      html: options.html || [],
      css: options.css || [],
      width: options.width || 1200,
      height: options.height || 900,
      strategy: options.strategy || "viewport",
      ignore: options.ignore || [
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
      criticalSelectors: options.criticalSelectors || [],
      output: output,
      inline: options.inline !== false,
      minify: options.minify === true,
      verbose: options.verbose || false,
      ...options,
    };
  }

  parseHTML(html) {
    const criticalElements = [];
    const lines = html.split("\n");
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
        break;
      }

      if (inBody) {
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

  generateCriticalSelectors(elements) {
    const selectors = new Set();

    // Add user-defined critical selectors
    this.options.criticalSelectors.forEach((selector) => {
      selectors.add(selector);
    });

    // Only add selectors from elements that are likely above the fold
    elements.forEach((element, index) => {
      // Add tag selectors for early elements
      if (index < 8) { // First 8 elements are likely above fold
        selectors.add(element.tag);
      }

      // Add class selectors only for early elements or important elements
      if (index < 12 || ["header", "nav", "main", "hero"].includes(element.tag)) {
        element.classes.forEach((cls) => {
          // Don't add footer/sidebar classes as critical
          if (!["footer", "sidebar", "card", "btn"].includes(cls)) {
            selectors.add(`.${cls}`);
          }
        });
      }

      if (element.id) {
        selectors.add(`#${element.id}`);
      }

      if (element.classes.length > 0 && index < 8) {
        element.classes.forEach((cls) => {
          if (!["footer", "sidebar", "card", "btn"].includes(cls)) {
            selectors.add(`${element.tag}.${cls}`);
          }
        });
      }
    });

    return Array.from(selectors);
  }

  extractCriticalCSS(css, criticalSelectors) {
    const criticalRules = [];
    const remainingRules = [];

    css = css.replace(/\/\*[\s\S]*?\*\//g, "");

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

        const isCritical = selectors.some((selector) => {
          // Check for exact matches first
          if (criticalSelectors.includes(selector)) {
            return true;
          }

          // Check for partial matches only for specific patterns
          for (const critical of criticalSelectors) {
            // Exact match
            if (selector === critical) {
              return true;
            }

            // Only match simple selectors (no combinators)
            const selectorParts = selector.trim().split(/\s+/);
            const criticalParts = critical.trim().split(/\s+/);
            
            // If both are simple selectors (no combinators), check for exact match
            if (selectorParts.length === 1 && criticalParts.length === 1) {
              if (selector === critical) {
                return true;
              }
              
              // Check if one is a prefix of the other (e.g., '.header' matches '.header-class')
              if (selector.startsWith(critical) || critical.startsWith(selector)) {
                return true;
              }
            }
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

  inlineCriticalCSS(html, criticalCSS) {
    const headIndex = html.indexOf("<head");

    if (headIndex === -1) {
      return `<head>
<style>
${criticalCSS}
</style>
</head>
${html}`;
    }

    const headEndIndex = html.indexOf("</head>", headIndex);

    if (headEndIndex === -1) {
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

  async processHTMLFile(htmlFile, cssFiles) {
    console.log(
      chalk.blue(`📄 Processing: ${path.relative(process.cwd(), htmlFile)}`),
    );

    const html = await fs.readFile(htmlFile, "utf8");
    const elements = this.parseHTML(html);
    console.log(chalk.gray(`   🔍 Found ${elements.length} critical elements`));

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

    allCriticalCSS = allCriticalCSS.trim();
    allRemainingCSS = allRemainingCSS.trim();

    if (this.options.minify) {
      allCriticalCSS = this.minifyCSS(allCriticalCSS);
      allRemainingCSS = this.minifyCSS(allRemainingCSS);
    }

    const baseName = path.basename(htmlFile, path.extname(htmlFile));
    const dir = path.dirname(htmlFile);

    const inlinedPath = path.join(
      dir,
      baseName + "-inlined.html",
    );

    const criticalPath = path.join(
      dir,
      typeof this.options.output === "string"
        ? this.options.output
        : this.options.output.critical.replace("{name}", baseName),
    );

    const remainingPath = path.join(
      dir,
      typeof this.options.output === "string"
        ? baseName + "-remaining.css"
        : this.options.output.remaining.replace("{name}", baseName),
    );

    await fs.writeFile(criticalPath, allCriticalCSS);

    if (allRemainingCSS) {
      await fs.writeFile(remainingPath, allRemainingCSS);
    }

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
      criticalCSS: allCriticalCSS,
      remainingCSS: allRemainingCSS,
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

  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/;\s*}/g, "}")
      .replace(/\s*{\s*/g, "{")
      .replace(/\s*}\s*/g, "}")
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s*,\s*/g, ",")
      .trim();
  }

  async process() {
    console.log(chalk.blue.bold("⚡ Critical CSS Extractor"));
    console.log(chalk.blue("=".repeat(30)));

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

      console.log();
    }

    this.generateSummary(results);

    return results;
  }

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

export async function extractCriticalCSS(options = {}) {
  const extractor = new CriticalCSSExtractor(options);
  return await extractor.process();
}

export default CriticalCSSExtractor;
