/**
 * Seeds the `categories` table from the two CSV exports in prisma/seed-data/.
 *
 *   node prisma/seed-categories.js          # apply
 *   node prisma/seed-categories.js --dry    # report only, write nothing
 *
 * Idempotent: a category is matched on (name.en, type) — the same natural key
 * the admin panel treats as unique — so re-running updates the existing row
 * instead of inserting a duplicate. Ids keep the 24-char ObjectId shape the
 * whole stack assumes (see src/common/utils/object-id.util.ts).
 *
 * The CSVs are the source of truth and are copied in verbatim: values are NOT
 * de-duplicated and spellings are NOT corrected, by explicit decision. Known
 * issues to fix later in the admin panel are listed in the run report.
 */
const fs = require("fs");
const path = require("path");
require("dotenv/config");

const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { generateObjectId } = require("../dist/common/utils/object-id.util");

const DRY_RUN = process.argv.includes("--dry");

/** Test/junk rows from the export. Matched by exact EN name so nothing else
 *  can be dropped by accident; the count is asserted after filtering. */
const SKIP_NAMES = new Set([
  "Test No Optional Flag",
  "Test Cars Category",
  "Test Sort Product",
  "Test Sort Product 3",
]);

const SOURCES = [
  { type: "service", file: "seed-data/service-categories.csv" },
  { type: "product", file: "seed-data/product-categories.csv" },
];

/** Minimal RFC 4180 parser — the Parameters column holds JSON full of commas
 *  and doubled quotes, so splitting on "," is not an option and pulling in a
 *  CSV dependency for one script is not worth it. */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

/** The export writes dates as the Excel formula ="2026-06-24" to stop Excel
 *  reformatting them. Unwrap it; fall back to now() if it isn't a real date. */
function parseCreatedAt(raw) {
  const m = String(raw || "").match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const report = [];

  try {
    for (const src of SOURCES) {
      const full = path.join(__dirname, src.file);
      const rows = parseCsv(fs.readFileSync(full, "utf8"));

      const kept = rows.filter((r) => {
        const en = (r["Category Name (EN)"] || "").trim();
        if (SKIP_NAMES.has(en)) {
          skipped++;
          return false;
        }
        return true;
      });

      console.log(
        `\n${src.type}: ${rows.length} rows padhi, ${kept.length} seed hongi, ${rows.length - kept.length} skip`,
      );

      for (const r of kept) {
        const en = (r["Category Name (EN)"] || "").trim();
        const ur = (r["Category Name (UR)"] || "").trim();
        const status = (r["Status"] || "").trim();
        const sortNumber = Number.parseInt(r["Sort Number"], 10);

        if (!en) throw new Error(`${src.file}: a row has no English name`);
        if (Number.isNaN(sortNumber)) {
          throw new Error(`${src.file}: "${en}" has a non-numeric sort number`);
        }

        let parameters;
        try {
          parameters = JSON.parse(r["Parameters (JSON)"] || '{"en":[],"ur":[]}');
        } catch (e) {
          throw new Error(`${src.file}: "${en}" has invalid parameters JSON — ${e.message}`);
        }

        const data = {
          name: { en, ur },
          type: src.type,
          parameters,
          sortNumber,
          // "Active" / "In active" is the only pair the export produces.
          isDisabled: status.toLowerCase() !== "active",
        };

        const existing = await prisma.category.findFirst({
          where: { name: { path: ["en"], equals: en }, type: src.type },
          select: { id: true },
        });

        if (DRY_RUN) {
          report.push(`${existing ? "UPDATE" : "CREATE"}  ${src.type}  ${en}`);
          existing ? updated++ : created++;
          continue;
        }

        if (existing) {
          await prisma.category.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          const createdAt = parseCreatedAt(r["Created Date"]);
          await prisma.category.create({
            data: { id: generateObjectId(), ...data, ...(createdAt ? { createdAt } : {}) },
          });
          created++;
        }
      }
    }

    if (skipped !== SKIP_NAMES.size) {
      throw new Error(
        `Expected to skip ${SKIP_NAMES.size} test rows but skipped ${skipped} — check SKIP_NAMES against the CSVs.`,
      );
    }

    console.log(
      `\n${DRY_RUN ? "[DRY RUN] " : ""}created=${created}  updated=${updated}  skipped=${skipped}`,
    );
    if (DRY_RUN) report.forEach((l) => console.log("  " + l));

    if (!DRY_RUN) {
      const byType = await prisma.category.groupBy({
        by: ["type", "isDisabled"],
        _count: { _all: true },
      });
      console.log("\ndatabase mein ab:");
      for (const g of byType) {
        console.log(`  ${g.type}  isDisabled=${g.isDisabled}  ->  ${g._count._all}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\nSEED FAILED:", e.message);
  process.exit(1);
});
