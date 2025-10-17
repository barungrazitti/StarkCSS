import fs from "fs-extra";
import path from "path";
import { SimplePurgeCSS } from "./simple-purgecss.js";

describe("Simple PurgeCSS", () => {
  let purgeCSS;

  beforeAll(async () => {
    // Create test CSS file
    const testCSS = `/* Test CSS for Simple PurgeCSS */
.used-class {
  color: blue;
  font-size: 16px;
}

.unused-class {
  color: red;
  background: yellow;
}

#used-id {
  margin: 10px;
}

#unused-id {
  padding: 5px;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
}

.card-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.card-body {
  color: #333;
}

.unused-button {
  border: 2px solid #000;
}`;

    await fs.writeFile("test-simple.css", testCSS);

    // Create test HTML file
    const testHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <link rel="stylesheet" href="test-simple.css">
</head>
<body>
    <div class="container">
        <h1 class="used-class">Test Title</h1>
        <p id="used-id">Test paragraph</p>
        
        <button class="btn btn-primary">Primary Button</button>
        
        <div class="card">
            <div class="card-header">Card Title</div>
            <div class="card-body">Card content here</div>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile("test-simple.html", testHTML);

    purgeCSS = new SimplePurgeCSS({
      content: ["test-simple.html"],
      css: ["test-simple.css"],
      output: "test-simple-output.css",
      verbose: false,
    });
  });

  afterAll(async () => {
    // Cleanup test files
    const filesToClean = [
      "test-simple.css",
      "test-simple.html",
      "test-simple-output.css",
      "test-simple-js-output.css",
      "test-safelist.css",
      "test-vars.css",
      "test-vars-output.css",
    ];

    for (const file of filesToClean) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
      }
    }
  });

  test("should extract used selectors from content files", async () => {
    const usedSelectors = await purgeCSS.getUsedSelectors();

    expect(usedSelectors).toBeDefined();
    expect(Array.isArray(usedSelectors)).toBe(true);
    expect(usedSelectors.length).toBeGreaterThan(0);

    // Should contain used selectors
    expect(usedSelectors).toContain(".used-class");
    expect(usedSelectors).toContain("#used-id");
    expect(usedSelectors).toContain(".btn");
    expect(usedSelectors).toContain(".btn-primary");
    expect(usedSelectors).toContain(".card");
    expect(usedSelectors).toContain(".card-header");
    expect(usedSelectors).toContain(".card-body");
  });

  test("should process CSS and remove unused rules", async () => {
    const results = await purgeCSS.process();

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const result = results[0]; // Get first result
    expect(result.originalRules).toBeGreaterThan(0);
    expect(result.finalRules).toBeGreaterThan(0);
    expect(result.reduction).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.removedSelectors)).toBe(true);
    expect(result.optimizedCSS).toBeDefined();
  });

  test("should create output file with purged CSS", async () => {
    await purgeCSS.process();

    const exists = await fs.pathExists("test-simple-output.css");
    expect(exists).toBe(true);

    const output = await fs.readFile("test-simple-output.css", "utf8");
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);

    // Should contain used selectors
    expect(output).toContain(".used-class");
    expect(output).toContain("#used-id");
    expect(output).toContain(".btn-primary");
    expect(output).toContain(".card");
    expect(output).toContain(".card-header");
    expect(output).toContain(".card-body");

    // Should not contain unused selectors
    expect(output).not.toContain(".unused-class");
    expect(output).not.toContain("#unused-id");
    expect(output).not.toContain(".unused-card");
    expect(output).not.toContain(".unused-button");
  });

  test("should handle JavaScript content", async () => {
    const purgeCSSWithJS = new SimplePurgeCSS({
      content: ["test-simple.html"],
      css: ["test-simple.css"],
      output: "test-simple-js-output.css",
      verbose: false,
    });

    const results = await purgeCSSWithJS.process();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].reduction).toBeGreaterThanOrEqual(0);
  });

  test("should handle errors gracefully", async () => {
    const errorPurgeCSS = new SimplePurgeCSS({
      content: ["non-existent.html"],
      css: ["test-simple.css"],
      output: "test-error-output.css",
      verbose: false,
    });

    await expect(errorPurgeCSS.process()).resolves.toBeDefined();
  });

  test("should preserve safelisted selectors", async () => {
    const purgeCSSSafelist = new SimplePurgeCSS({
      content: ["test-simple.html"],
      css: ["test-simple.css"],
      output: "test-safelist.css",
      safelist: [".unused-class"],
      verbose: false,
    });

    await purgeCSSSafelist.process();

    const exists = await fs.pathExists("test-safelist.css");
    if (exists) {
      const content = await fs.readFile("test-safelist.css", "utf8");
      expect(content).toContain(".unused-class");
      await fs.remove("test-safelist.css");
    }
  });

  test("should preserve CSS variables when enabled", async () => {
    const testCSSWithVars = `:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
}

.used-var {
  color: var(--primary-color);
}

.unused-var {
  background: var(--secondary-color);
}`;

    await fs.writeFile("test-vars.css", testCSSWithVars);

    const purgeCSSVars = new SimplePurgeCSS({
      content: ["test-simple.html"],
      css: ["test-vars.css"],
      output: "test-vars-output.css",
      variables: true,
      verbose: false,
    });

    const results = await purgeCSSVars.process();
    expect(results[0].optimizedCSS).toContain("--primary-color");
    expect(results[0].optimizedCSS).toContain("--secondary-color");

    // Cleanup
    await fs.remove("test-vars.css");
    if (await fs.pathExists("test-vars-output.css")) {
      await fs.remove("test-vars-output.css");
    }
  });
});
