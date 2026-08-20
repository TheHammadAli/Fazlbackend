import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const broadcasts = db.collection("broadcasts");
    const counters = db.collection("counters");

    const cursor = broadcasts
        .find({ broadcastCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const broadcastCode = `ECH-${String(seq).padStart(6, "0")}`;

        await broadcasts.updateOne({ _id: doc._id }, { $set: { broadcastCode } });
    }

    await counters.updateOne(
        { _id: "broadcastCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} broadcasts.`);
    await client.close();
}

migrate().catch(console.error);
