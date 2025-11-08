/** @type {import('jest').Config} */
import { defaults } from 'jest-config';

export default {
  // Environment settings
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testEnvironmentOptions: {
    url: "http://localhost"
  },
  
  // Test discovery
  testMatch: [
    "**/test-*.js",
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
  testPathIgnorePatterns: [
    "test-setup.js",
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
    "/.cache/"
  ],
  
  // Module settings
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "tsx", "json"],
  extensionsToTreatAsEsm: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          noEmit: true,
          module: "ESNext",
          target: "ES2022",
          moduleResolution: "node",
        },
        diagnostics: {
          warnOnly: true
        }
      }
    ],
    '^.+\\.css$': '<rootDir>/test/__mocks__/styleMock.js',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/test/__mocks__/fileMock.js'
  },
  
  // Module path aliases
  modulePaths: ["<rootDir>", "<rootDir>/src"],
  
  // Coverage settings
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "clover",
    "html",
    "text-summary",
    "json-summary"
  ],
  collectCoverageFrom: [
    "css-optimizer.js",
    "css-optimizer-cli.js",
    "css-optimizer-enhanced.js",
    "css-optimizer-basic.js",
    "src/**/*.js",
    "utils/**/*.js",
    "core/**/*.js",
    "error-handler.js",
    "file-handler.js",
    "security.js",
    "media-query-combiner.js",
    "framework-optimizer.js",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/coverage/**",
    "!**/.cache/**",
    "!**/test-*.js",
    "!**/__tests__/**",
    "!**/*.test.js",
    "!**/*.spec.js",
    "!jest.config.js",
    "!**/*.config.js",
    "!**/bin/**"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    "src/core/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    "src/utils/": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Setup and teardown
  setupFilesAfterEnv: ["./test-setup.js"],
  setupFiles: ["<rootDir>/test/__mocks__/setupMocks.js"],
  globalSetup: "<rootDir>/test/globalSetup.js",
  globalTeardown: "<rootDir>/test/globalTeardown.js",
  
  // Performance settings
  maxWorkers: "50%",
  verbose: false,
  testTimeout: 10000,
  slowTestThreshold: 5,
  
  // Mock settings
  automock: false,
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  
  // Watch settings
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
    "jest-watch-select-projects"
  ],
  
  // Reporting
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "coverage",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Additional configuration
  detectOpenHandles: true,
  forceExit: true,
  passWithNoTests: false,
  errorOnDeprecated: true,
  
  // Cache settings
  cache: true,
  cacheDirectory: "/tmp/jest_cache",
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true
    }
  },
  
  // Custom resolver
  resolver: "<rootDir>/test/customResolver.js",
  
  // Projects configuration (for monorepo support)
  projects: [
    {
      displayName: "core",
      testMatch: ["**/test-*.js", "**/__tests__/**/*.js"],
      collectCoverageFrom: ["css-optimizer.js", "src/**/*.js"]
    },
    {
      displayName: "integration",
      testMatch: ["**/test-integration-*.js"],
      testEnvironment: "node",
      setupFilesAfterEnv: ["./test-integration-setup.js"]
    }
  ]
};
