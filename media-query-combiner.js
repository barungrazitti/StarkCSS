/**
 * Combine duplicate media queries to reduce file size
 */
export function combineDuplicateMediaQueries(css) {
  const mediaQueries = new Map();
  let processedCss = css;
  let combineCount = 0;

  // Find all media queries with proper brace matching
  const mediaQueryMatches = [];
  let pos = 0;

  while (pos < css.length) {
    const mediaStart = css.indexOf("@media", pos);
    if (mediaStart === -1) break;

    const openBrace = css.indexOf("{", mediaStart);
    if (openBrace === -1) break;

    const params = css.substring(mediaStart + 6, openBrace).trim();

    // Find matching closing brace
    let braceCount = 1;
    let searchPos = openBrace + 1;
    let closeBrace = openBrace;

    while (searchPos < css.length && braceCount > 0) {
      if (css[searchPos] === "{") braceCount++;
      else if (css[searchPos] === "}") braceCount--;

      if (braceCount === 0) {
        closeBrace = searchPos;
        break;
      }
      searchPos++;
    }

    if (braceCount === 0) {
      const fullMatch = css.substring(mediaStart, closeBrace + 1);
      const content = css.substring(openBrace + 1, closeBrace);

      mediaQueryMatches.push({
        fullMatch,
        params,
        content: content.trim(),
        index: mediaStart,
      });
    }

    pos = closeBrace + 1;
  }

  // Normalize media query parameters for comparison
  const normalizeMediaQuery = (params) => {
    return params
      .toLowerCase() // Case insensitive
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/^\s*only\s+/, "") // Remove 'only' keyword at start
      .replace(/^\s*screen\s+/, "") // Remove 'screen' keyword at start
      .replace(/^\s*and\s+/, "") // Remove 'and' keyword at start
      .replace(/\s+screen\s+/g, " ") // Remove all 'screen' keywords
      .replace(/\s+only\s+/g, " ") // Remove all 'only' keywords
      .replace(/\s+and\s+/g, " and ") // Normalize 'and' keywords
      .replace(/\band\s+and\b/g, "and") // Remove duplicate 'and'
      .replace(/^\s+and\s+/, "") // Remove 'and' at start
      .trim();
  };

  // Group by normalized query parameters
  for (const match of mediaQueryMatches) {
    const normalizedParams = normalizeMediaQuery(match.params);

    if (!mediaQueries.has(normalizedParams)) {
      mediaQueries.set(normalizedParams, {
        originalParams: match.params,
        queries: [],
      });
    }
    mediaQueries.get(normalizedParams).queries.push({
      content: match.content,
      fullMatch: match.fullMatch,
      index: match.index,
      originalParams: match.params,
    });
  }

  // Process duplicates
  const replacements = [];
  for (const [normalizedParams, data] of mediaQueries) {
    if (data.queries.length > 1) {
      // Combine unique content
      const allContent = data.queries.map((q) => q.content);
      const uniqueContent = [...new Set(allContent)];
      const combinedContent = uniqueContent.join("\n\n");

      // Use the first original params for consistency
      const newMediaQuery = `@media ${data.originalParams} {\n${combinedContent}\n}`;

      // Mark all occurrences for replacement
      data.queries.forEach((query, i) => {
        if (i === 0) {
          // Replace first occurrence with combined
          replacements.push({
            start: query.index,
            end: query.index + query.fullMatch.length,
            replacement: newMediaQuery,
          });
        } else {
          // Remove duplicates
          replacements.push({
            start: query.index,
            end: query.index + query.fullMatch.length,
            replacement: "",
          });
        }
      });

      combineCount += data.queries.length - 1;
    }
  }

  // Apply replacements from end to start
  replacements.sort((a, b) => b.start - a.start);
  for (const repl of replacements) {
    processedCss =
      processedCss.slice(0, repl.start) +
      repl.replacement +
      processedCss.slice(repl.end);
  }

  // Clean up extra whitespace
  processedCss = processedCss
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");

  return { css: processedCss, count: combineCount };
}
