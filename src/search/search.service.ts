import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class SearchService {
  private readonly AUTOCOMPLETE_URL =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json";
  private readonly DETAILS_URL =
    "https://maps.googleapis.com/maps/api/place/details/json";

  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly GEOCODE_URL =
    "https://maps.googleapis.com/maps/api/geocode/json";

  /**
   * How the area list is built.
   *
   * Google has no call that enumerates a city's neighbourhoods. Autocomplete
   * returns nothing without input, Nearby Search with sublocality or
   * neighborhood returns one or two results, and asking for "areas in Lahore"
   * returns Lahore. So the city is sampled instead: reverse-geocode a grid of
   * points across it and keep the sublocality and neighborhood components.
   *
   * 7x7 at ~2.7km spacing covers roughly 16km across, which holds a small
   * city whole and a large city's built-up centre. It found 7 areas in Taxila,
   * where autocomplete found none, and 52 in Lahore.
   *
   * 49 Geocoding requests is far too many to repeat per shop form, so the
   * result is written to city_area_cache and every later visitor is served
   * from the database.
   */
  private readonly AREA_GRID_STEPS = 7;
  private readonly AREA_GRID_SPACING_DEG = 0.025;
  private readonly AREA_COMPONENT_TYPES = [
    "sublocality",
    "sublocality_level_1",
    "neighborhood",
  ];

  /** True when a prediction actually belongs to the named city. */
  private belongsToCity(prediction: any, city: string): boolean {
    const needle = city.trim().toLowerCase();
    if (!needle) return true;
    const haystack = [
      prediction?.description,
      prediction?.structured_formatting?.secondary_text,
      ...(prediction?.terms ?? []).map((t: any) => t?.value),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  }

  private toOption(p: any, withCoordinates: boolean, coords: any = null) {
    return {
      description: p.description,
      place_id: p.place_id,
      // The leading part of the description — "Gulberg" out of
      // "Gulberg, Lahore, Pakistan" — which is what a city/area field stores.
      mainText: p.structured_formatting?.main_text ?? p.description,
      coordinates: withCoordinates ? coords : null,
    };
  }

  /** One reverse-geocode. A failure is skipped: a hole in the grid is fine. */
  private async areaNamesAt(lat: number, lng: number, apiKey: string) {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: apiKey,
      language: "en",
    });
    try {
      const res = await fetch(`${this.GEOCODE_URL}?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const names: string[] = [];
      for (const result of data.results ?? []) {
        for (const component of result.address_components ?? []) {
          const isArea = (component.types ?? []).some((t: string) =>
            this.AREA_COMPONENT_TYPES.includes(t),
          );
          if (isArea && component.long_name) names.push(component.long_name);
        }
      }
      return names;
    } catch {
      return [];
    }
  }

  /**
   * Turns a point into a readable address, for a pin dropped on the map.
   *
   * Kept server-side so the picker only needs a browser key for drawing the
   * map itself, and the key that can spend on Geocoding stays here.
   */
  async reverseGeocode(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException("lat and lng are required");
    }

    const apiKey = this.configService.getOrThrow<string>(
      "GOOGLE_LOCATION_API_KEY",
    );
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: apiKey,
      language: "en",
    });

    const res = await fetch(`${this.GEOCODE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
    const data = await res.json();
    const best = (data.results ?? [])[0];

    const component = (type: string) =>
      best?.address_components?.find((c: any) => (c.types ?? []).includes(type))
        ?.long_name ?? null;

    return {
      // Falls back to the coordinates so the field is never left blank when
      // Google has no address for a point — open ground, a new development.
      description: best?.formatted_address ?? `${lat}, ${lng}`,
      place_id: best?.place_id ?? null,
      coordinates: { lat, lng },
      city: component("locality") ?? component("administrative_area_level_2"),
      area:
        component("sublocality_level_1") ??
        component("sublocality") ??
        component("neighborhood"),
    };
  }

  /** Samples the city and returns its distinct area names. */
  private async discoverAreas(lat: number, lng: number, apiKey: string) {
    const half = (this.AREA_GRID_STEPS - 1) / 2;
    const points: { lat: number; lng: number }[] = [];
    for (let row = -half; row <= half; row++) {
      for (let col = -half; col <= half; col++) {
        points.push({
          lat: lat + row * this.AREA_GRID_SPACING_DEG,
          lng: lng + col * this.AREA_GRID_SPACING_DEG,
        });
      }
    }

    // In batches rather than all at once, to stay inside Google's per-second
    // limits without making the whole grid serial.
    const found = new Set<string>();
    const BATCH = 10;
    for (let i = 0; i < points.length; i += BATCH) {
      const batch = points.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((p) => this.areaNamesAt(p.lat, p.lng, apiKey)),
      );
      for (const names of results) for (const n of names) found.add(n);
    }

    // Geocoding also hands back fragments that are not places anyone would
    // pick — a bare "1", a lone "A Block". Anything under three characters or
    // with no letter in it is dropped.
    return [...found]
      .map((name) => name.trim())
      .filter((name) => name.length >= 3 && /\p{L}{2,}/u.test(name))
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * The areas of one city, for a field that should offer something the moment
   * it opens rather than waiting for the user to type.
   *
   * Served from the cache when it has been worked out before; otherwise the
   * grid runs, the answer is stored, and everyone after is served instantly.
   */
  async listCityAreas(city: string, lat?: number, lng?: number) {
    const cityName = city?.trim();
    if (!cityName) return [];
    const cityKey = cityName.toLowerCase();

    const cached = await this.prisma.cityAreaCache.findUnique({ where: { cityKey } });
    if (cached) {
      return cached.areas as { name: string; description: string }[];
    }

    // Without a point to sample around there is nothing to do; the caller sends
    // the coordinates it got when the city was chosen.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const apiKey = this.configService.getOrThrow<string>(
      "GOOGLE_LOCATION_API_KEY",
    );
    const names = await this.discoverAreas(lat as number, lng as number, apiKey);
    const areas = names.map((name) => ({
      name,
      description: `${name}, ${cityName}`,
    }));

    // upsert, not create: two people opening the same new city at once would
    // otherwise collide on the primary key.
    await this.prisma.cityAreaCache
      .upsert({
        where: { cityKey },
        create: { cityKey, cityName, latitude: lat, longitude: lng, areas },
        update: { cityName, latitude: lat, longitude: lng, areas },
      })
      .catch((err) => {
        // A cache write failing must not fail the request that just did the work.
        this.logger.error(`Caching areas for ${cityName} failed`, err);
      });

    return areas;
  }

  /**
   * Google Places autocomplete, restricted to Pakistan.
   *
   * The options exist for the shop form's City and Area fields:
   *
   * - `types: "(cities)"` makes the City field offer cities rather than
   *   shops and street addresses that happen to match.
   * - `lat`/`lng` bias results towards the city already chosen, so typing
   *   "gulberg" after picking Lahore offers Lahore's Gulberg first.
   * - `withCoordinates: false` skips the per-prediction Details lookup. That
   *   lookup is one extra Google request PER RESULT, on every keystroke — worth
   *   it for a city, whose coordinates then bias the area search, and pure waste
   *   for the area itself, which is only ever saved as a name.
   *
   * Defaults keep the original behaviour, since the profile and broadcast
   * screens call this with just a query and read `coordinates`.
   */
  async autocompleteLocations(
    input: string,
    opts: {
      types?: string;
      lat?: number;
      lng?: number;
      withCoordinates?: boolean;
      /** Drop anything outside this city. A bias alone still lets a
       *  same-named area in another city through. */
      city?: string;
    } = {},
  ) {
    const apiKey = this.configService.getOrThrow<string>(
      "GOOGLE_LOCATION_API_KEY",
    );

    const params = new URLSearchParams({
      input,
      key: apiKey,
      language: "en",
      components: "country:pk", // optional: restrict to Pakistan
    });

    if (opts.types) {
      params.set("types", opts.types);
    }
    // A bias, not a filter: somewhere just outside the radius still appears,
    // it simply ranks lower. 30km covers a city and its suburbs.
    if (Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
      params.set("location", `${opts.lat},${opts.lng}`);
      params.set("radius", "30000");
    }

    const res = await fetch(`${this.AUTOCOMPLETE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
    const data = await res.json();
    let predictions: any[] = data.predictions ?? [];

    if (opts.city?.trim()) {
      predictions = predictions.filter((p) => this.belongsToCity(p, opts.city!));
    }

    if (opts.withCoordinates === false) {
      return predictions.map((p) => this.toOption(p, false));
    }

    // Get coordinates for each prediction
    const enriched = await Promise.all(
      predictions.map(async (p: any) => {
        const coords = await this.getCoordinates(p.place_id, apiKey);
        return this.toOption(p, true, coords);
      }),
    );

    return enriched;
  }

  private async getCoordinates(placeId: string, apiKey: string) {
    const params = new URLSearchParams({
      place_id: placeId,
      key: apiKey,
      fields: "geometry", // limit response only to geometry
    });

    const res = await fetch(`${this.DETAILS_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
    const data = await res.json();

    return data.result?.geometry?.location ?? null;
  }
}
