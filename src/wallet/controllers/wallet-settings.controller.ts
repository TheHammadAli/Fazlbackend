import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { WalletSettingsService } from "../wallet-settings.service";
import { UpdateWalletSettingsDto } from "../dto/update-wallet-settings.dto";

@ApiTags("Wallet - Settings")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/settings")
export class WalletSettingsController {
  constructor(private readonly walletSettingsService: WalletSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get wallet-wide configuration (admin)" })
  async get() {
    return this.walletSettingsService.get();
  }

  @Put()
  @RequireAction("edit")
  @ApiOperation({ summary: "Update wallet-wide configuration (admin)" })
  @ApiBody({ type: UpdateWalletSettingsDto })
  async update(@Body() dto: UpdateWalletSettingsDto, @CurrentUser("sub") adminId: string) {
    return this.walletSettingsService.update(dto, adminId);
  }
}
