import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SiteSettings, SiteSettingsDocument } from "./schema/site-settings.schema";
import { UpdateSocialLinksDto } from "./dto/update-social-links.dto";

const SOCIAL_LINKS_ID = "social-links";
const URL_PATTERN = /^https?:\/\/.+/i;

type SocialLinksResult = {
  facebookUrl: string | null;
  twitterUrl: string | null;
  threadsUrl: string | null;
  linkedinUrl: string | null;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(SiteSettings.name)
    private readonly siteSettingsModel: Model<SiteSettingsDocument>,
  ) { }

  async getSocialLinks(): Promise<SocialLinksResult> {
    const doc = await this.siteSettingsModel.findById(SOCIAL_LINKS_ID).lean();
    return {
      facebookUrl: doc?.facebookUrl ?? null,
      twitterUrl: doc?.twitterUrl ?? null,
      threadsUrl: doc?.threadsUrl ?? null,
      linkedinUrl: doc?.linkedinUrl ?? null,
    };
  }

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
  private validateDto(dto: UpdateSocialLinksDto): Partial<SocialLinksResult> {
    const fields = ["facebookUrl", "twitterUrl", "threadsUrl", "linkedinUrl"] as const;
    const update: Partial<SocialLinksResult> = {};

    for (const field of fields) {
      const raw = dto[field];
      if (raw === undefined) continue;

      const trimmed = raw.trim();
      if (trimmed === "") {
        update[field] = null;
        continue;
      }

      if (!URL_PATTERN.test(trimmed)) {
        throw new BadRequestException(`${field} must be a valid http(s) URL`);
      }
      update[field] = trimmed;
    }

    return update;
  }

  async updateSocialLinks(dto: UpdateSocialLinksDto): Promise<SocialLinksResult> {
    const update = this.validateDto(dto);

    const doc = await this.siteSettingsModel
      .findByIdAndUpdate(
        SOCIAL_LINKS_ID,
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();

    return {
      facebookUrl: doc?.facebookUrl ?? null,
      twitterUrl: doc?.twitterUrl ?? null,
      threadsUrl: doc?.threadsUrl ?? null,
      linkedinUrl: doc?.linkedinUrl ?? null,
    };
  }
}
