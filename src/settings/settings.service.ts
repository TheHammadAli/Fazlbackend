import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateSocialLinksDto } from "./dto/update-social-links.dto";
import { SOCIAL_LINKS_ID } from "./model/site-settings.model";

const URL_PATTERN = /^https?:\/\/.+/i;

type SocialLinksResult = {
  facebookUrl: string | null;
  twitterUrl: string | null;
  threadsUrl: string | null;
  linkedinUrl: string | null;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSocialLinks(): Promise<SocialLinksResult> {
    // Singleton row keyed by a fixed string id, exactly as in Mongo.
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: SOCIAL_LINKS_ID },
    });
    return {
      facebookUrl: row?.facebookUrl ?? null,
      twitterUrl: row?.twitterUrl ?? null,
      threadsUrl: row?.threadsUrl ?? null,
      linkedinUrl: row?.linkedinUrl ?? null,
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

    // Was findByIdAndUpdate(..., { upsert: true, new: true }).
    const row = await this.prisma.siteSettings.upsert({
      where: { id: SOCIAL_LINKS_ID },
      create: { id: SOCIAL_LINKS_ID, ...update },
      update,
    });

    return {
      facebookUrl: row.facebookUrl ?? null,
      twitterUrl: row.twitterUrl ?? null,
      threadsUrl: row.threadsUrl ?? null,
      linkedinUrl: row.linkedinUrl ?? null,
    };
  }
}
