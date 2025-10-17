import fs from "fs-extra";
import path from "path";
import { PurgeCSSIntegration } from "./purgecss-integration.js";

describe("PurgeCSS Integration", () => {
  let purgeCSS;

  beforeAll(async () => {
    // Create test CSS file
    const testCSS = `/* Test CSS for PurgeCSS */
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

.btn-secondary {
  background: #6c757d;
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

@media (max-width: 768px) {
  .responsive {
    font-size: 14px;
  }
}

.button:hover {
  transform: scale(1.05);
}

.link:focus {
  outline: 2px solid blue;
}

:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
}

.variable-test {
  color: var(--primary-color);
  background: var(--secondary-color);
}

.preserve-me {
  color: green;
  font-size: 12px;
}

[data-attribute] {
  border: 1px solid red;
}`;

    await fs.writeFile("test-purge.css", testCSS);

    // Create test HTML file
    const testHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <link rel="stylesheet" href="test-purge.css">
</head>
<body>
    <div class="container">
        <h1 class="used-class">Test Title</h1>
        <p id="used-id">Test paragraph</p>
        
        <button class="btn btn-primary">Primary Button</button>
        <button class="btn btn-secondary">Secondary Button</button>
        
        <div class="card">
            <div class="card-header">Card Title</div>
            <div class="card-body">Card content here</div>
        </div>
        
        <div class="responsive">Responsive content</div>
        
        <button class="button">Hover Button</button>
        <a href="#" class="link">Focus Link</a>
        
        <div class="variable-test">Variable Test</div>
    </div>
</body>
</html>`;

    await fs.writeFile("test-content.html", testHTML);

    // Create test JavaScript file
    const testJS = `// Test JavaScript for PurgeCSS
document.addEventListener('DOMContentLoaded', function() {
    const element = document.querySelector('.used-class');
    if (element) {
        element.classList.add('dynamic-class');
    }
    
    const button = document.querySelector('.btn-primary');
    const card = document.getElementById('used-id');
    
    button.addEventListener('click', function() {
        this.classList.add('active');
    });
    
    const html = \`
        <div class="card">
            <div class="card-header">Dynamic Card</div>
            <div class="card-body">Dynamic content</div>
        </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', html);
});`;

    await fs.writeFile("test-content.js", testJS);

    purgeCSS = new PurgeCSSIntegration({
      content: ["test-content.html", "test-content.js"],
      css: ["test-purge.css"],
      output: "test-purged.css",
      safelist: ["preserve-me", /^data-/],
      variables: true,
      verbose: false,
    });
  });

  afterAll(async () => {
    // Cleanup test files
    const filesToClean = [
      "test-purge.css",
      "test-content.html",
      "test-content.js",
      "test-purged.css",
      "test-strict.css",
      "test-safelist.css",
    ];

    for (const file of filesToClean) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
      }
    }
  });

  test("should extract used selectors from content files", async () => {
    const usedSelectors = await purgeCSS.extractUsedSelectors([
      "test-content.html",
      "test-content.js",
    ]);

    expect(usedSelectors).toBeDefined();
    expect(Array.isArray(usedSelectors)).toBe(true);
    expect(usedSelectors.length).toBeGreaterThan(0);

    // Should contain used selectors
    expect(usedSelectors).toContain("used-class");
    expect(usedSelectors).toContain("btn");
    expect(usedSelectors).toContain("btn-primary");
    expect(usedSelectors).toContain("card");
    expect(usedSelectors).toContain("card-header");
    expect(usedSelectors).toContain("card-body");
  });

  test("should process files and remove unused CSS", async () => {
    const results = await purgeCSS.processFiles(
      ["test-purge.css"],
      ["test-content.html", "test-content.js"],
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const result = results[0];
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.finalSize).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.originalSelectors).toBeGreaterThan(0);
    expect(result.stats.preservedSelectors).toBeGreaterThan(0);
    expect(result.stats.removedSelectors).toBeGreaterThanOrEqual(0);
  });

  test("should create purged CSS file", async () => {
    const results = await purgeCSS.processFiles(
      ["test-purge.css"],
      ["test-content.html", "test-content.js"],
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const result = results[0];
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.finalSize).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.originalSelectors).toBeGreaterThan(0);
    expect(result.stats.preservedSelectors).toBeGreaterThan(0);
    expect(result.stats.removedSelectors).toBeGreaterThanOrEqual(0);

    const exists = await fs.pathExists("test-purged.css");
    expect(exists).toBe(true);

    const output = await fs.readFile("test-purged.css", "utf8");
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

  test("should handle strict mode correctly", async () => {
    const options = {
      content: ["test-content.html", "test-content.js"],
      css: ["test-purge.css"],
      output: "test-strict.css",
      verbose: false,
    };
    options.strict = true;

    const strictPurgeCSS = new PurgeCSSIntegration(options);

    const results = await strictPurgeCSS.processFiles(
      ["test-purge.css"],
      ["test-content.html", "test-content.js"],
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const result = results[0];
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.finalSize).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.originalSelectors).toBeGreaterThan(0);
    expect(result.stats.preservedSelectors).toBeGreaterThan(0);
    expect(result.stats.removedSelectors).toBeGreaterThanOrEqual(0);

    // In strict mode, should be more aggressive
    const normalResults = await purgeCSS.processFiles(
      ["test-purge.css"],
      ["test-content.html", "test-content.js"],
    );
    expect(result.stats.removedSelectors).toBeGreaterThanOrEqual(
      normalResults[0].stats.removedSelectors,
    );
  });

  test("should preserve safelisted selectors", async () => {
    const safelistPurgeCSS = new PurgeCSSIntegration({
      content: ["test-content.html", "test-content.js"],
      css: ["test-purge.css"],
      output: "test-safelist.css",
      safelist: ["preserve-me", /^data-/],
      verbose: false,
    });

    await safelistPurgeCSS.processFiles(
      ["test-purge.css"],
      ["test-content.html", "test-content.js"],
    );

    const exists = await fs.pathExists("test-safelist.css");
    expect(exists).toBe(true);

    const output = await fs.readFile("test-safelist.css", "utf8");
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);

    // Should preserve safelisted selectors even if not used
    expect(output).toContain("preserve-me");
  });
});
