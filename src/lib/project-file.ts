import { parsePlan, type Plan } from "./model.ts";
export const MAX_PROJECT_BYTES = 128000;
export function serializeProject(plan: Plan): string {
  const validated = parsePlan(plan);
  if (!validated) throw new Error("Cannot save an invalid plan.");
  return JSON.stringify(
    { application: "SpaceSketch", schemaVersion: 1, plan: validated },
    null,
    2,
  );
}
export function parseProject(text: string): Plan | null {
  if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) return null;
  try {
    const data = JSON.parse(text);
    if (!data || data.application !== "SpaceSketch" || data.schemaVersion !== 1)
      return null;
    return parsePlan(data.plan);
  } catch {
    return null;
  }
}
