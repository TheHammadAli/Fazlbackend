import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const products = db.collection("products");
    const counters = db.collection("counters");

    const cursor = products
        .find({ listingCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const listingCode = `LST-${String(seq).padStart(6, "0")}`;

        await products.updateOne({ _id: doc._id }, { $set: { listingCode } });
    }

    await counters.updateOne(
        { _id: "listingCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} products.`);
    await client.close();
}

migrate().catch(console.error);
