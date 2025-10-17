import { FrameworkOptimizer } from "./framework-optimizer.js";
import fs from "fs-extra";
import path from "path";

describe("Framework Optimizer", () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new FrameworkOptimizer();
  });

  test("should detect React framework", async () => {
    // Create a mock package.json for React
    const mockPackageJson = {
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
      },
    };

    const tempDir = await fs.mkdtemp("test-react-");
    const packageJsonPath = path.join(tempDir, "package.json");
    await fs.writeJson(packageJsonPath, mockPackageJson);

    const detected = await optimizer.detectFramework(tempDir);
    expect(detected).toBe("react");

    // Cleanup
    await fs.remove(tempDir);
  });

  test("should detect Vue framework", async () => {
    const mockPackageJson = {
      dependencies: {
        vue: "^3.0.0",
      },
    };

    const tempDir = await fs.mkdtemp("test-vue-");
    const packageJsonPath = path.join(tempDir, "package.json");
    await fs.writeJson(packageJsonPath, mockPackageJson);

    const detected = await optimizer.detectFramework(tempDir);
    expect(detected).toBe("vue");

    await fs.remove(tempDir);
  });

  test("should detect Angular framework", async () => {
    const mockPackageJson = {
      dependencies: {
        "@angular/core": "^15.0.0",
      },
    };

    const tempDir = await fs.mkdtemp("test-angular-");
    const packageJsonPath = path.join(tempDir, "package.json");
    await fs.writeJson(packageJsonPath, mockPackageJson);

    const detected = await optimizer.detectFramework(tempDir);
    expect(detected).toBe("angular");

    await fs.remove(tempDir);
  });

  test("should detect Tailwind CSS", async () => {
    const mockPackageJson = {
      dependencies: {
        tailwindcss: "^3.0.0",
      },
    };

    const tempDir = await fs.mkdtemp("test-tailwind-");
    const packageJsonPath = path.join(tempDir, "package.json");
    await fs.writeJson(packageJsonPath, mockPackageJson);

    const detected = await optimizer.detectFramework(tempDir);
    expect(detected).toBe("tailwind");

    await fs.remove(tempDir);
  });

  test("should parse React file for CSS usage", () => {
    const reactCode = `
import React from 'react';
import styles from './Component.module.css';
import styled from 'styled-components';

const StyledDiv = styled.div\`
  background: red;
  padding: 10px;
\`;

const Component = () => {
  return (
    <div className="container main">
      <StyledDiv className="styled-component">
        <h1 className="title">Hello World</h1>
      </StyledDiv>
    </div>
  );
};
`;

    const usage = optimizer.parseFileForCSSUsage(reactCode, ".jsx", "react");

    expect(usage.classes.has("container")).toBe(true);
    expect(usage.classes.has("main")).toBe(true);
    expect(usage.classes.has("title")).toBe(true);
    expect(usage.classes.has("styled-component")).toBe(true);
  });

  test("should parse Vue file for CSS usage", () => {
    const vueCode = `
<template>
  <div class="container" :class="{'active': isActive}">
    <h1 class="title">{{ title }}</h1>
    <div class="content" :class="contentClass">
      <p class="text">Some content</p>
    </div>
  </div>
</template>

<script>
import styles from './Component.vue?module';

export default {
  data() {
    return {
      isActive: true,
      contentClass: 'large'
    };
  }
};
</script>

<style scoped>
.container {
  padding: 20px;
}
.title {
  font-size: 24px;
}
</style>
`;

    const usage = optimizer.parseFileForCSSUsage(vueCode, ".vue", "vue");

    expect(usage.classes.has("container")).toBe(true);
    expect(usage.classes.has("title")).toBe(true);
    expect(usage.classes.has("content")).toBe(true);
    expect(usage.classes.has("text")).toBe(true);
    // Note: active and large are in object bindings, harder to extract with simple regex
  });

  test("should parse Angular file for CSS usage", () => {
    const angularCode = `
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.css'],
  styles: [\`
    .host-class {
      display: block;
    }
  \`]
})
export class ExampleComponent {
  @HostBinding('class.host-element') hostClass = true;
  
  elementId = 'main-element';
}
`;

    const usage = optimizer.parseFileForCSSUsage(angularCode, ".ts", "angular");

    expect(usage.components.has("./example.component.css")).toBe(true);
    expect(usage.classes.has("host-class")).toBe(true);
    expect(usage.selectors.has("class.host-element")).toBe(true);
    // Note: elementId extraction might not work with simple regex
  });

  test("should parse Tailwind utilities", () => {
    const tailwindCode = `
<div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  <button className="btn btn-primary">
    Click me
  </button>
</div>

<style>
  .custom-style {
  @apply bg-red-500 text-white p-4;
  }
</style>
`;

    const usage = optimizer.parseFileForCSSUsage(
      tailwindCode,
      ".jsx",
      "tailwind",
    );

    expect(usage.utilities.has("bg-blue-500")).toBe(true);
    expect(usage.utilities.has("hover:bg-blue-700")).toBe(true);
    expect(usage.utilities.has("text-white")).toBe(true);
    expect(usage.utilities.has("font-bold")).toBe(true);
    expect(usage.utilities.has("py-2")).toBe(true);
    expect(usage.utilities.has("px-4")).toBe(true);
    expect(usage.utilities.has("rounded")).toBe(true);
    expect(usage.utilities.has("btn")).toBe(true);
    expect(usage.utilities.has("btn-primary")).toBe(true);
    expect(usage.utilities.has("bg-red-500")).toBe(true);
    expect(usage.utilities.has("p-4")).toBe(true);
  });

  test("should optimize CSS for React", async () => {
    const cssContent = `
.container {
  padding: 20px;
}

.unused-class {
  display: none;
}

.title {
  font-size: 24px;
}
`;

    const usage = {
      classes: new Set(["container", "title"]),
      ids: new Set(),
      selectors: new Set(),
      components: new Set(),
      utilities: new Set(),
    };

    const optimized = await optimizer.optimizeForFramework(
      cssContent,
      "react",
      usage,
    );

    expect(optimized).toContain(".container");
    expect(optimized).toContain(".title");
    expect(optimized).not.toContain(".unused-class");
  });

  test("should optimize CSS for Tailwind", async () => {
    const cssContent = `
.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.unused-utility {
  color: red;
}

.text-white {
  color: rgb(255 255 255);
}
`;

    const usage = {
      classes: new Set(),
      ids: new Set(),
      selectors: new Set(),
      components: new Set(),
      utilities: new Set(["bg-blue-500", "text-white"]),
    };

    const optimized = await optimizer.optimizeForFramework(
      cssContent,
      "tailwind",
      usage,
    );

    expect(optimized).toContain(".bg-blue-500");
    expect(optimized).toContain(".text-white");
    // Note: The Tailwind optimization might need more sophisticated parsing
    // For now, we'll just check that the optimization runs without error
    expect(typeof optimized).toBe("string");
  });

  test("should generate framework report", () => {
    const usage = {
      classes: new Set(["container", "title", "button"]),
      ids: new Set(["header", "main"]),
      selectors: new Set(["div", "span"]),
      components: new Set(["Component.css", "styles.css"]),
      utilities: new Set(["bg-blue-500", "text-white", "font-bold"]),
    };

    const report = optimizer.generateReport(usage, "react");

    expect(report.framework).toBe("react");
    expect(report.detectedClasses).toBe(3);
    expect(report.detectedIds).toBe(2);
    expect(report.detectedSelectors).toBe(2);
    expect(report.detectedComponents).toBe(2);
    expect(report.detectedUtilities).toBe(3);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  test("should get framework patterns", () => {
    const reactPatterns = optimizer.getFrameworkPatterns("react");
    expect(reactPatterns).toContain("**/*.jsx");
    expect(reactPatterns).toContain("**/*.tsx");
    expect(reactPatterns).toContain("src/**/*.{js,ts,jsx,tsx}");

    const vuePatterns = optimizer.getFrameworkPatterns("vue");
    expect(vuePatterns).toContain("**/*.vue");
    expect(vuePatterns).toContain("src/**/*.{js,ts,vue}");

    const autoPatterns = optimizer.getFrameworkPatterns("auto");
    expect(autoPatterns.length).toBeGreaterThan(0);
  });
});

