import { CLIEnhancer } from "./cli-enhancer.js";

/**
 * Test the CLI Enhancer
 */
describe("CLI Enhancer", () => {
  test("should create and use progress bar", async () => {
    const { CLIEnhancer } = await import("./cli-enhancer.js");

    const enhancer = new CLIEnhancer({
      enableProgress: true,
      enableSpinner: true,
      showETA: true,
    });

    const progressBar = enhancer.createProgressBar(5, {
      label: "Test processing",
      width: 20,
      showPercentage: true,
      showETA: true,
    });

    // Test progress updates
    progressBar.update(2, "Processing file 2");
    expect(progressBar.current).toBe(2);

    progressBar.update(5, "Complete");
    expect(progressBar.current).toBe(5);
  });

  test("should create multi-step progress", async () => {
    const { CLIEnhancer } = await import("./cli-enhancer.js");

    const enhancer = new CLIEnhancer();
    const steps = ["Step 1", "Step 2", "Step 3"];

    const multiStep = enhancer.createMultiStepProgress(steps, {
      label: "Test Process",
    });

    expect(multiStep.getCurrentStep()).toBe(0);
    expect(multiStep.getProgress()).toBe(0);

    multiStep.nextStep();
    expect(multiStep.getCurrentStep()).toBe(1);
    expect(multiStep.getProgress()).toBeCloseTo(0.33, 2);
  });

  test("should create table display", () => {
    const { CLIEnhancer } = require("./cli-enhancer.js");

    const enhancer = new CLIEnhancer();
    const headers = ["File", "Size"];
    const rows = [["test.css", "1KB"]];

    const table = enhancer.createTable(headers, rows);

    expect(table).toContain("File");
    expect(table).toContain("Size");
    expect(table).toContain("test.css");
    expect(table).toContain("1KB");
  });

  test("should handle loading animation", () => {
    const { CLIEnhancer } = require("./cli-enhancer.js");

    const enhancer = new CLIEnhancer();
    const loading = enhancer.createLoading("Test loading", 100);

    expect(loading).toBeDefined();
    expect(typeof loading.stop).toBe("function");

    loading.stop("Test complete");
  });
});

/**
 * Manual test function for development
 */
async function testCLIEnhancer() {
  console.log("🧪 Testing CLI Enhancer");
  console.log("=".repeat(25));

  try {
    const { CLIEnhancer } = await import("./cli-enhancer.js");

    const enhancer = new CLIEnhancer({
      enableProgress: true,
      enableSpinner: true,
      showETA: true,
    });

    // Test 1: Progress Bar
    console.log("\n📊 Test 1: Progress Bar");
    const progressBar = enhancer.createProgressBar(10, {
      label: "Processing files",
      width: 30,
      showPercentage: true,
      showETA: true,
    });

    for (let i = 0; i <= 10; i++) {
      progressBar.update(i, `Processing file ${i}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    progressBar.complete("All files processed!");

    // Test 2: Multi-step Progress
    console.log("\n📋 Test 2: Multi-step Progress");
    const steps = [
      "Reading files",
      "Analyzing CSS",
      "Optimizing styles",
      "Writing output",
      "Generating report",
    ];

    const multiStep = enhancer.createMultiStepProgress(steps, {
      label: "CSS Optimization",
    });

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      multiStep.nextStep();
    }
    multiStep.complete();

    // Test 3: Loading Animation
    console.log("\n⏳ Test 3: Loading Animation");
    const loading = enhancer.createLoading("Processing CSS files", 2000);
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Test 4: Success Message
    console.log("\n✅ Test 4: Success Message");
    enhancer.showSuccess("CSS optimization completed successfully!");

    // Test 5: Table Display
    console.log("\n📊 Test 5: Table Display");
    const headers = ["File", "Original Size", "Optimized Size", "Compression"];
    const rows = [
      ["style.css", "15.2KB", "8.7KB", "42.8%"],
      ["theme.css", "8.4KB", "5.2KB", "38.1%"],
      ["components.css", "12.1KB", "7.3KB", "39.7%"],
    ];

    const table = enhancer.createTable(headers, rows, {
      maxWidth: 80,
      padding: 1,
    });
    console.log(table);

    // Test 6: Warning and Info Messages
    console.log("\n⚠️ Test 6: Warning and Info Messages");
    enhancer.showWarning("Some CSS rules could not be optimized");
    enhancer.showInfo("Processing completed with warnings");

    // Test 7: Interactive Prompts (simulated)
    console.log("\n❓ Test 7: Interactive Prompts (simulated)");
    console.log(
      "Note: Interactive prompts require user input, showing examples only:",
    );

    // Example of what prompts would look like
    console.log("❓ Enable minification (true): ");
    console.log("❓ Output directory (dist): ");
    console.log("❓ Browser targets (> 1%, last 2 versions, not dead): ");

    console.log("\n🎉 CLI Enhancer tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Export for manual testing
export { testCLIEnhancer };
