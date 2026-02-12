import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  siteId?: string | null;
}
