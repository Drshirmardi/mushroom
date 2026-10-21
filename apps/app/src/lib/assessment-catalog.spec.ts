import { describe, expect, it } from "vitest";
import { groupAssessmentCatalog } from "./assessment-catalog";
import type { PublishedAssessment } from "./assessment-api";
const version = (id: string, assessmentKey: string, versionNumber: number, locale = "fa-IR"): PublishedAssessment => ({ id, assessmentKey, versionNumber, locale, title: "ارزیابی", structure: {} });
describe("assessment catalog grouping", () => {
  it("preserves exact version identifiers and server ordering without choosing a replacement", () => {
    const items = [version("new", "mizaj", 5), version("old", "mizaj", 1), version("other", "other", 2)];
    const groups = groupAssessmentCatalog(items);
    expect(groups.map(group => group.versions.map(item => item.id))).toEqual([["new", "old"], ["other"]]);
    expect(items.map(item => item.id)).toEqual(["new", "old", "other"]);
  });
  it("keeps language variants separate and handles an empty catalog", () => {
    expect(groupAssessmentCatalog([version("fa", "mizaj", 1), version("en", "mizaj", 1, "en")])).toHaveLength(2);
    expect(groupAssessmentCatalog([])).toEqual([]);
  });
});
