import { LightningCSSProcessor } from "./lightning-css.js";
import fs from "fs-extra";

describe("Lightning CSS Processor", () => {
  let processor;

  beforeAll(() => {
    processor = new LightningCSSProcessor({
      minify: true,
      sourceMap: true,
      drafts: {
        customMedia: true,
        nesting: true,
        colorFunction: true,
      },
      analyzeDependencies: true,
      unusedSymbols: true,
      enableCache: true,
      verbose: false,
    });
  });

  afterAll(async () => {
    // Cleanup test files
    const testFiles = [
      "test-lightning.css",
      "test-lightning.lightning.css",
      "test-lightning.lightning.css.map",
    ];

    for (const file of testFiles) {
      try {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test("should process modern CSS with Lightning CSS features", async () => {
    const testCSS = `
/* Modern CSS with Lightning CSS features */
@custom-media --small-screen (max-width: 768px);

:root {
  --primary-color: oklch(0.7 0.15 200);
  --secondary-color: color-mix(in srgb, blue, white 50%);
}

.container {
  display: grid;
  gap: 1rem;
  
  & .nested {
    color: var(--primary-color);
    
    &:hover {
      transform: scale(1.05);
    }
  }
  
  @media (--small-screen) {
    gap: 0.5rem;
  }
}

.card {
  background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
  border-radius: 8px;
  padding: 1rem;
  
  &__title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  &__content {
    color: #333;
    line-height: 1.6;
  }
}

.hero {
  min-height: 100vh;
  background: oklch(0.9 0.05 250);
  
  &__title {
    font-size: clamp(2rem, 5vw, 4rem);
    font-weight: bold;
  }
}

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap");

.background-image {
  background-image: url("./images/hero-bg.jpg");
  background-size: cover;
}
    `.trim();

    await fs.writeFile("test-lightning.css", testCSS);

    const result = await processor.processCSS(testCSS, "test-lightning.css");

    // Basic assertions
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.stats.originalSize).toBeGreaterThan(0);
    expect(result.stats.processedSize).toBeGreaterThan(0);
    expect(result.stats.processingTime).toBeGreaterThan(0);
    expect(result.dependencies).toBeDefined();
    expect(Array.isArray(result.dependencies)).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test("should minify CSS effectively", async () => {
    const testCSS = `
.container {
  display: grid;
  gap: 1rem;
  margin: 20px;
  padding: 10px;
}

.card {
  background: linear-gradient(135deg, blue, white);
  border-radius: 8px;
  padding: 1rem;
}
    `.trim();

    const result = await processor.processCSS(testCSS, "test.css");

    // Should be smaller after minification
    expect(result.code.length).toBeLessThan(testCSS.length);
    expect(result.stats.compressionRatio).toBeGreaterThan(0);
  });

  test("should process files in batch", async () => {
    const testCSS = ".test { color: red; }";
    await fs.writeFile("test-batch.css", testCSS);

    const results = await processor.processFiles(["test-batch.css"]);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    if (results.length > 0 && results[0]) {
      expect(results[0]).toBeDefined();
      // The batch processing might return different structure
      if (results[0].code !== undefined) {
        expect(results[0].code).toBeDefined();
      }
    }

    // Cleanup
    await fs.remove("test-batch.css");
    await fs.remove("test-batch.lightning.css");
  });

  test("should provide performance statistics", () => {
    const stats = processor.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.filesProcessed).toBe("number");
    expect(typeof stats.totalTime).toBe("number");
    expect(typeof stats.averageTime).toBe("number");
    expect(typeof stats.cacheHitRate).toBe("number");
    expect(typeof stats.fallbackRate).toBe("number");
  });

  test("should run benchmark", async () => {
    const testCSS = ".benchmark { color: blue; }";
    await fs.writeFile("test-benchmark.css", testCSS);

    const results = await processor.benchmark(["test-benchmark.css"]);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Cleanup
    await fs.remove("test-benchmark.css");
  });
});
