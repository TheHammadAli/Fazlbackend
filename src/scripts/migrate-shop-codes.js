import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const shops = db.collection("shops");
    const counters = db.collection("counters");

    const cursor = shops
        .find({ shopCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const shopCode = `SHP-${String(seq).padStart(6, "0")}`;

        await shops.updateOne({ _id: doc._id }, { $set: { shopCode } });
    }

    await counters.updateOne(
        { _id: "shopCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} shops.`);
    await client.close();
}

migrate().catch(console.error);
