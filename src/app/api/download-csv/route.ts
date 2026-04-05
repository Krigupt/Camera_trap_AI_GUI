import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import CsvData from '@/models/CsvData';
import ExcelData from '@/models/ExcelData';
import { isAdminUserId } from '@/lib/admin';

function canAccessExcel(
  doc: { clerkUserId?: string | null },
  userId: string | null,
  admin: boolean
) {
  if (admin) return true;
  if (!userId) return false;
  if (!doc.clerkUserId) return true;
  return doc.clerkUserId === userId;
}

/**
 * Project key from Excel basename, e.g.
 * detailed_species_PA2_report.xlsx → PA2
 * detailed_species_P_D3_report.xlsx → P_D3
 */
function extractProjectTokenFromExcelFilename(filename: string): string | null {
  const base = filename.replace(/\\/g, '/').split('/').pop() || filename;

  // P_D1, P_D4, … (common in filenames and image names)
  let m = base.match(/\b(P_D\d+)\b/i);
  if (m?.[1]) return m[1].toUpperCase();

  m = base.match(/\b(PD\d+)\b/i);
  if (m?.[1]) return `P_D${m[1].slice(2)}`.toUpperCase();

  m = base.match(/species_(.+?)_report\.xlsx$/i);
  if (m?.[1]) {
    return m[1].trim().replace(/[^A-Za-z0-9_]/g, '') || null;
  }

  m = base.match(/\b(PA\d+)\b/i);
  if (m?.[1]) return m[1].toUpperCase();

  m = base.match(/\b(P_[A-Z]_\d+)\b/i);
  if (m?.[1]) return m[1].toUpperCase();

  m = base.match(/\b(P_[A-Z]\d{1,4})\b/i);
  if (m?.[1]) return m[1].toUpperCase();

  return null;
}

/** Match deployment_id / filename cells that belong to this project (handles PA2 vs P_A2 vs P_D3 …) */
function rowRegexForProjectToken(token: string): RegExp {
  const t = token.trim().toUpperCase();
  const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alts = new Set<string>([escaped(t)]);

  if (/^PA\d+$/i.test(t)) {
    alts.add(escaped(`P_A${t.slice(2)}`));
  }
  if (/^P_A\d+$/i.test(t)) {
    alts.add(escaped(`P${t.slice(2)}`));
  }
  if (/^P_[A-Z]_\d+$/i.test(t)) {
    const parts = t.split('_');
    if (parts.length === 3 && parts[0] === 'P') {
      alts.add(escaped(`${parts[1]}${parts[2]}`));
    }
  }
  if (/^P_D\d+$/i.test(t)) {
    alts.add(escaped(t.replace(/_/g, '')));
  }

  return new RegExp([...alts].join('|'), 'i');
}

