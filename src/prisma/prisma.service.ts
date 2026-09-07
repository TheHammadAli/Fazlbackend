import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * The single PrismaClient for the whole application, wired into Nest's
 * lifecycle so the pool opens on boot and drains on shutdown.
 *
 * Prisma 7 connects through a driver adapter rather than a `url` in
 * schema.prisma, so the node-postgres pool is constructed here from
 * DATABASE_URL. That also gives us a real `pg` pool to tune if the API is ever
 * scaled past PM2's current single fork.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>("DATABASE_URL");

    if (!connectionString) {
      // Fail at construction rather than on the first query, so a
      // misconfigured deploy dies at bootstrap and the health check catches it.
      throw new Error(
        "DATABASE_URL is not set — PrismaService cannot be constructed.",
      );
    }

    super({
      adapter: new PrismaPg({ connectionString }),
      log:
        process.env.NODE_ENV === "production"
          ? ["warn", "error"]
          : ["warn", "error"],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Connected to PostgreSQL");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Disconnected from PostgreSQL");
  }
}
