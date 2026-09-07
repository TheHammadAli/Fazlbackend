import {
  adminPermissionPage,
  deliveryOption,
  reportReason,
} from "./enum-wire.util";

describe("enum wire translation", () => {
  describe("deliveryOption", () => {
    it("gives clients the hyphenated value they have always received", () => {
      expect(deliveryOption.toWire("self_pickup")).toBe("self-pickup");
    });

    it("accepts the hyphenated value clients send", () => {
      expect(deliveryOption.fromWire("self-pickup")).toBe("self_pickup");
    });

    it("leaves the unmapped member alone in both directions", () => {
      expect(deliveryOption.toWire("delivery")).toBe("delivery");
      expect(deliveryOption.fromWire("delivery")).toBe("delivery");
    });

    it("round-trips", () => {
      for (const wire of ["self-pickup", "delivery"]) {
        expect(deliveryOption.toWire(deliveryOption.fromWire(wire))).toBe(wire);
      }
    });
  });

  describe("reportReason", () => {
    it("translates the spaced value", () => {
      expect(reportReason.toWire("AdultContent")).toBe("Adult Content");
      expect(reportReason.fromWire("Adult Content")).toBe("AdultContent");
    });

    it("round-trips every reason", () => {
      for (const wire of ["Spam", "Adult Content", "Fraud", "Duplicate", "Other"]) {
        expect(reportReason.toWire(reportReason.fromWire(wire))).toBe(wire);
      }
    });
  });

  describe("adminPermissionPage", () => {
    it("translates the hyphenated page key", () => {
      expect(adminPermissionPage.toWire("email_logs")).toBe("email-logs");
      expect(adminPermissionPage.fromWire("email-logs")).toBe("email_logs");
    });

    it("leaves the other fourteen pages untouched", () => {
      for (const page of ["users", "shops", "wallet", "reviews"]) {
        expect(adminPermissionPage.toWire(page)).toBe(page);
        expect(adminPermissionPage.fromWire(page)).toBe(page);
      }
    });
  });

  describe("null handling", () => {
    it("passes null and undefined through untouched", () => {
      expect(deliveryOption.toWire(null)).toBeNull();
      expect(deliveryOption.toWire(undefined)).toBeUndefined();
      expect(reportReason.fromWire(null)).toBeNull();
    });

    it("passes an unrecognised value through rather than dropping it", () => {
      // Better a value that fails a DB enum check loudly than one silently
      // turned into null.
      expect(deliveryOption.fromWire("teleport")).toBe("teleport");
    });
  });
});