function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** e.g. P_D4_210508_00031.JPG → P_D4_210508 */
function inferDeploymentIdFromImageBasename(basename: string): string {
  const base = basename.replace(/^.*\//, '').replace(/\.[^.]+$/i, '');
  const m = base.match(/^(P_[A-Z]_\d+_\d{6})/i);
  if (m) return m[1];
  const m2 = base.match(/^(PA\d+_\d{6})/i);
  if (m2) return m2[1];
  return base;
}

/**
 * Map dashboard sheet name to CSV taxonomic columns (same idea as update-species).
 */
function taxoColumnsForSheet(
  sheetName: string,
  human: string,
  speciesFromGlobal: string
): {
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
} {
  const s = sheetName.toLowerCase();
  const t = {
    class: '',
    order: '',
    family: '',
    genus: '',
    species: '',
    common_name: '',
  };
  if (s.includes('common')) {
    t.common_name = human;
    return t;
  }
  if (s.includes('species')) {
    t.species = (speciesFromGlobal || human).trim();
    return t;
  }
  if (s.includes('genus')) {
    t.genus = human;
    return t;
  }
  if (s.includes('family')) {
    t.family = human;
    return t;
  }
  if (s.includes('order')) {
    t.order = human;
    return t;
  }
  if (s.includes('class')) {
    t.class = human;
    return t;
  }
  t.common_name = human;
  if (speciesFromGlobal) t.species = speciesFromGlobal;
  return t;
}

/**
 * When Mongo has no CsvData for this batch, build a CSV from the Excel sheet
 * (image paths + optional globalImageSpecies) so export still works.
 */
function generateCsvFromExcelDocument(
  excelDoc: InstanceType<typeof ExcelData>
): string {
  const headers = [
    'deployment_id',
    'filename',
    'class',
    'order',
    'family',
    'genus',
    'species',
    'common_name',
  ];
  const lines: string[] = [headers.join(',')];
  const speciesByPath =
    (excelDoc.globalImageSpecies as Record<string, string> | undefined) || {};
  const sheetName = excelDoc.sheetName || '';

  const imagePathsForRow = (row: {
    imagePaths?: string[];
    filenames?: string;
  }): string[] => {
    if (row.imagePaths?.length) return row.imagePaths;
    if (row.filenames) {
      return row.filenames
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [];
  };

  for (const row of excelDoc.data || []) {
    for (const rawPath of imagePathsForRow(row)) {
      const bn = rawPath.replace(/^.*\//, '').trim();
      if (!bn) continue;
      const deployment_id = inferDeploymentIdFromImageBasename(bn);
      const speciesVal =
        speciesByPath[rawPath] ?? speciesByPath[bn] ?? '';
      const tax = taxoColumnsForSheet(
        sheetName,
        (row.human || '').trim(),
        speciesVal
      );
      const out = [
        deployment_id,
        bn,
        tax.class,
        tax.order,
        tax.family,
        tax.genus,
        tax.species,
        tax.common_name,
      ];
      lines.push(out.map(escapeCsvCell).join(','));
    }
  }

  if (lines.length <= 1) return '';
  return lines.join('\n');
}

async function findLegacyRowsByProjectToken(
  excelDoc: InstanceType<typeof ExcelData>
) {
  const token = extractProjectTokenFromExcelFilename(excelDoc.filename);
  if (!token) {
    return [];
  }

  const rx = rowRegexForProjectToken(token);
  // Match any CSV row for this project code (scoped or not). Regex excludes other projects (e.g. P_D3).
  return CsvData.find({
    $or: [{ deployment_id: rx }, { filename: rx }],
  }).sort({ uploadedAt: -1 });
}

/**
 * Prefer CSV rows saved with this upload's uploadGroupId.
 * If none (CSV not linked or older data), match legacy rows by project code in the Excel filename.
 */
async function getCsvRowsForExcel(
  excelDoc: InstanceType<typeof ExcelData>
) {
  if (excelDoc.uploadGroupId) {
    const scoped = await CsvData.find({
      uploadGroupId: excelDoc.uploadGroupId,
    }).sort({ uploadedAt: -1 });
    if (scoped.length > 0) {
      return scoped;
    }
  }

  return findLegacyRowsByProjectToken(excelDoc);
}

/**
 * Download CSV rows for the Excel upload session that contains the given sheet (`batchId`).
 * Query: ?batchId=<ExcelData _id>
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchId = request.nextUrl.searchParams.get('batchId');
    if (!batchId) {
      return NextResponse.json(
        {
          error:
            'Missing batchId. Open export from the dashboard for this batch so the correct CSV is downloaded.',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const excelDoc = await ExcelData.findById(batchId);
    if (!excelDoc) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const admin = isAdminUserId(userId);
    if (!canAccessExcel(excelDoc, userId, admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const csvData = await getCsvRowsForExcel(excelDoc);

    let csvContent: string;
    let fromMongo = true;

    if (csvData.length === 0) {
      const synthetic = generateCsvFromExcelDocument(excelDoc);
      if (!synthetic) {
        return NextResponse.json(
          {
            error:
              'No CSV data for this batch. Upload a species CSV with your Excel on the Upload page, or ensure images exist in this sheet so a CSV can be built from them.',
          },
          { status: 404 }
        );
      }
      csvContent = synthetic;
      fromMongo = false;
    } else {
      const headers = [
        'deployment_id',
        'filename',
        'class',
        'order',
        'family',
        'genus',
        'species',
        'common_name',
      ];
      const csvLines = [headers.join(',')];

      csvData.forEach((record) => {
        const row = [
          record.deployment_id,
          record.filename,
          record.class,
          record.order,
          record.family,
          record.genus,
          record.species,
          record.common_name,
        ];
        csvLines.push(row.map(escapeCsvCell).join(','));
      });

      csvContent = csvLines.join('\n');
    }

    const safeName = excelDoc.filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
    const suffix = fromMongo ? '' : '_from_sheet';
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="updated_species_${safeName}${suffix}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error downloading CSV file:', error);
    return NextResponse.json({ error: 'Failed to download CSV file' }, { status: 500 });
  }
}
