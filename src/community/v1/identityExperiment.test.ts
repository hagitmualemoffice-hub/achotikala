import { describe, expect, it } from "vitest";
import { validatePostingIdentity, type IdentityState } from "./identityExperiment";
const state: IdentityState = { allow_nickname_posting: false, announcement_active: true, version: 1, needs_popup: true, full_name: "חברה לבדיקה", has_full_name: true };
describe("full-name experiment rules", () => {
  it("blocks nickname posting while disabled", () => { expect(() => validatePostingIdentity(state, true)).toThrow("בשם המלא בלבד"); });
  it("allows full-name posting while disabled", () => { expect(() => validatePostingIdentity(state, false)).not.toThrow(); });
  it("restores nickname posting when enabled", () => { expect(() => validatePostingIdentity({ ...state, allow_nickname_posting: true }, true)).not.toThrow(); });
  it("requires a complete full name during the experiment", () => { expect(() => validatePostingIdentity({ ...state, has_full_name: false }, false)).toThrow("שם פרטי ושם משפחה"); });
  it("does not require full-name fields in the original nickname mode", () => { expect(() => validatePostingIdentity({ ...state, allow_nickname_posting: true, has_full_name: false }, true)).not.toThrow(); });
});