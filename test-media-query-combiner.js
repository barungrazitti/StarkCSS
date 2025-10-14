import { combineDuplicateMediaQueries } from "./media-query-combiner.js";

describe("Media Query Combiner", () => {
  test("combines duplicate media queries", () => {
    const css = `
      .a { color: red; }
      @media (max-width: 480px) {
        .mobile { display: block; }
      }
      .b { color: blue; }
      @media screen and (max-width: 480px) {
        .mobile2 { display: none; }
      }
      @media (max-width: 768px) {
        .tablet { display: block; }
      }
      @media only screen and (max-width: 480px) {
        .mobile3 { font-size: 14px; }
      }
    `;

    const result = combineDuplicateMediaQueries(css);

    expect(result.count).toBe(2); // Combined 2 sets of duplicates
    expect(result.css).toContain("@media (max-width: 480px)");
    expect(result.css).toContain(".mobile { display: block; }");
    expect(result.css).toContain(".mobile2 { display: none; }");
    expect(result.css).toContain(".mobile3 { font-size: 14px; }");
    expect(result.css).toContain("@media (max-width: 768px)");
  });

  test("handles no duplicates", () => {
    const css = `
      .a { color: red; }
      @media (max-width: 480px) {
        .mobile { display: block; }
      }
      @media (max-width: 768px) {
        .tablet { display: block; }
      }
    `;

    const result = combineDuplicateMediaQueries(css);

    expect(result.count).toBe(0);
    expect(result.css).toBe(css.trim());
  });

  test("normalizes media query parameters", () => {
    const css = `
      @media screen and (max-width: 480px) {
        .a { color: red; }
      }
      @media only screen and (max-width: 480px) {
        .b { color: blue; }
      }
      @media (max-width: 480px) {
        .c { color: green; }
      }
    `;

    const result = combineDuplicateMediaQueries(css);

    expect(result.count).toBe(2);
    expect(result.css.match(/@media[^{]+/g).length).toBe(1);
  });

  test("handles empty CSS", () => {
    const result = combineDuplicateMediaQueries("");

    expect(result.count).toBe(0);
    expect(result.css).toBe("");
  });

  test("handles CSS without media queries", () => {
    const css = `
      .a { color: red; }
      .b { color: blue; }
      .c { color: green; }
    `;

    const result = combineDuplicateMediaQueries(css);

    expect(result.count).toBe(0);
    expect(result.css).toBe(css.trim());
  });
});
