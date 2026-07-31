import { describe, expect, it } from "vitest";
import { canonicalPlayerId, playerBelongsToUser } from "./players";

describe("playerBelongsToUser", () => {
  it("is true when the player's linkedUserId matches the given user", () => {
    expect(playerBelongsToUser({ linkedUserId: "u1" }, "u1")).toBe(true);
  });

  it("is false for a different user, even if both are set", () => {
    expect(playerBelongsToUser({ linkedUserId: "u1" }, "u2")).toBe(false);
  });

  it("is false when the player hasn't linked any account yet", () => {
    expect(playerBelongsToUser({ linkedUserId: null }, "u1")).toBe(false);
  });

  it("is false when the player row is missing entirely", () => {
    expect(playerBelongsToUser(undefined, "u1")).toBe(false);
  });

  it("is false when there's no signed-in user to compare against", () => {
    expect(playerBelongsToUser({ linkedUserId: "u1" }, undefined)).toBe(false);
  });
});

describe("canonicalPlayerId", () => {
  it("resolves to the linked account, so the same person's rows group together", () => {
    const playersById = {
      "row-owned-by-me": { linkedUserId: "u-maja" },
      "row-owned-by-maja": { linkedUserId: "u-maja" },
    };
    expect(canonicalPlayerId("row-owned-by-me", playersById)).toBe("u-maja");
    expect(canonicalPlayerId("row-owned-by-maja", playersById)).toBe("u-maja");
  });

  it("falls back to the row id for a guest player who never linked an account", () => {
    const playersById = { "guest-row": { linkedUserId: null } };
    expect(canonicalPlayerId("guest-row", playersById)).toBe("guest-row");
  });

  it("falls back to the row id when the row itself isn't known yet", () => {
    expect(canonicalPlayerId("unknown-row", {})).toBe("unknown-row");
  });
});
