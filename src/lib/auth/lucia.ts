import { Lucia } from 'lucia';
import { DrizzleMySQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '../db/connection';
import { sessions, users } from '../db/schema';

// Initialize Drizzle adapter for Lucia
const adapter = new DrizzleMySQLAdapter(db, sessions, users);

// Create Lucia instance
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // Set to `true` when using HTTPS
      secure: process.env.NODE_ENV === 'production'
    }
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      firstName: attributes.firstName,
      lastName: attributes.lastName,
      isActive: attributes.isActive,
    };
  }
});

// Type declarations for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}
