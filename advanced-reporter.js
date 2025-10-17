import fs from "fs-extra";
import path from "path";
import { performance } from "perf_hooks";
import chalk from "chalk";

/**
 * Advanced reporting and bundle analysis system
 * Generates detailed reports with insights and recommendations
 */

export class AdvancedReporter {
  constructor(options = {}) {
    this.options = {
      includeMetrics: true,
      includeRecommendations: true,
      includeVisualizations: true,
      outputFormat: "html", // html, json, text
      outputPath: "./reports",
      ...options,
    };

    this.metrics = {
      totalFiles: 0,
      totalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
      processingTime: 0,
      unusedCSS: 0,
      duplicateRules: 0,
      criticalCSS: 0,
      frameworkSpecific: {},
    };

    this.insights = [];
    this.recommendations = [];
    this.warnings = [];
  }

  /**
   * Analyze CSS optimization results
   */
  async analyzeResults(results, framework = "unknown") {
    const startTime = performance.now();

    // Reset metrics
    this.resetMetrics();

    // Process each result
    for (const result of results) {
      if (result.success) {
        await this.analyzeFile(result, framework);
      } else {
        this.warnings.push({
          type: "processing_error",
          file: result.file,
          message: result.error,
          severity: "high",
        });
      }
    }

    // Calculate overall metrics
    this.calculateOverallMetrics(results);

    // Generate insights
    this.generateInsights(results, framework);

    // Generate recommendations
    this.generateRecommendations(results, framework);

    const endTime = performance.now();
    this.metrics.analysisTime = endTime - startTime;

    return {
      metrics: this.metrics,
      insights: this.insights,
      recommendations: this.recommendations,
      warnings: this.warnings,
    };
  }

  /**
   * Analyze individual file
   */
  async analyzeFile(result, framework) {
    this.metrics.totalFiles++;
    this.metrics.totalSize += result.originalSize || 0;
    this.metrics.optimizedSize += result.optimizedSize || 0;

    // Analyze CSS content if available
    if (result.content) {
      await this.analyzeCSSContent(result.content, result.file);
    }

    // Framework-specific analysis
    if (framework !== "unknown") {
      this.analyzeFrameworkSpecific(result, framework);
    }
  }

  /**
   * Analyze CSS content for patterns and issues
   */
  async analyzeCSSContent(content, filePath) {
    const lines = content.split("\n");

    // Count CSS rules
    const rules = content.match(/[^{}]+\{[^{}]*\}/g) || [];
    const ruleCount = rules.length;

    // Find unused selectors (simplified)
    const unusedSelectors = this.findUnusedSelectors(content);
    this.metrics.unusedCSS += unusedSelectors.length;

    // Find duplicate rules
    const duplicates = this.findDuplicateRules(content);
    this.metrics.duplicateRules += duplicates.length;

    // Analyze specificity
    const specificityAnalysis = this.analyzeSpecificity(content);

    // Check for performance issues
    const performanceIssues = this.checkPerformanceIssues(content);

    // Add insights
    if (ruleCount > 1000) {
      this.insights.push({
        type: "large_file",
        file: filePath,
        message: `Large CSS file with ${ruleCount} rules detected`,
        severity: "medium",
        value: ruleCount,
      });
    }

    if (unusedSelectors.length > 10) {
      this.insights.push({
        type: "unused_css",
        file: filePath,
        message: `${unusedSelectors.length} potentially unused selectors found`,
        severity: "medium",
        value: unusedSelectors.length,
      });
    }

    if (duplicates.length > 0) {
      this.insights.push({
        type: "duplicate_rules",
        file: filePath,
        message: `${duplicates.length} duplicate CSS rules found`,
        severity: "low",
        value: duplicates.length,
      });
    }

    if (specificityAnalysis.highSpecificityCount > 10) {
      this.insights.push({
        type: "high_specificity",
        file: filePath,
        message: `${specificityAnalysis.highSpecificityCount} rules with high specificity`,
        severity: "medium",
        value: specificityAnalysis.highSpecificityCount,
      });
    }

    performanceIssues.forEach((issue) => {
      this.warnings.push({
        type: "performance_issue",
        file: filePath,
        message: issue.message,
        severity: issue.severity,
        recommendation: issue.recommendation,
      });
    });
  }

