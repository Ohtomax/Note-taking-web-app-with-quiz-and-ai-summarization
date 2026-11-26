import type { Request } from 'express';

export interface VerifiedIdentity {
  uid: string;
  email?: string;
  name?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  role: 'USERS' | 'ADMIN' | 'STAFF';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: VerifiedIdentity;
  account?: UserProfile;
}

export type TokenVerifier = (token: string) => Promise<VerifiedIdentity>;
