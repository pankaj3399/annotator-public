// constants/roles.ts
export const ROLES = {
  ANNOTATOR: 'annotator',
  PROJECT_MANAGER: 'project manager',
  ADMIN: 'system admin',
  AGENCY_OWNER: 'agency owner',
} as const;

// Create a type from the roles for better type safety
export type UserRole = typeof ROLES[keyof typeof ROLES];

// Utility functions for role checking
export const isAnnotator = (role: string) => role === ROLES.ANNOTATOR;
export const isProjectManager = (role: string | undefined) => role === ROLES.PROJECT_MANAGER;
export const isAdmin = (role: string) => role === ROLES.ADMIN;
export const isAgencyOwner = (role: string) => role === ROLES.AGENCY_OWNER;
