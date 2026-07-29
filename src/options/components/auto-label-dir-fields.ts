import type { AutoLabelDirCriterion } from "../../models/webui";

export type CriterionField = AutoLabelDirCriterion["field"];

export const CRITERIA_FIELDS: Array<{ value: CriterionField; label: string; placeholder: string }> = [
  { value: "trackerUrl", label: "Tracker URL", placeholder: "e.g. tracker\\.private\\.org" },
  { value: "filePath", label: "File in torrent", placeholder: "e.g. \\.mkv$" }
];

export function fieldLabel(field: string): string {
  return CRITERIA_FIELDS.find(f => f.value === field)?.label ?? field;
}
