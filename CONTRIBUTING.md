# Contributing to Ultimate AI-Powered CSS Optimizer

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd css-optimizer

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Groq API key (optional)
# Edit .env and add: GROQ_API_KEY=your_key_here
```

## 🔧 Development

### Running Tests
```bash
# Test the optimizer
npm run test

# Test basic version
npm run optimize:basic
```

### Code Style
- Use Prettier for formatting
- Follow existing naming conventions (kebab-case)
- Add JSDoc comments for functions
- Test your changes before committing

### Making Changes
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Push and create a Pull Request

## 📋 Pull Request Guidelines

### PR Checklist
- [ ] Code follows project style guidelines
- [ ] Changes are tested and working
- [ ] Documentation is updated if needed
- [ ] Commit messages are descriptive
- [ ] No sensitive data (API keys, etc.) committed

### Commit Message Format
```
🎯 [type]: Brief description

- Detailed explanation if needed
- List specific changes
- Reference issues if applicable

Examples:
✨ feat: Add new CSS property validation
🐛 fix: Handle malformed CSS selectors
📚 docs: Update AI setup instructions
```

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## 🎯 Areas for Contribution

### High Priority
- Additional CSS fix patterns
- Performance optimizations
- Error handling improvements
- Documentation enhancements

### Ideas Welcome
- New AI model integrations
- Additional output formats
- Batch processing features
- CLI improvements

Thank you for contributing! 🎉