  /**
   * Find potentially unused selectors
   */
  findUnusedSelectors(content) {
    // This is a simplified implementation
    // In a real scenario, you'd cross-reference with HTML/JS files
    const selectors = content.match(/[^{}]+\s*\{/g) || [];
    const unused = [];

    selectors.forEach((selector) => {
      const cleanSelector = selector.replace(/\s*\{/, "").trim();

      // Skip media queries, keyframes, etc.
      if (cleanSelector.startsWith("@") || cleanSelector.includes(":")) {
        return;
      }

      // Simple heuristic: very specific selectors might be unused
      if (cleanSelector.split(" ").length > 3) {
        unused.push(cleanSelector);
      }
    });

    return unused;
  }

  /**
   * Find duplicate CSS rules
   */
  findDuplicateRules(content) {
    const rules = content.match(/[^{}]+\{[^{}]*\}/g) || [];
    const ruleMap = new Map();
    const duplicates = [];

    rules.forEach((rule) => {
      const normalized = rule.replace(/\s+/g, " ").trim();
      if (ruleMap.has(normalized)) {
        duplicates.push(normalized);
      } else {
        ruleMap.set(normalized, true);
      }
    });

    return duplicates;
  }

  /**
   * Analyze CSS specificity
   */
  analyzeSpecificity(content) {
    const selectors = content.match(/[^{}]+\s*\{/g) || [];
    let highSpecificityCount = 0;
    let totalSpecificity = 0;

    selectors.forEach((selector) => {
      const cleanSelector = selector.replace(/\s*\{/, "").trim();
      const specificity = this.calculateSpecificity(cleanSelector);
      totalSpecificity += specificity;

      if (specificity > 100) {
        highSpecificityCount++;
      }
    });

    return {
      highSpecificityCount,
      averageSpecificity:
        selectors.length > 0 ? totalSpecificity / selectors.length : 0,
    };
  }

  /**
   * Calculate CSS specificity score
   */
  calculateSpecificity(selector) {
    // Simple specificity calculation
    let score = 0;

    // IDs
    const idMatches = selector.match(/#/g) || [];
    score += idMatches.length * 100;

    // Classes and attributes
    const classMatches = selector.match(/\./g) || [];
    const attrMatches = selector.match(/\[/g) || [];
    score += (classMatches.length + attrMatches.length) * 10;

    // Elements
    const elementMatches = selector.match(/^[a-zA-Z]/g) || [];
    score += elementMatches.length;

    return score;
  }

  /**
   * Check for CSS performance issues
   */
  checkPerformanceIssues(content) {
    const issues = [];

    // Check for universal selector
    if (content.includes("* {")) {
      issues.push({
        message: "Universal selector (*) can impact performance",
        severity: "medium",
        recommendation: "Use more specific selectors",
      });
    }

    // Check for expensive selectors
    const expensiveSelectors =
      content.match(/[^{}]*\s*>\s*[^{}]*\s*>\s*[^{}]*\s*\{/g) || [];
    if (expensiveSelectors.length > 5) {
      issues.push({
        message: `${expensiveSelectors.length} expensive child selectors found`,
        severity: "medium",
        recommendation: "Consider using classes instead of deep nesting",
      });
    }

    // Check for @import
    const imports = content.match(/@import/g) || [];
    if (imports.length > 0) {
      issues.push({
        message: `${imports.length} @import rules found (blocking rendering)`,
        severity: "high",
        recommendation: "Use <link> tags instead of @import",
      });
    }

    return issues;
  }

  /**
   * Framework-specific analysis
   */
  analyzeFrameworkSpecific(result, framework) {
    if (!this.metrics.frameworkSpecific[framework]) {
      this.metrics.frameworkSpecific[framework] = {
        files: 0,
        totalSize: 0,
        optimizedSize: 0,
        issues: [],
      };
    }

    const frameworkMetrics = this.metrics.frameworkSpecific[framework];
    frameworkMetrics.files++;
    frameworkMetrics.totalSize += result.originalSize || 0;
    frameworkMetrics.optimizedSize += result.optimizedSize || 0;

    // Framework-specific insights
    switch (framework) {
      case "react":
        if (result.fixes && result.fixes.includes("CSS Modules optimization")) {
          frameworkMetrics.issues.push("CSS Modules usage detected");
        }
        break;
      case "vue":
        if (result.fixes && result.fixes.includes("Scoped CSS optimization")) {
          frameworkMetrics.issues.push("Scoped CSS usage detected");
        }
        break;
      case "tailwind":
        if (result.utilities && result.utilities.size > 100) {
          frameworkMetrics.issues.push("Large utility class usage");
        }
        break;
    }
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(results) {
    const successful = results.filter((r) => r.success);

    this.metrics.totalFiles = results.length;
    this.metrics.successfulFiles = successful.length;
    this.metrics.failedFiles = results.length - successful.length;

    this.metrics.totalSize = successful.reduce(
      (sum, r) => sum + (r.originalSize || 0),
      0,
    );
    this.metrics.optimizedSize = successful.reduce(
      (sum, r) => sum + (r.optimizedSize || 0),
      0,
    );

    this.metrics.compressionRatio =
      this.metrics.totalSize > 0
        ? ((this.metrics.totalSize - this.metrics.optimizedSize) /
            this.metrics.totalSize) *
          100
        : 0;

    this.metrics.processingTime = successful.reduce(
      (sum, r) => sum + (r.duration || 0),
      0,
    );
    this.metrics.averageProcessingTime =
      successful.length > 0
        ? this.metrics.processingTime / successful.length
        : 0;
  }

  /**
   * Generate insights from analysis
   */
  generateInsights(results, framework) {
    // Size insights
    if (this.metrics.compressionRatio > 50) {
      this.insights.push({
        type: "excellent_compression",
        message: `Excellent compression ratio of ${this.metrics.compressionRatio.toFixed(1)}% achieved`,
        severity: "info",
        value: this.metrics.compressionRatio,
      });
    } else if (this.metrics.compressionRatio < 10) {
      this.insights.push({
        type: "low_compression",
        message: `Low compression ratio of ${this.metrics.compressionRatio.toFixed(1)}% - CSS may already be optimized`,
        severity: "info",
        value: this.metrics.compressionRatio,
      });
    }

    // Performance insights
    if (this.metrics.averageProcessingTime > 1000) {
      this.insights.push({
        type: "slow_processing",
        message: `Average processing time of ${this.metrics.averageProcessingTime.toFixed(2)}ms is high`,
        severity: "medium",
        value: this.metrics.averageProcessingTime,
      });
    }

    // Framework insights
    if (framework !== "unknown") {
      this.insights.push({
        type: "framework_detected",
        message: `${framework.charAt(0).toUpperCase() + framework.slice(1)} framework optimizations applied`,
        severity: "info",
        value: framework,
      });
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(results, framework) {
    // General recommendations
    if (this.metrics.unusedCSS > 50) {
      this.recommendations.push({
        type: "remove_unused_css",
        title: "Remove Unused CSS",
        description: `Found ${this.metrics.unusedCSS} potentially unused selectors that can be safely removed`,
        impact: "high",
        effort: "medium",
        priority: 1,
      });
    }

    if (this.metrics.duplicateRules > 10) {
      this.recommendations.push({
        type: "consolidate_duplicates",
        title: "Consolidate Duplicate Rules",
        description: `Found ${this.metrics.duplicateRules} duplicate CSS rules that can be merged`,
        impact: "medium",
        effort: "low",
        priority: 2,
      });
    }

    // Framework-specific recommendations
    switch (framework) {
      case "react":
        this.recommendations.push({
          type: "use_css_modules",
          title: "Use CSS Modules",
          description:
            "Consider using CSS Modules for better encapsulation and avoid naming conflicts",
          impact: "high",
          effort: "medium",
          priority: 3,
        });
        break;
      case "vue":
        this.recommendations.push({
          type: "use_scoped_css",
          title: "Use Scoped CSS",
          description:
            "Leverage Vue's scoped CSS to prevent style leakage between components",
          impact: "high",
          effort: "low",
          priority: 3,
        });
        break;
      case "tailwind":
        this.recommendations.push({
          type: "optimize_tailwind",
          title: "Optimize Tailwind Configuration",
          description:
            "Consider using PurgeCSS with Tailwind to remove unused utilities in production",
          impact: "high",
          effort: "low",
          priority: 1,
        });
        break;
    }

    // Performance recommendations
    if (this.warnings.some((w) => w.type === "performance_issue")) {
      this.recommendations.push({
        type: "optimize_performance",
        title: "Optimize CSS Performance",
        description:
          "Address performance issues like expensive selectors and @import rules",
        impact: "high",
        effort: "medium",
        priority: 2,
      });
    }
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(results, analysis) {
    const html = this.createHTMLTemplate(results, analysis);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `css-optimization-report-${timestamp}.html`;
    const filepath = path.join(this.options.outputPath, filename);

    await fs.ensureDir(this.options.outputPath);
    await fs.writeFile(filepath, html);

    return filepath;
  }

  /**
   * Create HTML report template
   */
  createHTMLTemplate(results, analysis) {
    const { metrics, insights, recommendations, warnings } = analysis;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Optimization Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #667eea; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section h2 { color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; }
        .insight, .recommendation, .warning { padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid; }
        .insight { background: #e3f2fd; border-color: #2196f3; }
        .recommendation { background: #e8f5e8; border-color: #4caf50; }
        .warning { background: #fff3e0; border-color: #ff9800; }
        .high { border-color: #f44336; background: #ffebee; }
        .medium { border-color: #ff9800; background: #fff3e0; }
        .low { border-color: #4caf50; background: #e8f5e8; }
        .priority { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; margin-left: 10px; }
        .priority-1 { background: #f44336; color: white; }
        .priority-2 { background: #ff9800; color: white; }
        .priority-3 { background: #4caf50; color: white; }
        .file-list { max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 5px; }
        .file-item { padding: 10px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
        .file-item:last-child { border-bottom: none; }
        .file-name { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        .compression { color: #4caf50; font-weight: bold; }
        .chart-container { height: 300px; margin: 20px 0; }
        .progress-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s ease; }
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .metrics { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 CSS Optimization Report</h1>
            <p>Generated on ${new Date().toLocaleString()} • Analysis completed in ${metrics.analysisTime.toFixed(2)}ms</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${metrics.totalFiles}</div>
                <div class="metric-label">Total Files</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.formatBytes(metrics.totalSize)}</div>
                <div class="metric-label">Original Size</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.formatBytes(metrics.optimizedSize)}</div>
                <div class="metric-label">Optimized Size</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.compressionRatio.toFixed(1)}%</div>
                <div class="metric-label">Compression Ratio</div>
            </div>
        </div>

        ${
          insights.length > 0
            ? `
        <div class="section">
            <h2>🔍 Key Insights</h2>
            ${insights
              .map(
                (insight) => `
                <div class="insight ${insight.severity}">
                    <strong>${insight.message}</strong>
                    ${insight.value ? `<span style="float: right; opacity: 0.7;">${insight.value}</span>` : ""}
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        ${
          recommendations.length > 0
            ? `
        <div class="section">
            <h2>💡 Recommendations</h2>
            ${recommendations
              .sort((a, b) => a.priority - b.priority)
              .map(
                (rec) => `
                <div class="recommendation">
                    <strong>${rec.title}</strong>
                    <span class="priority priority-${rec.priority}">Priority ${rec.priority}</span>
                    <p>${rec.description}</p>
                    <small><strong>Impact:</strong> ${rec.impact} • <strong>Effort:</strong> ${rec.effort}</small>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        ${
          warnings.length > 0
            ? `
        <div class="section">
            <h2>⚠️ Warnings</h2>
            ${warnings
              .map(
                (warning) => `
                <div class="warning ${warning.severity}">
                    <strong>${warning.file || "General"}:</strong> ${warning.message}
                    ${warning.recommendation ? `<br><small><strong>Recommendation:</strong> ${warning.recommendation}</small>` : ""}
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        <div class="section">
            <h2>📁 File Details</h2>
            <div class="file-list">
                ${results
                  .filter((r) => r.success)
                  .map((result) => {
                    const compression =
                      result.originalSize > 0
                        ? (
                            ((result.originalSize - result.optimizedSize) /
                              result.originalSize) *
                            100
                          ).toFixed(1)
                        : 0;
                    return `
                        <div class="file-item">
                            <span class="file-name">${path.basename(result.file)}</span>
                            <span class="compression">${compression}% saved</span>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    </div>

    <script>
        // Add interactive features
        document.addEventListener('DOMContentLoaded', function() {
            // Animate metrics on load
            const metricValues = document.querySelectorAll('.metric-value');
            metricValues.forEach(element => {
                const finalValue = element.textContent;
                const isPercentage = finalValue.includes('%');
                const isBytes = !finalValue.match(/^\d+$/);
                
                if (!isPercentage && !isBytes) {
                    let current = 0;
                    const increment = parseInt(finalValue) / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= parseInt(finalValue)) {
                            element.textContent = finalValue;
                            clearInterval(timer);
                        } else {
                            element.textContent = Math.floor(current);
                        }
                    }, 20);
                }
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(results, analysis) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `css-optimization-report-${timestamp}.json`;
    const filepath = path.join(this.options.outputPath, filename);

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "2.1.0",
        analysisTime: analysis.metrics.analysisTime,
      },
      results,
      analysis,
    };

    await fs.ensureDir(this.options.outputPath);
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));

    return filepath;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Reset metrics for new analysis
   */
  resetMetrics() {
    this.metrics = {
      totalFiles: 0,
      totalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
      processingTime: 0,
      unusedCSS: 0,
      duplicateRules: 0,
      criticalCSS: 0,
      frameworkSpecific: {},
    };
    this.insights = [];
    this.recommendations = [];
    this.warnings = [];
  }
}

export default AdvancedReporter;
