module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // Map .js imports (required by tsconfig NodeNext) back to .ts files for Jest/ts-jest
    '^(\\..*)\\.js$': '$1',
  },
};
