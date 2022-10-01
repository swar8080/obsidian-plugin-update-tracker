module.exports = {
    testEnvironment: 'node',
    roots: ['get-releases-lambda/'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    }
  };
  