// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless CI environment
  log: process.env.CI ? console.log : jest.fn(),
  // Keep errors and warnings visible
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Mock crypto.randomUUID for tests
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}
