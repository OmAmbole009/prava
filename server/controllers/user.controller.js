import { z } from "zod";
import { HttpError } from "../../shared/_core/errors.js";
import { getUserByIdentifier, verifyPassword, hashPassword, saveDbStateToDisk, inMemoryUsers } from "../db.js";
import { verifyAdministratorPassword } from "../adminSecurity.js";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters long.").max(256),
  confirmPassword: z.string().min(8, "Confirm password is required.").max(256),
});

/**
 * Changes password from within user's profile settings.
 */
export async function changePassword(user, rawInput) {
  if (!user) throw new HttpError(401, "Authentication required.");

  const input = changePasswordSchema.parse(rawInput);

  if (input.newPassword !== input.confirmPassword) {
    throw new HttpError(400, "New password and confirmation password do not match.");
  }

  if (input.newPassword === input.currentPassword) {
    throw new HttpError(400, "New password cannot be the same as your current password.");
  }

  // Find user in DB
  const dbUsers = Array.from(inMemoryUsers.values());
  const targetUser = dbUsers.find(u => u.id === user.id) || await getUserByIdentifier(user.email || user.phone);

  if (!targetUser) {
    throw new HttpError(404, "User account not found.");
  }

  // Verify Current Password
  let isCurrentValid = false;
  if (targetUser.email === "omambole2007@gmail.com") {
    isCurrentValid = await verifyAdministratorPassword(targetUser.id, targetUser.email, input.currentPassword);
  } else if (targetUser.passwordHash && targetUser.passwordSalt) {
    isCurrentValid = verifyPassword(input.currentPassword, targetUser.passwordHash, targetUser.passwordSalt);
  } else {
    // If legacy user had no password yet, any initial attempt can set it, but verify minimum
    isCurrentValid = true;
  }

  if (!isCurrentValid) {
    throw new HttpError(400, "Current password is incorrect.");
  }

  // Hash new password and save
  const { updateUserPassword } = await import("../db.js");
  await updateUserPassword(targetUser.id, input.newPassword);

  // Invalidate other active sessions for this user
  const { revokeAllUserSessions } = await import("../services/session.service.js");
  if (targetUser.openId) {
    revokeAllUserSessions(targetUser.openId);
  }

  return {
    success: true,
    message: "Your password has been changed successfully.",
  };
}

/**
 * Returns security and identity metadata for the Profile page.
 */
export async function getSecurityProfile(user) {
  if (!user) throw new HttpError(401, "Authentication required.");

  const dbUsers = Array.from(inMemoryUsers.values());
  const fullUser = dbUsers.find(u => u.id === user.id) || user;

  return {
    id: fullUser.id,
    name: fullUser.name || "Business User",
    email: fullUser.email || null,
    phone: fullUser.phone || null,
    role: fullUser.role || "owner",
    accountStatus: "active",
    twoFactorStatus: "enforced_otp",
    verificationChannels: {
      email: Boolean(fullUser.email),
      sms: Boolean(fullUser.phone),
    },
    lastSignedIn: fullUser.lastSignedIn || new Date(),
    createdAt: fullUser.createdAt || new Date(),
  };
}
