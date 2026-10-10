import { describe, expect, it } from "vitest";

import type { DirectorySettingsData } from "@/lib/directory-settings-api";
import { settingsProgress } from "./settings-flow";

const base = {
  clinic: { id: "clinic", name: "کلینیک", timeZone: "Asia/Tehran", status: "ACTIVE", createdAt: "", updatedAt: "" },
  doctors: [], specialties: [], services: [], doctorServices: [], availabilityRules: [], closures: [], exceptions: [],
} as unknown as DirectorySettingsData;

describe("settings onboarding progress", () => {
  it("does not mark draft directory records as operationally ready", () => {
    const progress = settingsProgress({ ...base, specialties: [{ id: "specialty", name: "طب سوزنی", isActive: true, publicationStatus: "UNPUBLISHED" }] } as DirectorySettingsData);
    expect(progress.map((step) => step.complete)).toEqual([false, false, false, false, false]);
  });

  it("requires published parents, offering, and schedule in order", () => {
    const specialty = { id: "specialty", name: "طب سوزنی", isActive: true, publicationStatus: "PUBLISHED" };
    const doctor = { id: "doctor", displayName: "دکتر", specialties: [{ id: specialty.id, name: specialty.name }], isActive: true, publicationStatus: "PUBLISHED" };
    const service = { id: "service", name: "ویزیت", isActive: true, publicationStatus: "PUBLISHED" };
    const data = { ...base, specialties: [specialty], doctors: [doctor], services: [service], doctorServices: [{ id: "offering", doctor: { id: doctor.id, name: doctor.displayName }, service: { id: service.id, name: service.name }, isActive: true, publicationStatus: "PUBLISHED" }], availabilityRules: [{ id: "rule", doctorId: doctor.id, isActive: true }] } as unknown as DirectorySettingsData;
    expect(settingsProgress(data).map((step) => [step.id, step.complete])).toEqual([
      ["specialty", true], ["doctor", true], ["service", true], ["offering", true], ["schedule", true],
    ]);
  });
});
