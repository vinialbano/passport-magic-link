export default {
  testTimeout: 10000, // Default timeout for all tests
  extensionsToTreatAsEsm: ['.ts'],
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/**/*.spec.ts',
        '!<rootDir>/src/**/*.test.ts',
        '!<rootDir>/src/__tests__/**'
      ],
      coverageDirectory: './coverage/unit',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      clearMocks: true,
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: [],
      transform: {
        '^.+\\.(ts|js|mjs)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              allowJs: true,
              esModuleInterop: true
            }
          }
        ]
      }
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/**/*.spec.ts',
        '!<rootDir>/src/**/*.test.ts',
        '!<rootDir>/src/__tests__/**'
      ],
      coverageDirectory: './coverage/integration',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      clearMocks: true,
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: [],
      transform: {
        '^.+\\.(ts|js|mjs)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              allowJs: true,
              esModuleInterop: true
            }
          }
        ]
      }
    }
  ],

  // Global configuration
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['lcov', 'text', 'html', 'json-summary'],

  // Combined coverage threshold
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 70,
      functions: 60,
      lines: 90
    }
  }
}
