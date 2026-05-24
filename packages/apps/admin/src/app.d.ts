import type { auth } from '$lib/server/auth';
import type { AdminConfig } from '$lib/server/config';
import type { KyselyClient } from '@saas/db';

type Session = typeof auth.$Infer.Session.session;
type User    = typeof auth.$Infer.Session.user;

declare global {
  namespace App {
    interface Locals {
      session: Session     | null;
      user:    User        | null;
      db:      KyselyClient;
    }
    interface PageData {
      user?: User | null;
    }
  }
}

export type { AdminConfig };
export {};
