import { describe, expect, it } from "vitest";
import { playerBelongsToUser } from "./players";

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
