module.exports = {
    testEnvironment: 'node',
    roots: ['src/', 'backend/get-releases-lambda/'],
    testMatch: ['**/*.test.ts', '**/*.test.js'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    }
  };
  