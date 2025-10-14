# CSS Optimizer - Agent Guidelines

## Commands

- **Test**: `npm test` (runs all Jest tests)
- **Single test**: `npm test -- test-optimizer.js` (replace filename)
- **Coverage**: `npm run test:coverage`
- **Lint CSS**: `npx stylelint style.css`
- **Format**: `npx prettier --write .`

## Code Style

- **ES6 modules**: Use `import/export` syntax
- **File naming**: kebab-case for files, camelCase for functions/variables
- **Constants**: UPPER_SNAKE_CASE for configuration objects
- **Error handling**: Try-catch blocks with descriptive error messages
- **Environment**: Use `.env` for configuration, load with `dotenv.config()`
- **Type hints**: JSDoc comments for function parameters and returns
- **Imports**: Group external libs first, then local modules
- **Async/await**: Prefer over promises for readability
- **Logging**: Use console.log for debugging, structured logging for production

## Testing

- Test files: `test-*.js` pattern
- Setup: `test-setup.js` configures test environment
- Mock API calls in tests using jest-fetch-mock
- Coverage target: main optimizer files only

## CSS Processing

- Use PostCSS plugins (autoprefixer, cssnano, sortMediaQueries)
- Safe parser for malformed CSS
- Stylelint config in `.stylelintrc.json` with relaxed rules
- Prettier for code formatting
