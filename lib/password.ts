import "server-only";
import { hash, compare } from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * Returns the hashed string suitable for database storage.
 */
export async function hashPassword(plaintext: string): Promise<string> {
    return hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
    plaintext: string,
    hashedPassword: string,
): Promise<boolean> {
    return compare(plaintext, hashedPassword);
}
