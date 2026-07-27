import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  integrationStatus,
  isOutreachConfigured,
  isSalesforceConfigured,
  isSixSenseConfigured,
  isZoomInfoConfigured,
} from "@/lib/integrations/config";

/**
 * The config module reads process.env lazily inside each isConfigured()
 * function, so we can flip vars per-test. Snapshot and restore env so tests
 * don't leak into each other.
 */
const KEYS = [
  "SALESFORCE_PROVIDER",
  "SALESFORCE_CLIENT_ID",
  "SALESFORCE_CLIENT_SECRET",
  "SALESFORCE_REFRESH_TOKEN",
  "ZOOMINFO_USERNAME",
  "ZOOMINFO_CLIENT_ID",
  "ZOOMINFO_PRIVATE_KEY",
  "OUTREACH_CLIENT_ID",
  "OUTREACH_CLIENT_SECRET",
  "OUTREACH_REFRESH_TOKEN",
  "SIXSENSE_API_TOKEN",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("integration config gating", () => {
  it("everything is off with no env vars (mock fallback)", () => {
    expect(isSalesforceConfigured()).toBe(false);
    expect(isZoomInfoConfigured()).toBe(false);
    expect(isOutreachConfigured()).toBe(false);
    expect(isSixSenseConfigured()).toBe(false);
    expect(integrationStatus().every((s) => !s.configured)).toBe(true);
  });

  it("6sense turns on with just its token", () => {
    process.env.SIXSENSE_API_TOKEN = "tok_123";
    expect(isSixSenseConfigured()).toBe(true);
  });

  it("ZoomInfo needs all three credentials", () => {
    process.env.ZOOMINFO_USERNAME = "u";
    process.env.ZOOMINFO_CLIENT_ID = "c";
    expect(isZoomInfoConfigured()).toBe(false);
    process.env.ZOOMINFO_PRIVATE_KEY = "k";
    expect(isZoomInfoConfigured()).toBe(true);
  });

  it("Outreach needs client id/secret + refresh token", () => {
    process.env.OUTREACH_CLIENT_ID = "c";
    process.env.OUTREACH_CLIENT_SECRET = "s";
    expect(isOutreachConfigured()).toBe(false);
    process.env.OUTREACH_REFRESH_TOKEN = "r";
    expect(isOutreachConfigured()).toBe(true);
  });

  it("Salesforce stays mock until provider=global-sf AND creds are present", () => {
    process.env.SALESFORCE_CLIENT_ID = "c";
    process.env.SALESFORCE_CLIENT_SECRET = "s";
    process.env.SALESFORCE_REFRESH_TOKEN = "r";
    // Creds present but provider not flipped → still mock.
    expect(isSalesforceConfigured()).toBe(false);
    process.env.SALESFORCE_PROVIDER = "global-sf";
    expect(isSalesforceConfigured()).toBe(true);
  });

  it("treats whitespace-only values as unset", () => {
    process.env.SIXSENSE_API_TOKEN = "   ";
    expect(isSixSenseConfigured()).toBe(false);
  });
});
