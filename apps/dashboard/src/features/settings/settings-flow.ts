import type { DirectorySettingsData } from "@/lib/directory-settings-api";

export interface SettingsProgressStep {
  id: "specialty" | "doctor" | "service" | "offering" | "schedule";
  label: string;
  complete: boolean;
}

export function settingsProgress(data: DirectorySettingsData): SettingsProgressStep[] {
  const activePublishedSpecialties = new Set(data.specialties.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED").map((item) => item.id));
  const activePublishedDoctors = new Set(data.doctors.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED" && item.specialties.some((specialty) => activePublishedSpecialties.has(specialty.id))).map((item) => item.id));
  const activePublishedServices = new Set(data.services.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED").map((item) => item.id));
  const offeringReady = data.doctorServices.some((item) => item.isActive && item.publicationStatus === "PUBLISHED" && activePublishedDoctors.has(item.doctor.id) && activePublishedServices.has(item.service.id));
  const scheduleReady = data.availabilityRules.some((item) => item.isActive && activePublishedDoctors.has(item.doctorId));
  return [
    { id: "specialty", label: "تخصص منتشرشده", complete: activePublishedSpecialties.size > 0 },
    { id: "doctor", label: "پزشک آماده رزرو", complete: activePublishedDoctors.size > 0 },
    { id: "service", label: "خدمت منتشرشده", complete: activePublishedServices.size > 0 },
    { id: "offering", label: "تعرفه فعال", complete: offeringReady },
    { id: "schedule", label: "ساعات کاری", complete: scheduleReady },
  ];
}
