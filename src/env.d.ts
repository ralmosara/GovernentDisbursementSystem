/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string | null;
      isActive: boolean;
    } | null;
    session: import('lucia').Session | null;
  }
}
