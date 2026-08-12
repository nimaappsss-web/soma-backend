export const SUBJECTS_BY_TYPE: Record<string, { name: string; code: string }[]> = {
  creche: [
    { name: "Sensory Play", code: "SEN" },
    { name: "Music & Movement", code: "MVM" },
    { name: "Art & Craft", code: "ART" },
    { name: "Story Time", code: "STO" },
    { name: "Outdoor Play", code: "OUT" },
  ],
  kg: [
    { name: "Literacy", code: "LIT" },
    { name: "Numeracy", code: "NUM" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Music", code: "MUS" },
    { name: "Physical Development", code: "PED" },
    { name: "Science & Nature", code: "SCN" },
    { name: "Social Habits", code: "SOC" },
  ],
  primary: [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Physical Education", code: "PHE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Religious Studies", code: "REL" },
    { name: "Home Economics", code: "HME" },
    { name: "Agricultural Science", code: "AGR" },
  ],
  "junior-secondary": [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Physical Education", code: "PHE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Religious Studies", code: "REL" },
    { name: "Home Economics", code: "HME" },
    { name: "Agricultural Science", code: "AGR" },
  ],
  "senior-secondary": [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Biology", code: "BIO" },
    { name: "Further Mathematics", code: "FURM" },
    { name: "Economics", code: "ECO" },
    { name: "Literature in English", code: "LIT" },
    { name: "Government", code: "GOV" },
    { name: "History", code: "HIS" },
  ],
  // Legacy: pre-split "secondary" schools get the full JSS + SS set (names dedupe in getSubjectsForSchool).
  secondary: [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Creative Arts", code: "CRE" },
    { name: "Physical Education", code: "PHE" },
    { name: "Computer Studies", code: "CMP" },
    { name: "Religious Studies", code: "REL" },
    { name: "Home Economics", code: "HME" },
    { name: "Agricultural Science", code: "AGR" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Biology", code: "BIO" },
    { name: "Further Mathematics", code: "FURM" },
    { name: "Economics", code: "ECO" },
    { name: "Literature in English", code: "LIT" },
    { name: "Government", code: "GOV" },
    { name: "History", code: "HIS" },
  ],
};

export function getSubjectsForSchool(types: string[]) {
  const seen = new Set<string>();
  return [...new Set(types.flatMap((t) => SUBJECTS_BY_TYPE[t] || []))].filter(
    (s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    }
  );
}
