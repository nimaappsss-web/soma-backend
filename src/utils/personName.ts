const TITLES = ["mr", "mrs", "ms", "miss", "dr", "prof", "alhaji", "alhaja", "chief"];

const LEADING_TITLE = new RegExp(`^(?:${TITLES.join("|")})\\.?\\s+`, "i");

const DOUBLE_TITLE = new RegExp(
  `^(?:${TITLES.join("|")})\\.?\\s+(?=${TITLES.join("|")}\\.?\\s)`,
  "i",
);

/**
 * Normalizes a person's display name: trims/collapses whitespace and removes
 * a doubled leading title such as "Mr Mr Jonah Josiah" -> "Mr Jonah Josiah"
 * (guards against duplicate titles from clients that combine a title field
 * with a free-text name that already includes one).
 */
export const normalizePersonName = (name?: string | null): string => {
  if (!name) return "";
  let s = name.trim().replace(/\s+/g, " ");
  while (DOUBLE_TITLE.test(s)) {
    s = s.replace(DOUBLE_TITLE, "");
  }
  return s;
};

/** Strips a leading title entirely, e.g. "Mr Jonah Josiah" -> "Jonah Josiah". */
export const stripLeadingTitle = (name?: string | null): string =>
  normalizePersonName(name).replace(LEADING_TITLE, "");