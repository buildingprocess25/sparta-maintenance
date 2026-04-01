import "server-only";
import { SignJWT, jwtVerify } from "jose";

type ResetTokenPayload = {
    sub: string;
    email: string;
    purpose: "password-reset";
};

const RESET_TOKEN_TTL = "30m";

function getSecretKey() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error("SESSION_SECRET env variable is not set");
    }
    return new TextEncoder().encode(secret);
}

export async function createPasswordResetToken(payload: {
    userId: string;
    email: string;
}): Promise<string> {
    return new SignJWT({
        email: payload.email,
        purpose: "password-reset",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.userId)
        .setIssuedAt()
        .setExpirationTime(RESET_TOKEN_TTL)
        .sign(getSecretKey());
}

export async function verifyPasswordResetToken(
    token: string,
): Promise<ResetTokenPayload> {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (payload.purpose !== "password-reset") {
        throw new Error("Invalid reset token purpose");
    }

    if (!payload.sub || !payload.email) {
        throw new Error("Invalid reset token payload");
    }

    return {
        sub: String(payload.sub),
        email: String(payload.email),
        purpose: "password-reset",
    };
}
