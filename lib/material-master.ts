const DEFAULT_RESULT_LIMIT = 8;
const MIN_FUZZY_QUERY_LENGTH = 3;
const MAX_FUZZY_DISTANCE_RATIO = 0.4;

function normalizeMaterialName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(value: string): string {
  return value.replace(/\s/g, "");
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    previous = current;
  }

  return previous[right.length];
}

function fuzzyDistanceRatio(query: string, candidate: string): number {
  const candidateTokens = candidate.split(" ");
  const allowedLengthDelta = Math.max(
    2,
    Math.ceil(query.length * MAX_FUZZY_DISTANCE_RATIO),
  );
  const comparableSegments = new Set<string>([compact(candidate)]);

  for (let start = 0; start < candidateTokens.length; start += 1) {
    let segment = "";

    for (let end = start; end < candidateTokens.length; end += 1) {
      segment += candidateTokens[end];

      if (Math.abs(segment.length - query.length) <= allowedLengthDelta) {
        comparableSegments.add(segment);
      }

      if (segment.length > query.length + allowedLengthDelta) break;
    }
  }

  let bestRatio = Number.POSITIVE_INFINITY;

  for (const segment of comparableSegments) {
    const distance = levenshteinDistance(query, segment);
    const ratio = distance / Math.max(query.length, segment.length);
    bestRatio = Math.min(bestRatio, ratio);
  }

  return bestRatio;
}

export function parseMaterialNames(source: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const row of source.split(/\r?\n/)) {
    const name = row.trim();
    const key = normalizeMaterialName(name);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    names.push(name);
  }

  return names;
}

export function searchMaterialNames(
  names: readonly string[],
  query: string,
  limit = DEFAULT_RESULT_LIMIT,
): string[] {
  const normalizedQuery = normalizeMaterialName(query);
  if (!normalizedQuery || limit <= 0) return [];

  const compactQuery = compact(normalizedQuery);
  const resultLimit = Math.max(0, Math.floor(limit));

  return names
    .map((name, sourceIndex) => {
      const normalizedName = normalizeMaterialName(name);

      if (normalizedName === normalizedQuery) {
        return { name, sourceIndex, tier: 0, score: 0 };
      }

      if (normalizedName.startsWith(normalizedQuery)) {
        return { name, sourceIndex, tier: 1, score: normalizedName.length };
      }

      const substringIndex = normalizedName.indexOf(normalizedQuery);
      if (substringIndex >= 0) {
        return { name, sourceIndex, tier: 2, score: substringIndex };
      }

      if (compactQuery.length < MIN_FUZZY_QUERY_LENGTH) return null;

      const ratio = fuzzyDistanceRatio(compactQuery, normalizedName);
      if (ratio > MAX_FUZZY_DISTANCE_RATIO) return null;

      return { name, sourceIndex, tier: 3, score: ratio };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort(
      (left, right) =>
        left.tier - right.tier ||
        left.score - right.score ||
        left.name.length - right.name.length ||
        left.name.localeCompare(right.name, "id-ID") ||
        left.sourceIndex - right.sourceIndex,
    )
    .slice(0, resultLimit)
    .map(({ name }) => name);
}
