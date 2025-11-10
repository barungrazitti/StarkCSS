const modules = require('./modules-commonjs-fixed.js');
console.log('Module keys:', Object.keys(modules));

// Test sanitization
const testSanitize = modules.SecurityUtils.sanitizeLogData('API call with sk-1234567890abcdef1234567890abcdef');
console.log('Sanitize result:', testSanitize);

// Test CSS validation
console.log('Testing CSS validation...');
try {
  modules.SecurityUtils.validateCSSContent('a { behavior: url(script.htc); }');
  console.log('CSS validation - no error');
} catch (e) {
  console.log('CSS validation - error:', e.message);
}

// Test regex validation
console.log('Testing regex validation...');
try {
  modules.SecurityUtils.validateRegex('(.+)*');
  console.log('Regex validation - no error');
} catch (e) {
  console.log('Regex validation - error:', e.message);
}