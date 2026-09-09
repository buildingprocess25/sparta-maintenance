import { logger } from "./logger";

type SyncUserPayload = {
  email: string;
  fullName: string;
  branchCode: string; // using branchName for both for now
  branchName: string;
  role: string;
  moduleId: string;
};

export async function syncUserToSso(payload: SyncUserPayload) {
  const apiUrl = process.env.SPARTA_API_URL || "http://localhost:10000";
  const apiKey = process.env.SPARTA_INTERNAL_API_KEY || "sparta-internal-sync-key-2026";
  
  try {
    const res = await fetch(`${apiUrl}/v1/admin/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sparta-internal-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ operation: "syncUserToSso", payload, errorText }, "SSO Sync Failed");
    }
  } catch (error) {
    logger.error({ operation: "syncUserToSso", payload }, "SSO Sync Error", error);
  }
}

export async function syncDeleteUserToSso(email: string) {
  const apiUrl = process.env.SPARTA_API_URL || "http://localhost:10000";
  const apiKey = process.env.SPARTA_INTERNAL_API_KEY || "sparta-internal-sync-key-2026";
  
  try {
    const res = await fetch(`${apiUrl}/v1/admin/users/sync-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sparta-internal-key": apiKey,
      },
      body: JSON.stringify({
        email,
        moduleId: "maintenance",
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      logger.error({ operation: "syncDeleteUserToSso", email, errorText }, "SSO Sync Delete Failed");
    }
  } catch (error) {
    logger.error({ operation: "syncDeleteUserToSso", email }, "SSO Sync Delete Error", error);
  }
}
