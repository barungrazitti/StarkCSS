import { AdvancedReporter } from "./advanced-reporter.js";
import fs from "fs-extra";
import path from "path";

describe("Advanced Reporter", () => {
  let reporter;

  beforeEach(() => {
    reporter = new AdvancedReporter({
      outputPath: "./test-reports",
    });
  });

  afterEach(async () => {
    // Cleanup test reports
    await fs.remove("./test-reports");
  });

  test("should analyze CSS optimization results", async () => {
    const results = [
      {
        file: "test1.css",
        success: true,
        originalSize: 1000,
        optimizedSize: 700,
        duration: 50,
        content: `
.container { padding: 20px; }
.title { font-size: 24px; }
.unused { display: none; }
.container { padding: 20px; } /* duplicate */
        `,
      },
      {
        file: "test2.css",
        success: true,
        originalSize: 800,
        optimizedSize: 600,
        duration: 30,
        content: `
.header { background: blue; }
* { margin: 0; } /* universal selector */
        `,
      },
      {
        file: "test3.css",
        success: false,
        error: "Parse error",
      },
    ];

    const analysis = await reporter.analyzeResults(results, "react");

    expect(analysis.metrics.totalFiles).toBe(3);
    expect(analysis.metrics.successfulFiles).toBe(2);
    expect(analysis.metrics.failedFiles).toBe(1);
    expect(analysis.metrics.totalSize).toBe(1800);
    expect(analysis.metrics.optimizedSize).toBe(1300);
    expect(analysis.metrics.compressionRatio).toBeCloseTo(27.8, 1);
    expect(analysis.insights.length).toBeGreaterThan(0);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.warnings.length).toBeGreaterThan(0);
  });

  test("should detect unused CSS", async () => {
    const content = `
.specific .deep .nested .selector { color: red; }
.another .deep .nested .selector { color: blue; }
.simple { color: green; }
    `;

    const unused = reporter.findUnusedSelectors(content);
    expect(unused.length).toBe(2); // The two deeply nested selectors
  });

  test("should find duplicate CSS rules", async () => {
    const content = `
.container { padding: 20px; }
.title { font-size: 24px; }
.container { padding: 20px; } /* duplicate */
    `;

    const duplicates = reporter.findDuplicateRules(content);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0]).toContain(".container");
  });

  test("should analyze CSS specificity", async () => {
    const content = `
#id .class element { color: red; }
.class { color: blue; }
element { color: green; }
    `;

    const analysis = reporter.analyzeSpecificity(content);
    expect(analysis.highSpecificityCount).toBe(1);
    expect(analysis.averageSpecificity).toBeGreaterThan(0);
  });

  test("should calculate CSS specificity correctly", () => {
    expect(reporter.calculateSpecificity("#id")).toBe(100);
    expect(reporter.calculateSpecificity(".class")).toBe(10);
    expect(reporter.calculateSpecificity("element")).toBe(1);
    expect(reporter.calculateSpecificity("#id .class element")).toBe(110); // 100 + 10 + 1
  });

  test("should check performance issues", async () => {
    const content = `
* { margin: 0; }
@import url("styles.css");
div > ul > li > a { color: blue; }
div > ul > li > a > span { color: red; }
    `;

    const issues = reporter.checkPerformanceIssues(content);
    expect(issues.length).toBeGreaterThanOrEqual(2); // universal selector, @import, maybe expensive selectors
  });

  test("should generate HTML report", async () => {
    const results = [
      {
        file: "test.css",
        success: true,
        originalSize: 1000,
        optimizedSize: 700,
        duration: 50,
      },
    ];

    const analysis = await reporter.analyzeResults(results);
    const reportPath = await reporter.generateHTMLReport(results, analysis);

    expect(await fs.pathExists(reportPath)).toBe(true);
    const reportContent = await fs.readFile(reportPath, "utf8");
    expect(reportContent).toContain("CSS Optimization Report");
    expect(reportContent).toContain("test.css");
    expect(reportContent).toContain("30.0%"); // compression ratio
  });

  test("should generate JSON report", async () => {
    const results = [
      {
        file: "test.css",
        success: true,
        originalSize: 1000,
        optimizedSize: 700,
        duration: 50,
      },
    ];

    const analysis = await reporter.analyzeResults(results);
    const reportPath = await reporter.generateJSONReport(results, analysis);

    expect(await fs.pathExists(reportPath)).toBe(true);
    const reportContent = await fs.readFile(reportPath, "utf8");
    const report = JSON.parse(reportContent);

    expect(report.metadata).toBeDefined();
    expect(report.results).toEqual(results);
    expect(report.analysis).toEqual(analysis);
  });

  test("should format bytes correctly", () => {
    expect(reporter.formatBytes(0)).toBe("0 Bytes");
    expect(reporter.formatBytes(1024)).toBe("1 KB");
    expect(reporter.formatBytes(1048576)).toBe("1 MB");
    expect(reporter.formatBytes(1536)).toBe("1.5 KB");
  });

  test("should generate framework-specific insights", async () => {
    const results = [
      {
        file: "Component.jsx",
        success: true,
        originalSize: 1000,
        optimizedSize: 700,
        duration: 50,
        fixes: ["CSS Modules optimization"],
      },
    ];

    const analysis = await reporter.analyzeResults(results, "react");

    expect(analysis.metrics.frameworkSpecific.react).toBeDefined();
    expect(analysis.metrics.frameworkSpecific.react.files).toBe(1);
    expect(
      analysis.recommendations.some((r) => r.type === "use_css_modules"),
    ).toBe(true);
  });

  test("should handle empty results", async () => {
    const analysis = await reporter.analyzeResults([]);

    expect(analysis.metrics.totalFiles).toBe(0);
    expect(analysis.metrics.successfulFiles).toBe(0);
    expect(analysis.metrics.failedFiles).toBe(0);
    expect(analysis.metrics.compressionRatio).toBe(0);
  });

  test("should generate recommendations based on analysis", async () => {
    const results = [
      {
        file: "test.css",
        success: true,
        originalSize: 1000,
        optimizedSize: 700,
        duration: 50,
        content: `
.specific .deep .nested .selector { color: red; }
.another .deep .nested .selector { color: blue; }
.duplicate { margin: 10px; }
.duplicate { margin: 10px; }
        `,
      },
    ];

    const analysis = await reporter.analyzeResults(results, "react");

    // Should have at least framework-specific recommendations
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });
});

