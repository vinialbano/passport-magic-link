const swcTransform = [
  '@swc/jest',
  {
    jsc: {
      parser: { syntax: 'typescript', decorators: false },
      target: 'es2022'
    },
    module: { type: 'es6' }
  }
]

const projectBase = {
  testEnvironment: 'node',
  clearMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [],
  transform: {
    '^.+\\.(ts|js|mjs)$': swcTransform
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/__tests__/**'
  ]
}

export default {
  testTimeout: 10000,
  extensionsToTreatAsEsm: ['.ts'],
  projects: [
    {
      ...projectBase,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      coverageDirectory: './coverage/unit'
    },
    {
      ...projectBase,
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      coverageDirectory: './coverage/integration'
    }
  ],

  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['lcov', 'text', 'html', 'json-summary'],

  coverageThreshold: {
    global: {
      statements: 90,
      branches: 70,
      functions: 60,
      lines: 90
    }
  }
}
