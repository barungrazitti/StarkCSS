import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

/**
 * Framework-specific CSS optimizations
 * Supports React, Vue, Angular, and Tailwind CSS
 */

export class FrameworkOptimizer {
  constructor(options = {}) {
    this.options = {
      framework: "auto", // auto, react, vue, angular, tailwind
      preserveCritical: true,
      optimizeForProduction: true,
      extractStatic: true,
      removeUnused: true,
      ...options,
    };

    this.frameworks = {
      react: {
        patterns: ["**/*.jsx", "**/*.tsx", "src/**/*.{js,ts,jsx,tsx}"],
        cssModules: ["**/*.module.css", "**/*.module.scss"],
        styledComponents: ["styled-components", "@emotion/styled"],
        inlineStyles: true,
      },
      vue: {
        patterns: ["**/*.vue", "src/**/*.{js,ts,vue}"],
        scoped: ["scoped"],
        cssModules: ["**/*.module.css", "**/*.module.scss"],
        styleBlocks: true,
      },
      angular: {
        patterns: [
          "**/*.component.ts",
          "**/*.component.html",
          "src/app/**/*.ts",
        ],
        encapsulation: ["ViewEncapsulation"],
        styleUrls: ["styleUrls", "styles"],
        inline: true,
      },
      tailwind: {
        patterns: ["**/*.{js,ts,jsx,tsx,vue,html}"],
        configFiles: ["tailwind.config.js", "tailwind.config.ts"],
        directives: ["@apply", "@screen", "@layer", "@theme"],
        presets: true,
      },
    };
  }

  /**
   * Detect the framework being used
   */
  async detectFramework(projectPath = process.cwd()) {
    const packageJsonPath = path.join(projectPath, "package.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      return "unknown";
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for React
    if (dependencies.react || dependencies["react-dom"]) {
      return "react";
    }

    // Check for Vue
    if (dependencies.vue) {
      return "vue";
    }

    // Check for Angular
    if (dependencies["@angular/core"] || dependencies["@angular/cli"]) {
      return "angular";
    }

    // Check for Tailwind
    if (dependencies.tailwindcss || dependencies["@tailwindcss/typography"]) {
      return "tailwind";
    }

    // Check config files
    const configFiles = await glob("**/tailwind.config.*", {
      cwd: projectPath,
    });
    if (configFiles.length > 0) {
      return "tailwind";
    }

    return "unknown";
  }

  /**
   * Get framework-specific file patterns
   */
  getFrameworkPatterns(framework) {
    if (framework === "auto") {
      // Return all patterns
      return Object.values(this.frameworks).flatMap((f) => f.patterns);
    }

    const config = this.frameworks[framework];
    return config ? config.patterns : [];
  }

  /**
   * Extract CSS usage from framework files
   */
  async extractCSSUsage(framework, projectPath = process.cwd()) {
    const patterns = this.getFrameworkPatterns(framework);
    const files = await glob(patterns, { cwd: projectPath, absolute: true });

    const usage = {
      classes: new Set(),
      ids: new Set(),
      selectors: new Set(),
      components: new Set(),
      utilities: new Set(),
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf8");
        const fileUsage = this.parseFileForCSSUsage(
          content,
          path.extname(file),
          framework,
        );

        // Merge usage data
        fileUsage.classes.forEach((c) => usage.classes.add(c));
        fileUsage.ids.forEach((i) => usage.ids.add(i));
        fileUsage.selectors.forEach((s) => usage.selectors.add(s));
        fileUsage.components.forEach((c) => usage.components.add(c));
        fileUsage.utilities.forEach((u) => usage.utilities.add(u));
      } catch (error) {
        console.warn(
          chalk.yellow(`Warning: Could not process ${file}: ${error.message}`),
        );
      }
    }

    return usage;
  }

