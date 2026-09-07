import { ApiProperty } from "@nestjs/swagger";
import type { SiteSettings as SiteSettingsRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/site-settings.schema.ts. */

export type SiteSettings = SiteSettingsRow;

/** Fixed primary key of the singleton row holding the social links. */
export const SOCIAL_LINKS_ID = "social-links";

export class SocialLinksModel {
  @ApiProperty({ type: String, nullable: true, example: "https://facebook.com/fazl" })
  facebookUrl: string | null;

  @ApiProperty({ type: String, nullable: true, example: "https://x.com/fazl" })
  twitterUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  threadsUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  linkedinUrl: string | null;
}
