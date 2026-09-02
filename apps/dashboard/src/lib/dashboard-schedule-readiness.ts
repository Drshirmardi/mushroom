import type { DirectorySettingsData } from "./directory-settings-api";

export interface DashboardScheduleReadiness {
  activeOfferings: number;
  activeRules: number;
  nextDayIsoWeekday: number;
  nextDayRuleCount: number;
  timeZone: string;
}

const weekday: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function projectDashboardScheduleReadiness(data: DirectorySettingsData, now = new Date()): DashboardScheduleReadiness {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: data.clinic.timeZone });
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextDayIsoWeekday = weekday[formatter.format(tomorrow)] ?? 1;
  const activeRules = data.availabilityRules.filter((rule) => rule.isActive);
  return {
    activeOfferings: data.doctorServices.filter((offering) => offering.isActive && offering.publicationStatus === "PUBLISHED").length,
    activeRules: activeRules.length,
    nextDayIsoWeekday,
    nextDayRuleCount: activeRules.filter((rule) => rule.isoWeekday === nextDayIsoWeekday).length,
    timeZone: data.clinic.timeZone,
  };
}
