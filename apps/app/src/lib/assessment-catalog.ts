import type { PublishedAssessment } from "./assessment-api";

/** Keep each exact version available; grouping never selects or starts a version. */
export function groupAssessmentCatalog(items: PublishedAssessment[]) {
  const groups = new Map<string, { key: string; title: string; versions: PublishedAssessment[] }>();
  for (const item of items) {
    const key = JSON.stringify([item.assessmentKey, item.locale]);
    const group = groups.get(key);
    if (group) group.versions.push(item);
    else groups.set(key, { key, title: item.title, versions: [item] });
  }
  return Array.from(groups.values());
}
