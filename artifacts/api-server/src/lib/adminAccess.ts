type ClerkUserWithAccessMetadata = {
  publicMetadata: Record<string, unknown>;
  emailAddresses: Array<{ emailAddress: string }>;
};

const configuredAdminEmail = () =>
  process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

export function hasAdministratorAccess(user: ClerkUserWithAccessMetadata) {
  const email = configuredAdminEmail();
  const hasConfiguredEmail =
    Boolean(email) &&
    user.emailAddresses.some(
      ({ emailAddress }) => emailAddress.trim().toLowerCase() === email,
    );

  return user.publicMetadata.role === "admin" || hasConfiguredEmail;
}