/**
 * Manual test function for development
 */
async function testAdvancedReporter() {
  console.log("🧪 Testing Advanced Reporter");
  console.log("=".repeat(35));

  try {
    const reporter = new AdvancedReporter({
      outputPath: "./test-reports",
    });

    // Test 1: Analyze Results
    console.log("\n📊 Test 1: Analyze Results");
    const results = [
      {
        file: "styles.css",
        success: true,
        originalSize: 5000,
        optimizedSize: 3000,
        duration: 150,
        content: `
.container { padding: 20px; }
.title { font-size: 24px; }
.unused-class { display: none; }
.another-unused { color: red; }
.container { padding: 20px; } /* duplicate */
* { margin: 0; } /* universal selector */
#very .specific .deep .nested .selector { color: blue; }
        `,
      },
      {
        file: "theme.css",
        success: true,
        originalSize: 3000,
        optimizedSize: 2100,
        duration: 80,
        content: `
@import url("reset.css");
.header { background: #333; }
.btn { padding: 10px; }
        `,
      },
      {
        file: "broken.css",
        success: false,
        error: "Parse error: Unexpected token",
      },
    ];

    const analysis = await reporter.analyzeResults(results, "react");
    console.log(
      `Analysis completed in ${analysis.metrics.analysisTime.toFixed(2)}ms`,
    );
    console.log(
      `Files: ${analysis.metrics.totalFiles} (${analysis.metrics.successfulFiles} successful, ${analysis.metrics.failedFiles} failed)`,
    );
    console.log(
      `Compression: ${analysis.metrics.compressionRatio.toFixed(1)}%`,
    );
    console.log(`Insights: ${analysis.insights.length}`);
    console.log(`Recommendations: ${analysis.recommendations.length}`);
    console.log(`Warnings: ${analysis.warnings.length}`);

    // Test 2: Generate HTML Report
    console.log("\n📄 Test 2: Generate HTML Report");
    const htmlReportPath = await reporter.generateHTMLReport(results, analysis);
    console.log(`HTML report generated: ${htmlReportPath}`);

    // Test 3: Generate JSON Report
    console.log("\n📋 Test 3: Generate JSON Report");
    const jsonReportPath = await reporter.generateJSONReport(results, analysis);
    console.log(`JSON report generated: ${jsonReportPath}`);

    // Test 4: Show Sample Insights
    console.log("\n🔍 Test 4: Sample Insights");
    analysis.insights.slice(0, 3).forEach((insight, index) => {
      console.log(
        `  ${index + 1}. [${insight.severity.toUpperCase()}] ${insight.message}`,
      );
    });

    // Test 5: Show Sample Recommendations
    console.log("\n💡 Test 5: Sample Recommendations");
    analysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} (Priority ${rec.priority})`);
      console.log(`     ${rec.description}`);
    });

    // Test 6: Show Sample Warnings
    console.log("\n⚠️ Test 6: Sample Warnings");
    analysis.warnings.slice(0, 3).forEach((warning, index) => {
      console.log(
        `  ${index + 1}. [${warning.severity.toUpperCase()}] ${warning.file}: ${warning.message}`,
      );
    });

    console.log("\n🎉 Advanced Reporter tests completed successfully!");
    console.log(`📁 Check the ./test-reports directory for generated reports`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Export for manual testing
export { testAdvancedReporter };
