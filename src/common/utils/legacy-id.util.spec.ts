import { withLegacyIds } from "./legacy-id.util";

// withLegacyIds returns the same object it was handed, so its declared type
// is the input type and does not mention the `_id` it adds for the JSON
// consumer. Reading it back in a test needs a loose view of the result.
type Loose = Record<string, any>;
const legacy = (v: unknown): Loose => withLegacyIds(v) as Loose;

describe("withLegacyIds", () => {
  it("mirrors id onto _id on a plain object", () => {
    const out = legacy({ id: "6a8d9c1828b1818429e64faa", title: "Sofa" });
    expect(out).toEqual({
      id: "6a8d9c1828b1818429e64faa",
      _id: "6a8d9c1828b1818429e64faa",
      title: "Sofa",
    });
  });

  it("leaves an existing _id untouched", () => {
    // Nothing produces both today, but a caller that sets `_id` explicitly is
    // stating the identity the clients should see; silently overwriting it
    // would make this helper unsafe to apply to an already-shaped response.
    const out = legacy({ id: "derived-id", _id: "explicit-id" });
    expect(out._id).toBe("explicit-id");
  });

  it("walks arrays and nested relations", () => {
    const out = legacy({
      id: "shop1",
      products: [
        { id: "p1", category: { id: "c1" } },
        { id: "p2", category: { id: "c2" } },
      ],
    });
    expect(out._id).toBe("shop1");
    expect(out.products[0]._id).toBe("p1");
    expect(out.products[0].category._id).toBe("c1");
    expect(out.products[1].category._id).toBe("c2");
  });

  it("does not invent an _id when there is no id", () => {
    const out = legacy({ total: 12, page: 1 });
    expect(out).not.toHaveProperty("_id");
  });

  it("ignores a non-string id", () => {
    // Pagination payloads and aggregation buckets can carry a numeric `id`
    // that is not an entity key; mirroring it would be meaningless.
    const out = legacy({ id: 42 });
    expect(out).not.toHaveProperty("_id");
  });

  it("does not walk into Date values", () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    const out = legacy({ id: "x", createdAt: created });
    expect(out.createdAt).toBe(created);
    expect(out.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("survives a shared sub-object referenced twice", () => {
    const shared = { id: "cat1" };
    const out = legacy({ a: shared, b: shared });
    expect(out.a._id).toBe("cat1");
    expect(out.b).toBe(out.a);
  });

  it("survives a circular reference without hanging", () => {
    const node: Record<string, unknown> = { id: "n1" };
    node.self = node;
    expect(() => withLegacyIds(node)).not.toThrow();
    expect(node._id).toBe("n1");
  });

  it("handles null and undefined payloads", () => {
    expect(withLegacyIds(null)).toBeNull();
    expect(withLegacyIds(undefined)).toBeUndefined();
  });
});
