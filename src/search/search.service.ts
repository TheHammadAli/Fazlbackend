import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SearchService {
  private readonly AUTOCOMPLETE_URL =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json";
  private readonly DETAILS_URL =
    "https://maps.googleapis.com/maps/api/place/details/json";

  constructor(private readonly configService: ConfigService) {}

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
  /**
   * Seeds for listing a city's areas.
   *
   * Google will not enumerate the neighbourhoods of a city — autocomplete
   * returns nothing without input, Nearby Search with sublocality/neighborhood
   * returns one or two results, and asking it for "areas in Lahore" gives the
   * city itself. Searching the words Pakistani area names are built from, and
   * keeping only what sits in the requested city, is what actually produces a
   * usable list.
   */
  private readonly AREA_SEEDS = ["town", "block", "phase", "colony", "sector"];

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

  /**
   * The areas of one city, for a field that should offer something the moment
   * it opens rather than waiting for the user to type.
   */
  async listCityAreas(city: string, lat?: number, lng?: number) {
    const apiKey = this.configService.getOrThrow<string>(
      "GOOGLE_LOCATION_API_KEY",
    );
    const trimmedCity = city?.trim();
    if (!trimmedCity) return [];

    const batches = await Promise.all(
      this.AREA_SEEDS.map(async (seed) => {
        const params = new URLSearchParams({
          input: seed,
          key: apiKey,
          language: "en",
          components: "country:pk",
          types: "(regions)",
        });
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          params.set("location", `${lat},${lng}`);
          params.set("radius", "30000");
        }
        try {
          const res = await fetch(`${this.AUTOCOMPLETE_URL}?${params.toString()}`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.predictions ?? []) as any[];
        } catch {
          // One seed failing must not empty the whole list.
          return [];
        }
      }),
    );

    const byPlaceId = new Map<string, any>();
    for (const prediction of batches.flat()) {
      if (!this.belongsToCity(prediction, trimmedCity)) continue;
      if (!byPlaceId.has(prediction.place_id)) {
        byPlaceId.set(prediction.place_id, this.toOption(prediction, false));
      }
    }

    return [...byPlaceId.values()];
  }

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
