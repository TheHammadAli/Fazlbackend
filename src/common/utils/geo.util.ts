/**
 * Translation between the GeoJSON the API speaks and the latitude/longitude
 * columns Postgres stores.
 *
 * Mongo held a GeoJSON Point per document and all three clients send and read
 * that shape. Postgres keeps plain `latitude`/`longitude` columns (plus a
 * PostGIS `geom` column maintained by trigger, which Prisma never sees), so
 * every read and write of a located model converts at the service boundary and
 * the wire format stays exactly what it was.
 *
 * Note the ordering trap: GeoJSON coordinates are [longitude, latitude], the
 * opposite of how they are usually spoken. Getting this backwards silently
 * places a listing in the wrong hemisphere rather than failing, so the
 * conversion lives here once instead of being rewritten per model.
 */

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface LatLng {
  latitude: number | null;
  longitude: number | null;
}

/** True for a finite coordinate pair inside the valid lat/lng ranges. */
function isValidPair(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * GeoJSON Point (or anything shaped like one) -> latitude/longitude columns.
 * Anything malformed yields nulls rather than throwing: an unlocated row is a
 * normal state, and a listing should not fail to save over a bad coordinate.
 */
export function toLatLng(location: unknown): LatLng {
  const coords = (location as { coordinates?: unknown })?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return { latitude: null, longitude: null };
  }

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!isValidPair(lat, lng)) {
    return { latitude: null, longitude: null };
  }

  return { latitude: lat, longitude: lng };
}

/**
 * latitude/longitude columns -> the GeoJSON Point clients expect.
 * Returns null when the row has no coordinates, matching a document that simply
 * had no `location` field.
 */
export function toGeoJson(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): GeoJsonPoint | null {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return null;
  }
  if (!isValidPair(Number(latitude), Number(longitude))) {
    return null;
  }
  return { type: "Point", coordinates: [Number(longitude), Number(latitude)] };
}

/**
 * Replaces a row's latitude/longitude with the `location` field clients read,
 * leaving every other property untouched. Used on the way out of every located
 * model's service.
 */
export function withGeoJson<T extends { latitude?: number | null; longitude?: number | null }>(
  row: T,
): Omit<T, "latitude" | "longitude"> & { location: GeoJsonPoint | null } {
  const { latitude, longitude, ...rest } = row;
  return {
    ...rest,
    location: toGeoJson(latitude, longitude),
  } as Omit<T, "latitude" | "longitude"> & { location: GeoJsonPoint | null };
}
