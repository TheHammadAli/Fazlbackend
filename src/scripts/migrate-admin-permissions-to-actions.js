require("dotenv").config();
const { MongoClient } = require("mongodb");

const ADMIN_PERMISSIONS = [
    "users", "shops", "listings", "services", "categories", "bookings",
    "broadcasts", "feed", "reports", "email-logs", "settings", "members",
];

async function migrate() {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db("test");
    const users = db.collection("users");

    const cursor = users.find({
        $or: [{ "permissions.0": { $exists: true } }, { roles: "admin" }],
    });

    let scanned = 0;
    let modified = 0;

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        scanned += 1;

        const roles = doc.roles ?? [];
        const raw = doc.permissions ?? [];
        const isOldShape = raw.length > 0 && typeof raw[0] === "string";
        const isAlreadyMigrated = raw.length > 0 && typeof raw[0] === "object";

        let newPermissions;
        if (isOldShape) {
            newPermissions = raw
                .filter((pageKey) => ADMIN_PERMISSIONS.includes(pageKey))
                .map((pageKey) => ({ page: pageKey, actions: ["view", "edit", "delete"] }));
        } else if (isAlreadyMigrated) {
            newPermissions = raw;
        } else {
            newPermissions = [];
        }

        const hasMembersEntry = newPermissions.some((p) => p.page === "members");
        const needsMembersBackfill = roles.includes("admin") && !hasMembersEntry;
        if (needsMembersBackfill) {
            newPermissions = [...newPermissions, { page: "members", actions: ["view", "edit", "delete"] }];
        }

        if (isOldShape || needsMembersBackfill) {
            await users.updateOne({ _id: doc._id }, { $set: { permissions: newPermissions } });
            modified += 1;
            console.log(`Migrated ${doc.email}: ${JSON.stringify(newPermissions.map((p) => p.page))}`);
        }
    }

    console.log(`\nScanned ${scanned} candidate users. Modified ${modified}.`);
    await client.close();
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
