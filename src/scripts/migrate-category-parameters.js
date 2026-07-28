import { MongoClient } from "mongodb";

function normalizeParameterItem(item) {
    if (typeof item === "string") {
        return { name: item.trim(), values: [] };
    }

    if (Array.isArray(item)) {
        return { name: item.join("").trim(), values: [] };
    }

    if (!item || typeof item !== "object") {
        return { name: "", values: [] };
    }

    const rawName =
        typeof item.name === "string"
            ? item.name
            : typeof item.label === "string"
                ? item.label
                : "";

    const rawValues = Array.isArray(item.values)
        ? item.values.filter((value) => typeof value === "string")
        : [];

    return {
        name: rawName.trim(),
        values: rawValues,
    };
}

function normalizeParameterList(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.map(normalizeParameterItem).filter((item) => item.name);
    }

    if (typeof value === "object") {
        const name = Object.entries(value).find(([key, val]) => typeof val === "string" && !["values", "_id", "id"].includes(key));
        return name ? [normalizeParameterItem({ name: name[1] })] : [];
    }

    return [];
}

function normalizeParameters(parameters) {
    if (!parameters || typeof parameters !== "object") {
        return { en: [], ur: [] };
    }

    return {
        en: normalizeParameterList(parameters.en),
        ur: normalizeParameterList(parameters.ur),
    };
}

async function migrate() {
    const mongoUri = "mongodb://mongo:REDACTED@trolley.proxy.rlwy.net:58792/";
    const client = await MongoClient.connect(mongoUri);
    const db = client.db();
    const collection = db.collection("categories");

    const cursor = collection.find({});

    let updated = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;

        const normalized = normalizeParameters(doc.parameters);
        const needsUpdate =
            JSON.stringify(doc.parameters) !== JSON.stringify(normalized);

        if (needsUpdate) {
            await collection.updateOne(
                { _id: doc._id },
                { $set: { parameters: normalized } },
            );
            updated += 1;
        }
    }

    console.log(`Migration completed. Updated ${updated} category documents.`);
    await client.close();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
