// The one account that gets a "just cleanup, don't count it" option when
// swipe-deleting a match — everyone else always forfeits (see
// components/dashboard/ForfeitMatchModal.tsx).
const ADMIN_EMAIL = "emil.a.sundberg@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
