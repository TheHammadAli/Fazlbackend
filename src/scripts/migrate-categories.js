import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect(
        "mongodb://mongo:REDACTED@trolley.proxy.rlwy.net:58792/",
    );

    const db = client.db("test");

    const collection = db.collection("categories");

    // only old structure
    const cursor = collection.find({
        "name.en": { $exists: false },
    });

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;

        await collection.updateOne(
            { _id: doc._id },
            {
                $set: {
                    name: {
                        en: doc.name,
                    },
                    type: "service",
                    isDisabled: false,
                },
            },
        );
    }

    console.log("Migration completed");
    await client.close();
}

migrate().catch(console.error);