type UserWithAppMetadata = {
  app_metadata?: Record<string, unknown>;
};

/** Platform authority is stored in protected Auth app metadata, never user metadata. */
export function isPlatformSuperAdmin(user: UserWithAppMetadata | null | undefined): boolean {
  return user?.app_metadata?.role === "super_admin";
}
