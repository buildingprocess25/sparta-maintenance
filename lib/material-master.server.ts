import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseMaterialNames } from "@/lib/material-master";

export async function loadMaterialNames(): Promise<string[]> {
  const source = await readFile(
    path.join(process.cwd(), "data", "masterdata-material.txt"),
    "utf8",
  );

  return parseMaterialNames(source);
}
