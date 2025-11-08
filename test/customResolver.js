// Custom Jest resolver for ES modules and complex imports
import path from 'path';
import fs from 'fs-extra';

// Cache for resolved modules
const moduleCache = new Map();

// Custom resolver function
function customResolver(basename, options) {
  const { basedir, defaultResolver } = options;
  
  // Check cache first
  const cacheKey = `${basename}-${basedir}`;
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }
  
  // Handle ES module imports with .js extension
  if (basename.startsWith('./') || basename.startsWith('../')) {
    const possiblePaths = [
      path.resolve(basedir, basename),
      path.resolve(basedir, `${basename}.js`),
      path.resolve(basedir, `${basename}.mjs`),
      path.resolve(basedir, `${basename}.cjs`),
      path.resolve(basedir, `${basename}/index.js`),
      path.resolve(basedir, `${basename}/index.mjs`),
      path.resolve(basedir, `${basename}/index.cjs`)
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle package imports (node_modules)
  if (!basename.startsWith('.') && !path.isAbsolute(basename)) {
    // Try to resolve as a package
    try {
      const packagePath = require.resolve(basename, { paths: [basedir] });
      moduleCache.set(cacheKey, packagePath);
      return packagePath;
    } catch (error) {
      // Package not found, continue with other resolutions
    }
  }
  
  // Handle CSS imports (return mock)
  if (basename.endsWith('.css')) {
    const mockPath = path.resolve(__dirname, '__mocks__/styleMock.js');
    moduleCache.set(cacheKey, mockPath);
    return mockPath;
  }
  
  // Handle image and asset imports
  const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'];
  if (assetExtensions.some(ext => basename.endsWith(ext))) {
    const mockPath = path.resolve(__dirname, '__mocks__/fileMock.js');
    moduleCache.set(cacheKey, mockPath);
    return mockPath;
  }
  
  // Handle JSON imports
  if (basename.endsWith('.json')) {
    try {
      const jsonPath = path.resolve(basedir, basename);
      if (fs.existsSync(jsonPath)) {
        moduleCache.set(cacheKey, jsonPath);
        return jsonPath;
      }
    } catch (error) {
      // JSON file not found
    }
  }
  
  // Handle TypeScript imports
  if (basename.endsWith('.ts') || basename.endsWith('.tsx')) {
    const possiblePaths = [
      path.resolve(basedir, basename),
      path.resolve(basedir, basename.replace('.ts', '.js')),
      path.resolve(basedir, basename.replace('.tsx', '.jsx'))
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle SCSS/SASS imports
  if (basename.endsWith('.scss') || basename.endsWith('.sass')) {
    const possiblePaths = [
      path.resolve(basedir, basename),
      path.resolve(basedir, basename.replace('.scss', '.css')),
      path.resolve(basedir, basename.replace('.sass', '.css'))
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle @/ alias imports (src directory)
  if (basename.startsWith('@/')) {
    const srcPath = path.resolve(process.cwd(), 'src', basename.substring(2));
    const possiblePaths = [
      srcPath,
      `${srcPath}.js`,
      `${srcPath}.mjs`,
      `${srcPath}.cjs`,
      path.join(srcPath, 'index.js'),
      path.join(srcPath, 'index.mjs'),
      path.join(srcPath, 'index.cjs')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle ~/ alias imports (project root)
  if (basename.startsWith('~/')) {
    const rootPath = path.resolve(process.cwd(), basename.substring(2));
    const possiblePaths = [
      rootPath,
      `${rootPath}.js`,
      `${rootPath}.mjs`,
      `${rootPath}.cjs`,
      path.join(rootPath, 'index.js'),
      path.join(rootPath, 'index.mjs'),
      path.join(rootPath, 'index.cjs')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle utils/ alias imports
  if (basename.startsWith('utils/')) {
    const utilsPath = path.resolve(process.cwd(), 'utils', basename.substring(6));
    const possiblePaths = [
      utilsPath,
      `${utilsPath}.js`,
      `${utilsPath}.mjs`,
      `${utilsPath}.cjs`,
      path.join(utilsPath, 'index.js'),
      path.join(utilsPath, 'index.mjs'),
      path.join(utilsPath, 'index.cjs')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle core/ alias imports
  if (basename.startsWith('core/')) {
    const corePath = path.resolve(process.cwd(), 'src/core', basename.substring(5));
    const possiblePaths = [
      corePath,
      `${corePath}.js`,
      `${corePath}.mjs`,
      `${corePath}.cjs`,
      path.join(corePath, 'index.js'),
      path.join(corePath, 'index.mjs'),
      path.join(corePath, 'index.cjs')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // Handle test/ alias imports
  if (basename.startsWith('test/')) {
    const testPath = path.resolve(process.cwd(), basename);
    const possiblePaths = [
      testPath,
      `${testPath}.js`,
      `${testPath}.mjs`,
      `${testPath}.cjs`,
      path.join(testPath, 'index.js'),
      path.join(testPath, 'index.mjs'),
      path.join(testPath, 'index.cjs')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        moduleCache.set(cacheKey, possiblePath);
        return possiblePath;
      }
    }
  }
  
  // If no custom resolution found, use default resolver
  try {
    const result = defaultResolver(basename, options);
    moduleCache.set(cacheKey, result);
    return result;
  } catch (error) {
    // If default resolver fails, try one more time with .js extension
    if (!basename.endsWith('.js') && !basename.endsWith('.mjs') && !basename.endsWith('.cjs')) {
      const jsBasename = `${basename}.js`;
      try {
        const result = defaultResolver(jsBasename, options);
        moduleCache.set(cacheKey, result);
        return result;
      } catch (jsError) {
        // Continue to throw original error
      }
    }
    
    throw error;
  }
}

// Clear cache function (for testing)
export function clearModuleCache() {
  moduleCache.clear();
}

// Get cache size (for debugging)
export function getCacheSize() {
  return moduleCache.size;
}

// Get cache entries (for debugging)
export function getCacheEntries() {
  return Array.from(moduleCache.entries());
}

// Export the resolver with Jest's expected interface
export default {
  sync: customResolver,
  async: async (basename, options) => customResolver(basename, options)
};