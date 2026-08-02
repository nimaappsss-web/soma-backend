export const SCHOOL_CLASS_MAP: Record<string, { name: string; level: string }[]> = {
  creche: [{ name: "Creche", level: "Creche" }],
  kg: [{ name: "KG 1", level: "KG" }, { name: "KG 2", level: "KG" }],
  primary: [
    { name: "Pry 1", level: "Pry 1" },
    { name: "Pry 2", level: "Pry 2" },
    { name: "Pry 3", level: "Pry 3" },
    { name: "Pry 4", level: "Pry 4" },
    { name: "Pry 5", level: "Pry 5" },
    { name: "Pry 6", level: "Pry 6" },
  ],
  secondary: [
    { name: "JSS 1", level: "JSS 1" },
    { name: "JSS 2", level: "JSS 2" },
    { name: "JSS 3", level: "JSS 3" },
    { name: "SS 1", level: "SS 1" },
    { name: "SS 2", level: "SS 2" },
    { name: "SS 3", level: "SS 3" },
  ],
};

/**
 * Maps a class level to the school type it belongs to. Falls back to the
 * school's first configured type (or "primary") for unknown/custom levels.
 */
export const inferSchoolTypeFromLevel = (level: string, schoolTypes: string[]): string => {
  const upper = String(level).toUpperCase();
  if (/^(JSS|SS)/.test(upper)) return "secondary";
  if (/^KG/.test(upper)) return "kg";
  if (/^PRY/.test(upper)) return "primary";
  if (/^CRE/.test(upper)) return "creche";
  return schoolTypes.length > 0 ? schoolTypes[0] : "primary";
};
