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
      /** Primary role ('administrator' when the user has it) */
      role: string | null;
      /** Every role assigned to the user */
      roles: string[];
      isActive: boolean;
    } | null;
    session: import('lucia').Session | null;
  }
}
