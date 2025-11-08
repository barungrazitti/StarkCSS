# CSS Optimizer - Project Commands & Standards

## Development Commands

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- test-optimizer.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality
```bash
# Lint CSS files
npx stylelint style.css

# Format code with Prettier
npx prettier --write .

# Check formatting
npx prettier --check .

# Lint JavaScript (if ESLint is added)
npm run lint
```

### Build & Optimization
```bash
# Basic optimization
npm run optimize

# Advanced optimization with AI
npm run optimize:advanced

# Optimization with minification
npm run optimize:minify

# Optimization without backup
npm run optimize:no-backup

# Basic version without AI
npm run optimize:basic
```

### Development
```bash
# Start development server (if applicable)
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

## Code Style Standards

### JavaScript/TypeScript
- **Modules**: Use ES6 `import/export` syntax
- **Naming**: 
  - Files: kebab-case (e.g., `css-optimizer.js`)
  - Functions/Variables: camelCase (e.g., `optimizeCss`)
  - Constants: UPPER_SNAKE_CASE (e.g., `CONFIG`)
  - Classes: PascalCase (e.g., `ErrorHandler`)
- **Imports**: Group external libs first, then local modules
- **Error Handling**: Always use try-catch with descriptive messages
- **Async/Await**: Prefer over promises for readability
- **Comments**: JSDoc for all public functions and classes

### CSS
- **Linting**: Use Stylelint with standard config
- **Formatting**: Prettier for consistent formatting
- **Properties**: Order consistently (alphabetical or logical groups)
- **Selectors**: Use BEM methodology when possible
- **Variables**: Use CSS custom properties for theming

### Testing
- **Files**: `test-*.js` pattern
- **Framework**: Jest with ES modules support
- **Coverage**: Target 80%+ coverage for core files
- **Mocks**: Use jest-fetch-mock for API calls
- **Setup**: Common setup in `test-setup.js`

### Configuration
- **Environment**: Use `.env` files with dotenv
- **Validation**: Validate all environment variables
- **Defaults**: Provide sensible defaults for all options
- **Security**: Never commit sensitive data

## Project Structure

```
css-optimizer/
├── src/                    # Source code (recommended structure)
│   ├── core/              # Core optimization logic
│   ├── utils/             # Utility functions
│   ├── plugins/           # PostCSS plugins
│   └── cli/               # CLI interface
├── test/                  # Test files
├── docs/                  # Documentation
├── .cache/               # Cache directory
├── .env.example          # Environment template
├── .stylelintrc.json     # Stylelint config
├── jest.config.js        # Jest config
├── package.json          # Dependencies and scripts
└── README.md            # Project documentation
```

## Best Practices Checklist

### ✅ Code Quality
- [ ] All functions have JSDoc comments
- [ ] Consistent naming conventions used
- [ ] Proper error handling implemented
- [ ] Code follows ESLint/Stylelint rules
- [ ] No console.log in production code
- [ ] Constants used for magic numbers/strings

### ✅ Testing
- [ ] Unit tests for all utility functions
- [ ] Integration tests for main features
- [ ] Mock external dependencies
- [ ] Test coverage above 80%
- [ ] Tests run in CI/CD pipeline

### ✅ Security
- [ ] Input validation for all user inputs
- [ ] Path traversal protection
- [ ] API key sanitization in logs
- [ ] No sensitive data in commits
- [ ] Dependencies regularly updated

### ✅ Performance
- [ ] Efficient algorithms used
- [ ] Proper memory management
- [ ] Caching implemented where beneficial
- [ ] Large file handling optimized
- [ ] Performance benchmarks in place

### ✅ Documentation
- [ ] Comprehensive README
- [ ] API documentation
- [ ] Code comments for complex logic
- [ ] Contribution guidelines
- [ ] Changelog maintained

## Environment Variables

### Required
```bash
# Groq API for AI-powered fixes
GROQ_API_KEY=your_groq_api_key_here
```

### Optional
```bash
# File paths
CSS_INPUT_FILE=style.css
CSS_OUTPUT_FILE=style.optimized.css
CSS_BACKUP_FILE=style.backup.css

# Features
ENABLE_AI_FIXES=true
ENABLE_AUTOPREFIXER=true
ENABLE_MINIFICATION=false
ENABLE_VERBOSE_LOGGING=false

# Processing limits
MAX_FILE_SIZE_MB=10
AI_MAX_ERRORS_TO_PROCESS=5

# Browser support
BROWSERS="> 1%, last 2 versions, not dead"
```

## Performance Benchmarks

### Target Performance
- **Processing Speed**: < 2 seconds for 250KB files
- **Memory Usage**: < 100MB for typical operations
- **Compression Ratio**: 5-15% size reduction
- **Test Coverage**: > 80% for core files

### Monitoring
- Track processing times in production
- Monitor memory usage for large files
- Log API call success/failure rates
- Measure cache hit ratios

## Security Guidelines

### File Handling
- Always validate file paths before access
- Use path resolution to prevent traversal
- Limit file sizes to prevent DoS
- Check file permissions before operations

### API Security
- Sanitize API keys in logs
- Use HTTPS for all external calls
- Implement rate limiting
- Validate all API responses

### Content Security
- Validate CSS content for dangerous patterns
- Sanitize user-provided CSS
- Check for potential XSS vectors
- Limit content size for processing

## Deployment

### Production Checklist
- [ ] Set production environment variables
- [ ] Enable caching for performance
- [ ] Configure proper logging levels
- [ ] Set up monitoring and alerts
- [ ] Test backup and recovery procedures

### CI/CD Pipeline
- [ ] Automated testing on all PRs
- [ ] Code quality checks
- [ ] Security scanning
- [ ] Performance benchmarking
- [ ] Automated deployment on main branch

## Troubleshooting

### Common Issues
- **API timeouts**: Check network connectivity and API status
- **Memory issues**: Reduce file size or increase memory limits
- **Permission errors**: Check file permissions and ownership
- **CSS parsing errors**: Validate CSS syntax before processing

### Debug Commands
```bash
# Enable verbose logging
ENABLE_VERBOSE_LOGGING=true npm run optimize

# Run with specific test file
npm test -- test-specific-file.js

# Check coverage for specific file
npm run test:coverage -- --collectCoverageFrom='css-optimizer.js'
```

## Contributing

### Development Setup
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Install dependencies (`npm install`)
4. Run tests (`npm test`)
5. Make changes and add tests
6. Ensure all tests pass and coverage is maintained
7. Submit pull request

### Pull Request Requirements
- All tests must pass
- Code coverage must not decrease
- Code must follow style guidelines
- Documentation must be updated if needed
- Performance impact must be considered