  /**
   * Parse file content for CSS usage based on framework
   */
  parseFileForCSSUsage(content, extension, framework) {
    const usage = {
      classes: new Set(),
      ids: new Set(),
      selectors: new Set(),
      components: new Set(),
      utilities: new Set(),
    };

    switch (framework) {
      case "react":
        this.parseReactFile(content, usage);
        break;
      case "vue":
        this.parseVueFile(content, usage);
        break;
      case "angular":
        this.parseAngularFile(content, usage);
        break;
      case "tailwind":
        this.parseTailwindFile(content, usage);
        break;
    }

    return usage;
  }

  /**
   * Parse React files for CSS usage
   */
  parseReactFile(content, usage) {
    // CSS Modules
    const cssModuleImports =
      content.match(/import.*from\s+['"].*\.module\.css['"]/g) || [];
    cssModuleImports.forEach((imp) => {
      const match = imp.match(/import\s+(\w+)\s+from/);
      if (match) {
        const moduleName = match[1];
        // Find usage of styles.moduleName
        const moduleUsage =
          content.match(new RegExp(`${moduleName}\\.(\\w+)`, "g")) || [];
        moduleUsage.forEach((usageStr) => {
          const className = usageStr.split(".")[1];
          if (className) usage.classes.add(className);
        });
      }
    });

    // Styled components
    const styledComponents = content.match(/styled\.\w+`([^`]+)`/g) || [];
    styledComponents.forEach((component) => {
      const cssContent = component.match(/`([^`]+)`/)[1];
      this.extractClassesFromCSS(cssContent, usage);
    });

    // className attributes
    const classNames =
      content.match(/className\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
    classNames.forEach((cn) => {
      const classes = cn.match(/['"`]([^'"`]+)['"`]/)[1];
      classes.split(/\s+/).forEach((cls) => {
        if (cls.trim()) usage.classes.add(cls.trim());
      });
    });

    // CSS-in-JS objects
    const cssObjects = content.match(/style\s*=\s*{{([^}]+)}}/g) || [];
    cssObjects.forEach((obj) => {
      // Extract CSS properties from object
      const properties = obj.match(/(\w+):\s*['"`]([^'"`]+)['"`]/g) || [];
      properties.forEach((prop) => {
        const [property, value] = prop.split(":");
        if (property && value) {
          usage.selectors.add(
            `${property.trim()}: ${value.trim().replace(/['"`]/g, "")}`,
          );
        }
      });
    });
  }

  /**
   * Parse Vue files for CSS usage
   */
  parseVueFile(content, usage) {
    // Template section
    const templateMatch = content.match(
      /<template[^>]*>([\s\S]*?)<\/template>/,
    );
    if (templateMatch) {
      const template = templateMatch[1];

      // Class attributes (including :class bindings)
      const classBindings =
        template.match(/:class\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
      classBindings.forEach((cls) => {
        const classMatch = cls.match(/['"`]([^'"`]+)['"`]/);
        if (classMatch) {
          const classList = classMatch[1];
          // Handle object syntax like "{'active': isActive}"
          const objectClasses = classList.match(/['"`]([^'"`]+)['"`]/g) || [];
          objectClasses.forEach((c) => {
            const cleanClass = c.replace(/['"`]/g, "");
            if (cleanClass.trim()) usage.classes.add(cleanClass.trim());
          });
          // Handle simple strings
          if (!classList.includes("{")) {
            classList.split(/[\s,]+/).forEach((c) => {
              if (c.trim()) usage.classes.add(c.trim());
            });
          }
        }
      });

      // Regular class attributes
      const regularClasses =
        template.match(/class\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
      regularClasses.forEach((cls) => {
        const classMatch = cls.match(/['"`]([^'"`]+)['"`]/);
        if (classMatch) {
          const classList = classMatch[1];
          classList.split(/\s+/).forEach((c) => {
            if (c.trim()) usage.classes.add(c.trim());
          });
        }
      });
    }

    // Script section
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      const script = scriptMatch[1];

      // CSS Modules in Vue
      const cssModuleImports =
        script.match(/import.*from\s+['"].*\.module\.css['"]/g) || [];
      cssModuleImports.forEach((imp) => {
        const match = imp.match(/import\s+(\w+)\s+from/);
        if (match) {
          const moduleName = match[1];
          const moduleUsage =
            script.match(new RegExp(`\\$style\\.\\w+`, "g")) || [];
          moduleUsage.forEach((usageStr) => {
            const className = usageStr.split(".")[1];
            if (className) usage.classes.add(className);
          });
        }
      });
    }

    // Style section
    const styleMatches =
      content.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || [];
    styleMatches.forEach((style) => {
      this.extractClassesFromCSS(style, usage);
    });
  }

  /**
   * Parse Angular files for CSS usage
   */
  parseAngularFile(content, usage) {
    // Component decorators
    const componentMatch = content.match(/@Component\s*\(\s*{[\s\S]*?}\s*\)/);
    if (componentMatch) {
      const component = componentMatch[0];

      // styleUrls
      const styleUrls = component.match(/styleUrls:\s*\[([^\]]+)\]/);
      if (styleUrls) {
        const urls = styleUrls[1].match(/['"`]([^'"`]+)['"`]/g) || [];
        urls.forEach((url) => {
          const cssFile = url.replace(/['"`]/g, "");
          // Mark this CSS file as used
          usage.components.add(cssFile);
        });
      }

      // styles
      const styles = component.match(/styles:\s*\[([^\]]+)\]/);
      if (styles) {
        const styleContent = styles[1];
        this.extractClassesFromCSS(styleContent, usage);
      }
    }

    // Template references
    const templateRefs = content.match(/#\w+/g) || [];
    templateRefs.forEach((ref) => {
      usage.ids.add(ref.substring(1));
    });

    // Host bindings
    const hostBindings =
      content.match(/@HostBinding\(['"`]([^'"`]+)['"`]\)/g) || [];
    hostBindings.forEach((binding) => {
      const property = binding.match(/['"`]([^'"`]+)['"`]/)[1];
      usage.selectors.add(property);
    });
  }

  /**
   * Parse Tailwind CSS files for utility usage
   */
  parseTailwindFile(content, usage) {
    // Tailwind utility classes
    const utilityRegex = /(?:className|class)\s*=\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = utilityRegex.exec(content)) !== null) {
      const classes = match[1];
      // Split on whitespace but keep variants together
      const utilities = classes.split(/\s+/);
      utilities.forEach((utility) => {
        if (utility.trim() && !utility.startsWith("{")) {
          usage.utilities.add(utility.trim());
        }
      });
    }

    // @apply directives
    const applyDirectives = content.match(/@apply\s+([^;]+);/g) || [];
    applyDirectives.forEach((directive) => {
      const utilities = directive
        .replace(/@apply\s+/, "")
        .replace(";", "")
        .trim();
      utilities.split(/\s+/).forEach((utility) => {
        if (utility.trim()) usage.utilities.add(utility.trim());
      });
    });

    // Tailwind config variants (extract from utilities)
    const allUtilities = Array.from(usage.utilities);
    allUtilities.forEach((utility) => {
      // Extract variant prefixes
      const variantMatch = utility.match(
        /^(hover|focus|active|disabled|group-hover|group-focus|sm|md|lg|xl|2xl):/,
      );
      if (variantMatch) {
        usage.utilities.add(variantMatch[1]);
      }
    });
  }

  /**
   * Extract classes, IDs, and selectors from CSS content
   */
  extractClassesFromCSS(cssContent, usage) {
    // CSS classes
    const classMatches = cssContent.match(/\.([a-zA-Z][\w-]*)/g) || [];
    classMatches.forEach((match) => {
      usage.classes.add(match.substring(1));
    });

    // CSS IDs
    const idMatches = cssContent.match(/#([a-zA-Z][\w-]*)/g) || [];
    idMatches.forEach((match) => {
      usage.ids.add(match.substring(1));
    });

    // CSS selectors (simple extraction)
    const selectorMatches = cssContent.match(/([a-zA-Z][\w-]*)\s*{/g) || [];
    selectorMatches.forEach((match) => {
      const selector = match.replace(/\s*{/, "").trim();
      if (selector && !selector.startsWith(".") && !selector.startsWith("#")) {
        usage.selectors.add(selector);
      }
    });
  }

  /**
   * Optimize CSS for specific framework
   */
  async optimizeForFramework(cssContent, framework, usage = null) {
    let optimized = cssContent;

    switch (framework) {
      case "react":
        optimized = this.optimizeForReact(optimized, usage);
        break;
      case "vue":
        optimized = this.optimizeForVue(optimized, usage);
        break;
      case "angular":
        optimized = this.optimizeForAngular(optimized, usage);
        break;
      case "tailwind":
        optimized = this.optimizeForTailwind(optimized, usage);
        break;
    }

    return optimized;
  }

  /**
   * React-specific optimizations
   */
  optimizeForReact(cssContent, usage) {
    let optimized = cssContent;

    // Remove unused CSS if usage data is available
    if (usage && this.options.removeUnused) {
      optimized = this.removeUnusedCSS(optimized, usage);
    }

    // Optimize for CSS Modules
    optimized = this.optimizeForCSSModules(optimized);

    // Add React-specific optimizations
    optimized = this.addReactOptimizations(optimized);

    return optimized;
  }

  /**
   * Vue-specific optimizations
   */
  optimizeForVue(cssContent, usage) {
    let optimized = cssContent;

    // Handle scoped CSS
    optimized = this.optimizeScopedCSS(optimized);

    // Remove unused CSS if usage data is available
    if (usage && this.options.removeUnused) {
      optimized = this.removeUnusedCSS(optimized, usage);
    }

    // Vue-specific optimizations
    optimized = this.addVueOptimizations(optimized);

    return optimized;
  }

  /**
   * Angular-specific optimizations
   */
  optimizeForAngular(cssContent, usage) {
    let optimized = cssContent;

    // Handle Angular encapsulation
    optimized = this.optimizeForEncapsulation(optimized);

    // Remove unused CSS if usage data is available
    if (usage && this.options.removeUnused) {
      optimized = this.removeUnusedCSS(optimized, usage);
    }

    // Angular-specific optimizations
    optimized = this.addAngularOptimizations(optimized);

    return optimized;
  }

  /**
   * Tailwind CSS specific optimizations
   */
  optimizeForTailwind(cssContent, usage) {
    let optimized = cssContent;

    // Remove unused utilities if usage data is available
    if (usage && this.options.removeUnused) {
      optimized = this.removeUnusedTailwindUtilities(optimized, usage);
    }

    // Optimize Tailwind directives
    optimized = this.optimizeTailwindDirectives(optimized);

    // Purge duplicate utilities
    optimized = this.purgeDuplicateUtilities(optimized);

    return optimized;
  }

  /**
   * Remove unused CSS based on usage data
   */
  removeUnusedCSS(cssContent, usage) {
    // This is a simplified implementation
    // In a real scenario, you'd use a more sophisticated CSS parser

    const lines = cssContent.split("\n");
    const keptLines = [];
    let inRule = false;
    let currentSelector = "";
    let currentRule = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if it's a selector line
      if (trimmed.includes("{") && !trimmed.startsWith("@")) {
        const selector = trimmed.split("{")[0].trim();
        currentSelector = selector;
        inRule = true;
        currentRule = [line];
      } else if (trimmed === "}" && inRule) {
        currentRule.push(line);

        // Check if this rule is used
        if (this.isSelectorUsed(currentSelector, usage)) {
          keptLines.push(...currentRule);
        }

        inRule = false;
        currentSelector = "";
        currentRule = [];
      } else if (inRule) {
        currentRule.push(line);
      } else {
        // Keep non-rule content (comments, @media, etc.)
        keptLines.push(line);
      }
    }

    return keptLines.join("\n");
  }

  /**
   * Check if a selector is used
   */
  isSelectorUsed(selector, usage) {
    // Remove pseudo-classes and pseudo-elements for checking
    const cleanSelector = selector
      .replace(/:[^:]+/g, "")
      .replace(/::[^:]+/g, "");

    if (cleanSelector.startsWith(".")) {
      const className = cleanSelector.substring(1);
      return usage.classes.has(className);
    } else if (cleanSelector.startsWith("#")) {
      const id = cleanSelector.substring(1);
      return usage.ids.has(id);
    } else {
      return usage.selectors.has(cleanSelector);
    }
  }

  /**
   * Remove unused Tailwind utilities
   */
  removeUnusedTailwindUtilities(cssContent, usage) {
    const lines = cssContent.split("\n");
    const keptLines = [];
    let currentRule = [];
    let currentSelector = "";
    let inRule = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith(".") && !trimmed.includes("{")) {
        // Selector line
        if (inRule && currentRule.length > 0) {
          // Process previous rule
          if (this.isUtilityUsed(currentSelector, usage)) {
            keptLines.push(...currentRule);
          }
        }

        currentSelector = trimmed.substring(1).split(/\s+/)[0];
        currentRule = [line];
        inRule = true;
      } else if (trimmed === "{" && inRule) {
        currentRule.push(line);
      } else if (trimmed === "}" && inRule) {
        currentRule.push(line);

        // Process complete rule
        if (this.isUtilityUsed(currentSelector, usage)) {
          keptLines.push(...currentRule);
        }

        inRule = false;
        currentSelector = "";
        currentRule = [];
      } else if (inRule) {
        currentRule.push(line);
      } else {
        // Keep non-utility content
        keptLines.push(line);
      }
    }

    // Handle last rule if file doesn't end with }
    if (
      inRule &&
      currentRule.length > 0 &&
      this.isUtilityUsed(currentSelector, usage)
    ) {
      keptLines.push(...currentRule);
    }

    return keptLines.join("\n");
  }

  /**
   * Check if a Tailwind utility is used
   */
  isUtilityUsed(utility, usage) {
    return usage.utilities.has(utility);
  }

  /**
   * Additional optimization methods (simplified implementations)
   */
  optimizeForCSSModules(cssContent) {
    // Add CSS Modules specific optimizations
    return cssContent;
  }

  addReactOptimizations(cssContent) {
    // Add React-specific CSS optimizations
    return cssContent;
  }

  optimizeScopedCSS(cssContent) {
    // Optimize Vue scoped CSS
    return cssContent;
  }

  addVueOptimizations(cssContent) {
    // Add Vue-specific optimizations
    return cssContent;
  }

  optimizeForEncapsulation(cssContent) {
    // Optimize for Angular ViewEncapsulation
    return cssContent;
  }

  addAngularOptimizations(cssContent) {
    // Add Angular-specific optimizations
    return cssContent;
  }

  optimizeTailwindDirectives(cssContent) {
    // Optimize Tailwind @apply, @screen, etc.
    return cssContent;
  }

  purgeDuplicateUtilities(cssContent) {
    // Remove duplicate Tailwind utilities
    return cssContent;
  }

  /**
   * Generate framework-specific report
   */
  generateReport(usage, framework) {
    const report = {
      framework,
      detectedClasses: usage.classes.size,
      detectedIds: usage.ids.size,
      detectedSelectors: usage.selectors.size,
      detectedComponents: usage.components.size,
      detectedUtilities: usage.utilities.size,
      recommendations: [],
    };

    // Add framework-specific recommendations
    switch (framework) {
      case "react":
        if (usage.classes.size > 100) {
          report.recommendations.push(
            "Consider using CSS Modules for better encapsulation",
          );
        }
        break;
      case "vue":
        if (usage.utilities.size > 50) {
          report.recommendations.push(
            "Consider using scoped CSS with utility classes",
          );
        }
        break;
      case "angular":
        if (usage.components.size > 20) {
          report.recommendations.push(
            "Consider creating a shared styles module",
          );
        }
        break;
      case "tailwind":
        if (usage.utilities.size > 200) {
          report.recommendations.push(
            "Consider using Tailwind's @apply for complex patterns",
          );
        }
        break;
    }

    return report;
  }
}

export default FrameworkOptimizer;
