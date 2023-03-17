module.exports = {
    testEnvironment: 'node',
    roots: ['src/', 'oput-common/', 'backend/get-releases-lambda/'],
    testMatch: ['**/*.test.ts', '**/*.test.js'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    }
  };
  