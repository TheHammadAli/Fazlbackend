import { generateObjectId, isObjectIdLike } from "./object-id.util";

describe("generateObjectId", () => {
  it("produces a 24-character hex string", () => {
    const id = generateObjectId();
    expect(id).toHaveLength(24);
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("never repeats across a large batch", () => {
    const ids = new Set(Array.from({ length: 50_000 }, generateObjectId));
    expect(ids.size).toBe(50_000);
  });

  it("encodes the current time in the leading 4 bytes", () => {
    const before = Math.floor(Date.now() / 1000);
    const seconds = parseInt(generateObjectId().slice(0, 8), 16);
    const after = Math.floor(Date.now() / 1000);
    expect(seconds).toBeGreaterThanOrEqual(before);
    expect(seconds).toBeLessThanOrEqual(after);
  });

  it("sorts chronologically as a string, like a real ObjectId", () => {
    // Feed ordering and several indexes rely on created-at ordering; ids that
    // sort the same way keep cursor-style paging viable.
    const a = generateObjectId();
    const b = generateObjectId();
    expect(a < b).toBe(true);
  });

  it("passes the same validity check the codebase already applies to ids", () => {
    expect(isObjectIdLike(generateObjectId())).toBe(true);
  });
});

describe("isObjectIdLike", () => {
  it("accepts a real Mongo id", () => {
    expect(isObjectIdLike("6a8d9c1828b1818429e64faa")).toBe(true);
  });

  it("rejects a UUID, a short string, and non-strings", () => {
    expect(isObjectIdLike("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(false);
    expect(isObjectIdLike("thread-1")).toBe(false);
    expect(isObjectIdLike(null)).toBe(false);
    expect(isObjectIdLike(12345)).toBe(false);
  });
});
