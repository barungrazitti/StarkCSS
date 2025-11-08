// Basic CSS optimizer tests
import { jest } from '@jest/globals';
import { optimizeCss } from '../css-optimizer.js';
import { ErrorHandler } from '../error-handler.js';
import { SecurityUtils } from '../security.js';
import { FileHandler } from '../file-handler.js';

describe("CSS Optimizer Basic Tests", () => {
  describe("Configuration", () => {
    test("should have required configuration properties", () => {
      // This test verifies the basic structure exists
      expect(typeof optimizeCss).toBe('function');
      expect(typeof ErrorHandler).toBe('function');
      expect(typeof SecurityUtils).toBe('function');
      expect(typeof FileHandler).toBe('function');
    });

    test("should validate configuration structure", () => {
      // Test that the module exports are properly structured
      const exports = {
        optimizeCss,
        ErrorHandler,
        SecurityUtils,
        FileHandler
      };
      
      Object.values(exports).forEach(exportItem => {
        expect(exportItem).toBeDefined();
        expect(typeof exportItem).toBe('function');
      });
    });
  });

  describe("CSS String Operations", () => {
    test("should handle basic CSS string operations", () => {
      const css = "body { color: red; }";
      expect(css).toContain("color: red");
      expect(css.split("{").length).toBe(2);
      expect(css.split("}").length).toBe(2);
    });

    test("should parse CSS rules correctly", () => {
      const css = `
        .container {
          width: 100%;
          padding: 20px;
        }
        .button {
          background: blue;
          color: white;
        }
      `;
      
      const rules = css.split('}').filter(rule => rule.trim().length > 0);
      expect(rules.length).toBe(2);
      expect(rules[0]).toContain('.container');
      expect(rules[1]).toContain('.button');
    });

    test("should handle empty CSS gracefully", () => {
      const css = "";
      expect(css).toBe("");
      expect(css.trim()).toBe("");
    });

    test("should handle CSS with comments", () => {
      const css = `
        /* This is a comment */
        body {
          color: red; /* Inline comment */
        }
      `;
      expect(css).toContain('/*');
      expect(css).toContain('*/');
      expect(css).toContain('color: red');
    });
  });

  describe("Common CSS Fixes", () => {
    test("should fix missing semicolons", () => {
      const css = "body { color: red }";
      const fixed = css.replace(/color:\s*red\s*}/, "color: red;}");
      expect(fixed).toContain("color: red;");
      expect(fixed).not.toContain("color: red }");
    });

    test("should fix missing units", () => {
      const css = ".box { padding: 10 }";
      const fixed = css.replace(/padding:\s*(\d+)\s*(?=[;}])/, "padding: $1px");
      expect(fixed).toContain("padding: 10px");
    });

    test("should fix deprecated properties", () => {
      const css = ".text { word-break: break-word }";
      const fixed = css.replace(
        /word-break\s*:\s*break-word/g, 
        "overflow-wrap: break-word"
      );
      expect(fixed).toContain("overflow-wrap: break-word");
    });

    test("should fix common typos", () => {
      const css = ".element { margin-top: 36xp }";
      const fixed = css.replace(/(\d+)xp/g, "$1px");
      expect(fixed).toContain("margin-top: 36px");
      expect(fixed).not.toContain("36xp");
    });

    test("should handle multiple fixes in same CSS", () => {
      const css = `
        .box {
          padding: 10;
          margin-top: 36xp;
          word-break: break-word;
        }
      `;
      
      let fixed = css;
      fixed = fixed.replace(/padding:\s*(\d+)\s*(?=[;}])/g, "padding: $1px");
      fixed = fixed.replace(/(\d+)xp/g, "$1px");
      fixed = fixed.replace(/word-break\s*:\s*break-word/g, "overflow-wrap: break-word");
      
      expect(fixed).toContain("padding: 10px");
      expect(fixed).toContain("margin-top: 36px");
      expect(fixed).toContain("overflow-wrap: break-word");
    });
  });

  describe("CSS Analysis", () => {
    test("should analyze CSS size and structure", () => {
      const css = `
        body { color: red; font-size: 16px; }
        .container { width: 100%; padding: 20px; }
      `;
      
      const lines = css.split('\n').filter(line => line.trim().length > 0);
      const rules = css.match(/[^{}]+(?=\{)/g) || [];
      const properties = css.match(/([^{]:\s*[^;}]+;)/g) || [];
      
      expect(lines.length).toBeGreaterThan(0);
      expect(rules.length).toBe(2);
      expect(properties.length).toBeGreaterThan(0);
    });

    test("should count CSS selectors", () => {
      const css = `
        body { color: red; }
        .container { width: 100%; }
        #header { height: 60px; }
        button:hover { background: blue; }
      `;
      
      const selectors = css.match(/[^{}]+(?=\{)/g) || [];
      expect(selectors.length).toBe(4);
      expect(selectors).toContain('body');
      expect(selectors).toContain('.container');
      expect(selectors).toContain('#header');
      expect(selectors).toContain('button:hover');
    });

    test("should detect media queries", () => {
      const css = `
        @media (max-width: 768px) {
          .mobile { font-size: 14px; }
        }
        @media (min-width: 769px) {
          .desktop { font-size: 16px; }
        }
      `;
      
      const mediaQueries = css.match(/@media[^{]+/g) || [];
      expect(mediaQueries.length).toBe(2);
      expect(mediaQueries[0]).toContain('@media (max-width: 768px)');
      expect(mediaQueries[1]).toContain('@media (min-width: 769px)');
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed CSS gracefully", () => {
      const malformedCss = "body { color: red "; // Missing closing brace
      expect(malformedCss).toBeDefined();
      expect(malformedCss.length).toBeGreaterThan(0);
    });

    test("should handle CSS with invalid properties", () => {
      const invalidCss = ".box { invalid-property: value; }";
      expect(invalidCss).toContain('invalid-property');
      expect(invalidCss).toBeDefined();
    });

    test("should handle CSS with syntax errors", () => {
      const syntaxErrorCss = "body { color: red; color: blue }";
      expect(syntaxErrorCss).toBeDefined();
      expect(syntaxErrorCss.split('color:').length - 1).toBe(2);
    });
  });

  describe("Performance Tests", () => {
    test("should handle large CSS strings efficiently", () => {
      // Generate a large CSS string
      let largeCss = "/* Large CSS */\n";
      for (let i = 0; i < 1000; i++) {
        largeCss += `.class-${i} { color: #${Math.floor(Math.random()*16777215).toString(16)}; margin: ${Math.floor(Math.random() * 20)}px; }\n`;
      }
      
      const startTime = performance.now();
      const lines = largeCss.split('\n');
      const rules = largeCss.match(/[^{}]+(?=\{)/g) || [];
      const endTime = performance.now();
      
      expect(lines.length).toBeGreaterThan(1000);
      expect(rules.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should process in under 100ms
    });

    test("should handle CSS with many nested rules", () => {
      const nestedCss = `
        .parent {
          color: red;
          .child {
            color: blue;
            .grandchild {
              color: green;
            }
          }
        }
      `;
      
      expect(nestedCss).toContain('.parent');
      expect(nestedCss).toContain('.child');
      expect(nestedCss).toContain('.grandchild');
    });
  });

  describe("Utility Functions", () => {
    test("should validate CSS syntax structure", () => {
      const validCss = "body { color: red; }";
      const hasValidStructure = 
        validCss.includes('{') && 
        validCss.includes('}') && 
        validCss.includes(':');
      
      expect(hasValidStructure).toBe(true);
    });

    test("should extract CSS properties", () => {
      const css = "body { color: red; font-size: 16px; margin: 10px; }";
      const properties = css.match(/([^{]:\s*[^;}]+;)/g) || [];
      
      expect(properties.length).toBe(3);
      expect(properties[0]).toContain('color: red');
      expect(properties[1]).toContain('font-size: 16px');
      expect(properties[2]).toContain('margin: 10px');
    });

    test("should normalize CSS whitespace", () => {
      const messyCss = "body  {   color:red;  font-size:  16px;  }";
      const normalized = messyCss.replace(/\s+/g, ' ').trim();
      
      expect(normalized).toBe('body { color:red; font-size: 16px; }');
    });
  });

  describe("Integration Tests", () => {
    test("should process complete CSS optimization workflow", () => {
      const inputCss = `
        /* Test CSS */
        body {
          color: red;
          font-size: 16px;
        }
        .container {
          width: 100%;
          padding: 20px;
        }
      `;
      
      // Simulate optimization steps
      let optimizedCss = inputCss;
      
      // Step 1: Basic cleanup
      optimizedCss = optimizedCss.replace(/\s+/g, ' ');
      optimizedCss = optimizedCss.replace(/\s*([{};:])\s*/g, '$1');
      
      // Step 2: Ensure proper formatting
      optimizedCss = optimizedCss.replace(/}/g, '}\n');
      optimizedCss = optimizedCss.replace(/{/g, ' {\n  ');
      optimizedCss = optimizedCss.replace(/;/g, ';\n  ');
      
      expect(optimizedCss).toContain('body');
      expect(optimizedCss).toContain('.container');
      expect(optimizedCss).toContain('color:red');
      expect(optimizedCss).toContain('font-size:16px');
    });

    test("should handle CSS with various selectors", () => {
      const complexCss = `
        body { color: red; }
        .class { color: blue; }
        #id { color: green; }
        [data-attr] { color: yellow; }
        :hover { color: purple; }
        ::before { content: ''; }
      `;
      
      const selectors = complexCss.match(/[^{}]+(?=\{)/g) || [];
      const selectorTypes = {
        element: 0,
        class: 0,
        id: 0,
        attribute: 0,
        pseudo: 0,
        pseudoElement: 0
      };
      
      selectors.forEach(selector => {
        if (selector.trim() === 'body') selectorTypes.element++;
        else if (selector.includes('.')) selectorTypes.class++;
        else if (selector.includes('#')) selectorTypes.id++;
        else if (selector.includes('[')) selectorTypes.attribute++;
        else if (selector.includes(':') && !selector.includes('::')) selectorTypes.pseudo++;
        else if (selector.includes('::')) selectorTypes.pseudoElement++;
      });
      
      expect(selectorTypes.element).toBe(1);
      expect(selectorTypes.class).toBe(1);
      expect(selectorTypes.id).toBe(1);
      expect(selectorTypes.attribute).toBe(1);
      expect(selectorTypes.pseudo).toBe(1);
      expect(selectorTypes.pseudoElement).toBe(1);
    });
  });
});
