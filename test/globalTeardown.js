// Global teardown for Jest tests
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';

// Global cleanup after all tests
export default async function globalTeardown() {
  console.log('\\n🧹 Running global test cleanup...');
  
  try {
    // Clean up test temporary directory
    if (global.testConfig?.tempDir) {
      await fs.remove(global.testConfig.tempDir);
      console.log('✅ Cleaned up temporary test files');
    }
    
    // Clean up test data directory (optional - keep for debugging)
    if (global.testConfig?.testDataDir && process.env.CLEAN_TEST_DATA === 'true') {
      await fs.remove(global.testConfig.testDataDir);
      console.log('✅ Cleaned up test data files');
    }
    
    // Clean up mock cache directory
    const mockCacheDir = path.join(process.cwd(), '.cache', 'test');
    if (await fs.pathExists(mockCacheDir)) {
      await fs.remove(mockCacheDir);
      console.log('✅ Cleaned up test cache directory');
    }
    
    // Clean up any test output files
    const testOutputs = [
      'style.test.css',
      'style.test.optimized.css',
      'style.test.backup.css',
      'test-output.css',
      'test-output.optimized.css'
    ];
    
    for (const outputFile of testOutputs) {
      const outputPath = path.join(process.cwd(), outputFile);
      if (await fs.pathExists(outputPath)) {
        await fs.remove(outputPath);
        console.log(`✅ Cleaned up test output: ${outputFile}`);
      }
    }
    
    // Reset global variables
    if (global.testUtils) {
      delete global.testUtils;
    }
    
    if (global.testConfig) {
      delete global.testConfig;
    }
    
    // Reset console if it was mocked
    if (global.originalConsole) {
      global.console = global.originalConsole;
      delete global.originalConsole;
    }
    
    // Reset fetch if it was mocked
    if (global.originalFetch) {
      global.fetch = global.originalFetch;
      delete global.originalFetch;
    }
    
    // Clear any remaining timers
    jest.useRealTimers();
    
    // Clear all module cache
    jest.clearAllMocks();
    jest.resetModules();
    
    console.log('🎉 Global test cleanup completed successfully\\n');
    
  } catch (error) {
    console.error('❌ Error during global test cleanup:', error);
    console.log('⚠️  Some test files may not have been cleaned up properly\\n');
    
    // Don't fail the test suite due to cleanup issues
    // Just log the error and continue
  }
  
  // Print final test statistics
  if (global.testStats) {
    console.log('📊 Test Execution Statistics:');
    console.log(`   Total tests: ${global.testStats.total}`);
    console.log(`   Passed: ${global.testStats.passed}`);
    console.log(`   Failed: ${global.testStats.failed}`);
    console.log(`   Skipped: ${global.testStats.skipped}`);
    console.log(`   Success rate: ${((global.testStats.passed / global.testStats.total) * 100).toFixed(1)}%`);
    console.log('');
  }
}