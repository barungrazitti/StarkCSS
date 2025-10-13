module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test-*.js'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'],
  setupFilesAfterEnv: ['./test-setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['**/css-optimizer.js', '!**/node_modules/**']
};