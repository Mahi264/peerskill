export function isCollegeEmail(
  email: string,
  collegeEmailDomain: string,
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDomain = collegeEmailDomain.trim().toLowerCase();

  return normalizedEmail.endsWith(`@${normalizedDomain}`);
}
