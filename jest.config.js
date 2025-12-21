module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|date-fns|drizzle-orm)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "hooks/**/*.{ts,tsx}",
    "db/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "!**/__tests__/**",
    "!**/node_modules/**",
    "!**/*.d.ts",
    // Exclude files that are just re-exports or thin wrappers
    "!hooks/use-color-scheme.ts", // Re-export only
    "!db/client.ts", // Initialization only, no logic
    "!db/schema.ts", // Declarative table definitions, functions are callbacks for Drizzle/SQLite
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        jsx: "react",
      },
    },
  },
};
