import { MongoClient } from "mongodb";

async function migrate() {
    const client = await MongoClient.connect("mongodb://mongo:REDACTED@trolley.proxy.rlwy.net:58792/");

    try {
        const db = client.db("test");

        const collection = db.collection("products");

        const result = await collection.updateMany(
            {
                isDeleted: { $exists: false },
            },
            {
                $set: {
                    isDeleted: false,
                },
            },
        );

        console.log(`Migration completed`);
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
}

migrate();