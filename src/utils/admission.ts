export const generatePrefix = (schoolName: string): string => {
  const words = schoolName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  return words.map((w) => w.charAt(0).toUpperCase()).join("");
};

export const generateAdmissionNo = (pattern: string, counter: number): string => {
  const year = new Date().getFullYear().toString();
  const seq = String(counter).padStart(3, "0");
  return pattern.replace(/{year}/g, year).replace(/{seq}/g, seq);
};

export const exampleToPattern = (example: string): string => {
  let pattern = example;
  // Replace a 4-digit year (1900-2099) with {year}
  pattern = pattern.replace(/\b(19\d{2}|20\d{2})\b/, "{year}");
  // Replace the remaining padded number (the seq) with {seq}
  pattern = pattern.replace(/\b0*\d+\b/, "{seq}");
  return pattern;
};
