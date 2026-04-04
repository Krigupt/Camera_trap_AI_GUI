export type ExcelBatchLean = {
  _id: unknown;
  filename: string;
  sheetName: string;
  bucketName: string;
  uploadedAt?: Date | null;
  uploadGroupId?: string | null;
  clerkUserId?: string | null;
};

export type GroupedBatch = {
  anchorId: string;
  filename: string;
  bucketName: string;
  sheetCount: number;
  uploadedAt: string | null;
  clerkUserId: string | null;
};

/**
 * Groups Mongo Excel rows into one entry per upload.
 * @param includeOwnerInLegacyKey — use for all-users views so different owners never merge.
 */
export function groupExcelBatches(
  docs: ExcelBatchLean[],
  options?: { includeOwnerInLegacyKey?: boolean }
): GroupedBatch[] {
  const includeOwner = options?.includeOwnerInLegacyKey ?? false;

  function groupKey(d: ExcelBatchLean): string {
    if (d.uploadGroupId) return `grp:${d.uploadGroupId}`;
    const t = d.uploadedAt ? new Date(d.uploadedAt).getTime() : 0;
    if (includeOwner) {
      const owner = d.clerkUserId || "legacy-no-user";
      return `legacy:${owner}:${d.filename}:${d.bucketName}:${t}`;
    }
    return `legacy:${d.filename}:${d.bucketName}:${t}`;
  }

  const byGroup = new Map<string, ExcelBatchLean[]>();
  for (const d of docs) {
    const k = groupKey(d);
    const list = byGroup.get(k);
    if (list) list.push(d);
    else byGroup.set(k, [d]);
  }

  const grouped = Array.from(byGroup.values()).map((sheets) => {
    const times = sheets.map((s) =>
      s.uploadedAt ? new Date(s.uploadedAt).getTime() : 0
    );
    const maxAt = Math.max(...times);
    const uploadedAt =
      maxAt > 0 ? new Date(maxAt).toISOString() : null;
    return {
      anchorId: String(sheets[0]._id),
      filename: sheets[0].filename,
      bucketName: sheets[0].bucketName,
      sheetCount: sheets.length,
      uploadedAt,
      clerkUserId: sheets[0].clerkUserId ?? null,
    };
  });

  grouped.sort((a, b) => {
    const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    return tb - ta;
  });

  return grouped;
}
