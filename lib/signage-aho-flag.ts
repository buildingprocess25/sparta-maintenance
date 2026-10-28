/**
 * Feature flag: wajibkan No Tiket AHO untuk item signage (I11–I13) yang
 * Pudar/Rusak. Env server biasa (bukan NEXT_PUBLIC), dibaca saat runtime;
 * ubah nilainya lalu restart server. Default: tidak wajib.
 */
export function isSignageAhoRequired(
    env: Record<string, string | undefined> = process.env,
): boolean {
    return env.SIGNAGE_AHO_REQUIRED?.trim().toLowerCase() === "true";
}
