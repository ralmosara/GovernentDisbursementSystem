import { beforeAll, afterAll, afterEach } from 'vitest';

// Setup test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mysql://root:password@localhost:3306/test_disbursement_system';
});

afterAll(() => {
  // Cleanup
});

afterEach(() => {
  // Reset mocks after each test
});
