module.exports = { preset: 'ts-jest', testEnvironment: 'node', roots: ['<rootDir>/src', '<rootDir>/test'], moduleNameMapper: { '^@rhc/(.*)$': '<rootDir>/../../packages/$1/src' } };