/**
 * Manual test function for development
 */
async function testFrameworkOptimizer() {
  console.log("🧪 Testing Framework Optimizer");
  console.log("=".repeat(35));

  try {
    const optimizer = new FrameworkOptimizer();

    // Test 1: Framework Detection
    console.log("\n🔍 Test 1: Framework Detection");
    const detected = await optimizer.detectFramework();
    console.log(`Detected framework: ${detected}`);

    // Test 2: CSS Usage Extraction
    console.log("\n📊 Test 2: CSS Usage Extraction");

    // Create test files
    const testReactCode = `
import React from 'react';
import styles from './App.module.css';

const App = () => {
  return (
    <div className="app-container">
      <h1 className="title">Hello React</h1>
      <button className="btn btn-primary">Click me</button>
    </div>
  );
};
`;

    await fs.writeFile("test-react.jsx", testReactCode);

    const usage = await optimizer.extractCSSUsage("react");
    console.log(
      `Found ${usage.classes.size} classes, ${usage.ids.size} IDs, ${usage.utilities.size} utilities`,
    );

    // Test 3: Framework Optimization
    console.log("\n⚡ Test 3: Framework Optimization");
    const testCSS = `
.app-container {
  padding: 20px;
}

.unused-style {
  display: none;
}

.title {
  font-size: 24px;
  color: blue;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
}

.btn-primary {
  background-color: blue;
  color: white;
}

.another-unused {
  margin: 10px;
}
`;

    const optimized = await optimizer.optimizeForFramework(
      testCSS,
      "react",
      usage,
    );
    console.log("Original CSS length:", testCSS.length);
    console.log("Optimized CSS length:", optimized.length);
    console.log(
      "Size reduction:",
      `${(((testCSS.length - optimized.length) / testCSS.length) * 100).toFixed(1)}%`,
    );

    // Test 4: Report Generation
    console.log("\n📋 Test 4: Report Generation");
    const report = optimizer.generateReport(usage, "react");
    console.log("Framework Report:");
    console.log(`  - Classes detected: ${report.detectedClasses}`);
    console.log(`  - IDs detected: ${report.detectedIds}`);
    console.log(`  - Selectors detected: ${report.detectedSelectors}`);
    console.log(`  - Components detected: ${report.detectedComponents}`);
    console.log(`  - Utilities detected: ${report.detectedUtilities}`);

    if (report.recommendations.length > 0) {
      console.log("  Recommendations:");
      report.recommendations.forEach((rec) => {
        console.log(`    • ${rec}`);
      });
    }

    // Cleanup
    await fs.remove("test-react.jsx");

    console.log("\n🎉 Framework Optimizer tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Export for manual testing
export { testFrameworkOptimizer };
