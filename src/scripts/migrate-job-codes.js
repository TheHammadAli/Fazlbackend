import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);

    const db = client.db("test");
    const servicerequests = db.collection("servicerequests");
    const counters = db.collection("counters");

    const cursor = servicerequests
        .find({ jobCode: { $exists: false } })
        .sort({ createdAt: 1 });

    let seq = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        seq += 1;
        const jobCode = `JOB-${String(seq).padStart(6, "0")}`;

        await servicerequests.updateOne({ _id: doc._id }, { $set: { jobCode } });
    }

    await counters.updateOne(
        { _id: "jobCode" },
        { $set: { seq } },
        { upsert: true },
    );

    console.log(`Migration completed. Backfilled ${seq} bookings.`);
    await client.close();
}

migrate().catch(console.error);
