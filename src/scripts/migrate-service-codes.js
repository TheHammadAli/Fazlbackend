import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const services = db.collection("services");
    const counters = db.collection("counters");

    const cursor = services
        .find({ serviceCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const serviceCode = `SVC-${String(seq).padStart(6, "0")}`;

        await services.updateOne({ _id: doc._id }, { $set: { serviceCode } });
    }

    await counters.updateOne(
        { _id: "serviceCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} services.`);
    await client.close();
}

migrate().catch(console.error);
