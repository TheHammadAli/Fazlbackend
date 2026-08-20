import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const users = db.collection("users");
    const counters = db.collection("counters");

    const cursor = users
        .find({ userCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const userCode = `USR-${String(seq).padStart(6, "0")}`;

        await users.updateOne({ _id: doc._id }, { $set: { userCode } });
    }

    await counters.updateOne(
        { _id: "userCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} users.`);
    await client.close();
}

migrate().catch(console.error);
