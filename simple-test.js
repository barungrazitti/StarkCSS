// Simple test runner for CSS optimizer
import fs from 'fs';
import path from 'path';

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running CSS Optimizer Tests...\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

const runner = new TestRunner();

// Test 1: Check if main optimizer file exists
runner.test('Main optimizer file exists', () => {
  if (!fs.existsSync('./css-optimizer.js')) {
    throw new Error('css-optimizer.js not found');
  }
});

// Test 2: Check if error handler exists
runner.test('Error handler file exists', () => {
  if (!fs.existsSync('./error-handler.js')) {
    throw new Error('error-handler.js not found');
  }
});

// Test 3: Check if security module exists
runner.test('Security module file exists', () => {
  if (!fs.existsSync('./security.js')) {
    throw new Error('security.js not found');
  }
});

// Test 4: Check if file handler exists
runner.test('File handler file exists', () => {
  if (!fs.existsSync('./file-handler.js')) {
    throw new Error('file-handler.js not found');
  }
});

// Test 5: Check if package.json has correct configuration
runner.test('Package.json configuration', () => {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  if (pkg.type !== 'module') {
    throw new Error('Package.json should have "type": "module"');
  }
  if (!pkg.scripts || !pkg.scripts.test) {
    throw new Error('Package.json should have test script');
  }
});

// Test 6: Check if test CSS file exists
runner.test('Test CSS file exists', () => {
  if (!fs.existsSync('./style.css')) {
    throw new Error('style.css test file not found');
  }
});

// Test 7: Run optimizer on test file
runner.test('Can run optimizer on test file', async () => {
  const { execSync } = await import('child_process');
  
  try {
    const output = execSync('node css-optimizer.js style.css --output style.test.css', { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    if (!output.includes('Optimization completed successfully')) {
      throw new Error('Optimizer did not complete successfully');
    }
    
    // Check if output file was created (optimizer uses default name)
    if (!fs.existsSync('./style.optimized.css')) {
      throw new Error('Output file was not created');
    }
    
    // Clean up test file
    fs.unlinkSync('./style.optimized.css');
    
  } catch (error) {
    throw new Error(`Optimizer failed: ${error.message}`);
  }
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});