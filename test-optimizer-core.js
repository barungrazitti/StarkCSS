import { lintAndFixCss } from '../css-optimizer.js';
import fs from 'fs-extra';

describe('CSS Linter and Fixer', () => {
  const validCSS = 'body { color: red; }\n  h1 { font-size: 20px; }';
  const invalidCSS = 'body { color: red }\n  h1 { margin: auto 20px; }';

  test('should fix CSS syntax errors', async () => {
    const result = await lintAndFixCss(invalidCSS, 'test.css');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.fixedCss).not.toContain('color: red }');
    expect(result.fixedCss).toContain('color: red;');
  });

  test('should handle valid CSS', async () => {
    const result = await lintAndFixCss(validCSS, 'test.css');
    expect(result.errors.length).toBe(0);
    expect(result.fixedCss).toBe(validCSS);
  });
});