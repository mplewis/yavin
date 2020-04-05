module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  reporters: ['default', ['jest-junit', { outputDirectory: 'coverage' }]],
};
