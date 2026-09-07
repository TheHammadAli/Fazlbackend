import { toGeoJson, toLatLng, withGeoJson } from "./geo.util";

describe("toLatLng", () => {
  it("reads GeoJSON [lng, lat] order correctly", () => {
    // Karachi. Getting the order wrong would place this in the Indian Ocean.
    expect(toLatLng({ type: "Point", coordinates: [67.0011, 24.8607] })).toEqual({
      latitude: 24.8607,
      longitude: 67.0011,
    });
  });

  it("returns nulls for a missing or malformed location", () => {
    const empty = { latitude: null, longitude: null };
    expect(toLatLng(undefined)).toEqual(empty);
    expect(toLatLng(null)).toEqual(empty);
    expect(toLatLng({})).toEqual(empty);
    expect(toLatLng({ coordinates: [] })).toEqual(empty);
    expect(toLatLng({ coordinates: [1] })).toEqual(empty);
    expect(toLatLng({ coordinates: ["a", "b"] })).toEqual(empty);
  });

  it("rejects out-of-range coordinates rather than storing them", () => {
    // A transposed pair often lands outside the valid latitude range; better a
    // null than a listing silently placed somewhere impossible.
    expect(toLatLng({ coordinates: [24.8607, 670.011] })).toEqual({
      latitude: null,
      longitude: null,
    });
    expect(toLatLng({ coordinates: [200, 45] })).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it("accepts the extremes of both ranges", () => {
    expect(toLatLng({ coordinates: [180, 90] })).toEqual({ latitude: 90, longitude: 180 });
    expect(toLatLng({ coordinates: [-180, -90] })).toEqual({ latitude: -90, longitude: -180 });
  });
});

describe("toGeoJson", () => {
  it("emits [lng, lat] order", () => {
    expect(toGeoJson(24.8607, 67.0011)).toEqual({
      type: "Point",
      coordinates: [67.0011, 24.8607],
    });
  });

  it("returns null for an unlocated row", () => {
    expect(toGeoJson(null, null)).toBeNull();
    expect(toGeoJson(undefined, undefined)).toBeNull();
    expect(toGeoJson(24.8607, null)).toBeNull();
    expect(toGeoJson(null, 67.0011)).toBeNull();
  });

  it("round-trips through toLatLng", () => {
    const original = { type: "Point" as const, coordinates: [67.0011, 24.8607] as [number, number] };
    const { latitude, longitude } = toLatLng(original);
    expect(toGeoJson(latitude, longitude)).toEqual(original);
  });
});

describe("withGeoJson", () => {
  it("replaces the coordinate columns with a location field", () => {
    const row = { id: "p1", title: "Sofa", latitude: 24.8607, longitude: 67.0011 };
    expect(withGeoJson(row)).toEqual({
      id: "p1",
      title: "Sofa",
      location: { type: "Point", coordinates: [67.0011, 24.8607] },
    });
  });

  it("does not leak latitude/longitude into the response", () => {
    const out = withGeoJson({ id: "p1", latitude: 1, longitude: 2 });
    expect(out).not.toHaveProperty("latitude");
    expect(out).not.toHaveProperty("longitude");
  });

  it("gives an unlocated row a null location", () => {
    expect(withGeoJson({ id: "p1", latitude: null, longitude: null })).toEqual({
      id: "p1",
      location: null,
    });
  });
});
