interface Topic {
  term: number;
  week: number;
  topic: string;
}

interface SubjectCurriculum {
  name: string;
  code: string;
  topics: Topic[];
}

type ClassLevel = "KG 1" | "KG 2" | "Pry 1" | "Pry 2" | "Pry 3" | "Pry 4" | "Pry 5" | "Pry 6" | "JSS 1" | "JSS 2" | "JSS 3" | "SS 1" | "SS 2" | "SS 3";

const PRIMARY_SUBJECTS: string[] = [
  "Mathematics", "English Language", "Basic Science",
  "Social Studies", "Civic Education", "Creative Arts",
  "Physical Education", "Computer Studies", "Religious Studies",
  "Home Economics", "Agricultural Science",
];

const JSS_SUBJECTS: string[] = [
  "Mathematics", "English Language", "Basic Science",
  "Social Studies", "Civic Education", "Creative Arts",
  "Physical Education", "Computer Studies", "Religious Studies",
  "Home Economics", "Agricultural Science",
];

const SSS_SUBJECTS: string[] = [
  "Mathematics", "English Language", "Physics", "Chemistry",
  "Biology", "Further Mathematics", "Economics",
  "Literature in English", "Government", "History",
];

const KG_TOPICS: Topic[] = [
  { term: 1, week: 1, topic: "Pre-Reading Skills: Visual Discrimination" },
  { term: 1, week: 2, topic: "Pre-Reading Skills: Auditory Discrimination" },
  { term: 1, week: 3, topic: "Pre-Writing Skills: Tracing Lines & Shapes" },
  { term: 1, week: 4, topic: "Number Recognition: 1-10" },
  { term: 1, week: 5, topic: "Counting & Number Sense" },
  { term: 1, week: 6, topic: "Colours: Identification & Sorting" },
  { term: 1, week: 7, topic: "Shapes: Circle, Square, Triangle" },
  { term: 1, week: 8, topic: "Body Parts & Self-Awareness" },
  { term: 1, week: 9, topic: "Weather & Seasons" },
  { term: 1, week: 10, topic: "Revision & Assessment" },
  { term: 1, week: 11, topic: "My Family & Community" },
  { term: 1, week: 12, topic: "Safety Rules at Home & School" },
  { term: 2, week: 1, topic: "Phonics: Letter Sounds A-M" },
  { term: 2, week: 2, topic: "Phonics: Letter Sounds N-Z" },
  { term: 2, week: 3, topic: "Blending Simple Words" },
  { term: 2, week: 4, topic: "Number Recognition: 11-20" },
  { term: 2, week: 5, topic: "Simple Addition Using Objects" },
  { term: 2, week: 6, topic: "Simple Subtraction Using Objects" },
  { term: 2, week: 7, topic: "Days of the Week & Months" },
  { term: 2, week: 8, topic: "Plants & Living Things" },
  { term: 2, week: 9, topic: "Animals: Farm & Wild" },
  { term: 2, week: 10, topic: "Revision & Assessment" },
  { term: 2, week: 11, topic: "Water & Its Uses" },
  { term: 2, week: 12, topic: "Good Habits & Hygiene" },
  { term: 3, week: 1, topic: "Reading Simple Sentences" },
  { term: 3, week: 2, topic: "Writing Simple Words" },
  { term: 3, week: 3, topic: "Number Recognition: 1-50" },
  { term: 3, week: 4, topic: "Addition Within 10" },
  { term: 3, week: 5, topic: "Subtraction Within 10" },
  { term: 3, week: 6, topic: "Money: Identifying Coins & Notes" },
  { term: 3, week: 7, topic: "Time: Morning, Afternoon, Evening" },
  { term: 3, week: 8, topic: "Transportation: Land, Air, Water" },
  { term: 3, week: 9, topic: "Festivals & Celebrations" },
  { term: 3, week: 10, topic: "Revision & Assessment" },
  { term: 3, week: 11, topic: "My School & My Country" },
  { term: 3, week: 12, topic: "End of Year Review" },
];

const MATH_TOPICS_BY_CLASS: Record<string, Topic[]> = {
  "Pry 1": [
    { term: 1, week: 1, topic: "Counting and Writing Numbers 1-100" },
    { term: 1, week: 2, topic: "Place Value of Numbers" },
    { term: 1, week: 3, topic: "Addition of Whole Numbers Without Regrouping" },
    { term: 1, week: 4, topic: "Subtraction of Whole Numbers Without Regrouping" },
    { term: 1, week: 5, topic: "Ordinal Numbers" },
    { term: 1, week: 6, topic: "Fractions: Halves and Quarters" },
    { term: 1, week: 7, topic: "Measurement of Length" },
    { term: 1, week: 8, topic: "Measurement of Mass (Weight)" },
    { term: 1, week: 9, topic: "Time: Reading the Clock" },
    { term: 1, week: 10, topic: "Money: Naira and Kobo" },
    { term: 1, week: 11, topic: "Revision" },
    { term: 1, week: 12, topic: "Examination" },
    { term: 2, week: 1, topic: "Addition with Regrouping" },
    { term: 2, week: 2, topic: "Subtraction with Regrouping" },
    { term: 2, week: 3, topic: "Multiplication as Repeated Addition" },
    { term: 2, week: 4, topic: "Division as Sharing" },
    { term: 2, week: 5, topic: "2-D and 3-D Shapes" },
    { term: 2, week: 6, topic: "Symmetry" },
    { term: 2, week: 7, topic: "Capacity: Litres" },
    { term: 2, week: 8, topic: "Data Collection and Pictograms" },
    { term: 2, week: 9, topic: "Money: Addition and Subtraction" },
    { term: 2, week: 10, topic: "Length: Addition and Subtraction" },
    { term: 2, week: 11, topic: "Revision" },
    { term: 2, week: 12, topic: "Examination" },
    { term: 3, week: 1, topic: "Numbers 1-200" },
    { term: 3, week: 2, topic: "Addition and Subtraction Review" },
    { term: 3, week: 3, topic: "Multiplication Tables 2 and 3" },
    { term: 3, week: 4, topic: "Division: Sharing and Grouping" },
    { term: 3, week: 5, topic: "Fractions: Thirds" },
    { term: 3, week: 6, topic: "Time: Days, Weeks, Months" },
    { term: 3, week: 7, topic: "Money: Shopping Problems" },
    { term: 3, week: 8, topic: "Weight: Comparing Objects" },
    { term: 3, week: 9, topic: "Position and Direction" },
    { term: 3, week: 10, topic: "Revision" },
    { term: 3, week: 11, topic: "Problem Solving" },
    { term: 3, week: 12, topic: "Examination" },
  ],
  "Pry 3": [
    { term: 1, week: 1, topic: "Whole Numbers 1-1000" },
    { term: 1, week: 2, topic: "Place Value and Expanded Notation" },
    { term: 1, week: 3, topic: "Addition of 3-Digit Numbers" },
    { term: 1, week: 4, topic: "Subtraction of 3-Digit Numbers" },
    { term: 1, week: 5, topic: "Multiplication of 2-Digit by 1-Digit" },
    { term: 1, week: 6, topic: "Division of 2-Digit by 1-Digit" },
    { term: 1, week: 7, topic: "Fractions: Equivalent Fractions" },
    { term: 1, week: 8, topic: "Length: Kilometres and Metres" },
    { term: 1, week: 9, topic: "Area of Rectangles" },
    { term: 1, week: 10, topic: "Perimeter of Shapes" },
    { term: 1, week: 11, topic: "Revision" },
    { term: 1, week: 12, topic: "Examination" },
    { term: 2, week: 1, topic: "Addition and Subtraction of Fractions" },
    { term: 2, week: 2, topic: "Multiplication of 3-Digit by 2-Digit" },
    { term: 2, week: 3, topic: "Division with Remainders" },
    { term: 2, week: 4, topic: "Decimals: Tenths and Hundredths" },
    { term: 2, week: 5, topic: "Money: Profit and Loss" },
    { term: 2, week: 6, topic: "Time: 24-Hour Clock" },
    { term: 2, week: 7, topic: "Capacity: Millilitres and Litres" },
    { term: 2, week: 8, topic: "Weight: Grams and Kilograms" },
    { term: 2, week: 9, topic: "Angles: Right Angles" },
    { term: 2, week: 10, topic: "Bar Charts and Tally Marks" },
    { term: 2, week: 11, topic: "Revision" },
    { term: 2, week: 12, topic: "Examination" },
    { term: 3, week: 1, topic: "Whole Numbers 1-5000" },
    { term: 3, week: 2, topic: "Addition and Subtraction Review" },
    { term: 3, week: 3, topic: "Multiplication and Division Review" },
    { term: 3, week: 4, topic: "Fractions: Ordering and Comparing" },
    { term: 3, week: 5, topic: "Decimals: Addition and Subtraction" },
    { term: 3, week: 6, topic: "Money: Simple Interest" },
    { term: 3, week: 7, topic: "Time: Timetables and Schedules" },
    { term: 3, week: 8, topic: "Geometry: Properties of Shapes" },
    { term: 3, week: 9, topic: "Measurement: Volume" },
    { term: 3, week: 10, topic: "Data: Mean, Median, Mode" },
    { term: 3, week: 11, topic: "Revision" },
    { term: 3, week: 12, topic: "Examination" },
  ],
  "JSS 1": [
    { term: 1, week: 1, topic: "Whole Numbers: Place Value & Notation" },
    { term: 1, week: 2, topic: "Addition and Subtraction of Whole Numbers" },
    { term: 1, week: 3, topic: "Multiplication and Division of Whole Numbers" },
    { term: 1, week: 4, topic: "LCM and HCF" },
    { term: 1, week: 5, topic: "Fractions: Types and Operations" },
    { term: 1, week: 6, topic: "Decimals: Operations and Applications" },
    { term: 1, week: 7, topic: "Approximation and Estimation" },
    { term: 1, week: 8, topic: "Indices: Squares and Square Roots" },
    { term: 1, week: 9, topic: "Number Bases" },
    { term: 1, week: 10, topic: "Directed Numbers: Integers" },
    { term: 1, week: 11, topic: "Revision" },
    { term: 1, week: 12, topic: "Examination" },
    { term: 2, week: 1, topic: "Algebraic Expressions" },
    { term: 2, week: 2, topic: "Simple Equations" },
    { term: 2, week: 3, topic: "Linear Inequalities" },
    { term: 2, week: 4, topic: "Geometry: Lines and Angles" },
    { term: 2, week: 5, topic: "Triangles and Properties" },
    { term: 2, week: 6, topic: "Quadrilaterals" },
    { term: 2, week: 7, topic: "Perimeter and Area" },
    { term: 2, week: 8, topic: "Volume of Prisms" },
    { term: 2, week: 9, topic: "Ratio and Proportion" },
    { term: 2, week: 10, topic: "Percentage Increase and Decrease" },
    { term: 2, week: 11, topic: "Revision" },
    { term: 2, week: 12, topic: "Examination" },
    { term: 3, week: 1, topic: "Simple Statistics: Data Collection" },
    { term: 3, week: 2, topic: "Frequency Tables and Tally" },
    { term: 3, week: 3, topic: "Mean, Median, Mode" },
    { term: 3, week: 4, topic: "Probability: Simple Events" },
    { term: 3, week: 5, topic: "Powers and Roots" },
    { term: 3, week: 6, topic: "Standard Form" },
    { term: 3, week: 7, topic: "Consumer Arithmetic: Profit & Loss" },
    { term: 3, week: 8, topic: "Simple Interest" },
    { term: 3, week: 9, topic: "Discount and Commission" },
    { term: 3, week: 10, topic: "Revision" },
    { term: 3, week: 11, topic: "Mock Examination" },
    { term: 3, week: 12, topic: "Examination" },
  ],
  "SS 1": [
    { term: 1, week: 1, topic: "Number Bases: Conversion and Operations" },
    { term: 1, week: 2, topic: "Indices and Laws of Indices" },
    { term: 1, week: 3, topic: "Logarithms: Introduction and Properties" },
    { term: 1, week: 4, topic: "Sets: Notation and Operations" },
    { term: 1, week: 5, topic: "Venn Diagrams and Applications" },
    { term: 1, week: 6, topic: "Surds: Simplification and Rationalization" },
    { term: 1, week: 7, topic: "Polynomials: Addition, Subtraction, Multiplication" },
    { term: 1, week: 8, topic: "Factorisation of Polynomials" },
    { term: 1, week: 9, topic: "Simultaneous Linear Equations" },
    { term: 1, week: 10, topic: "Quadratic Equations: Solution by Factorisation" },
    { term: 1, week: 11, topic: "Revision" },
    { term: 1, week: 12, topic: "Examination" },
    { term: 2, week: 1, topic: "Straight Line Graphs" },
    { term: 2, week: 2, topic: "Quadratic Graphs" },
    { term: 2, week: 3, topic: "Inequalities in One and Two Variables" },
    { term: 2, week: 4, topic: "Trigonometry: Sine, Cosine, Tangent" },
    { term: 2, week: 5, topic: "Angles of Elevation and Depression" },
    { term: 2, week: 6, topic: "Bearings and Distances" },
    { term: 2, week: 7, topic: "Statistics: Measures of Central Tendency" },
    { term: 2, week: 8, topic: "Measures of Dispersion" },
    { term: 2, week: 9, topic: "Probability: Mutually Exclusive Events" },
    { term: 2, week: 10, topic: "Probability: Conditional Probability" },
    { term: 2, week: 11, topic: "Revision" },
    { term: 2, week: 12, topic: "Examination" },
    { term: 3, week: 1, topic: "Differentiation: Introduction" },
    { term: 3, week: 2, topic: "Differentiation: Rules and Applications" },
    { term: 3, week: 3, topic: "Integration: Introduction" },
    { term: 3, week: 4, topic: "Integration: Definite and Indefinite" },
    { term: 3, week: 5, topic: "Coordinate Geometry: Distance and Midpoint" },
    { term: 3, week: 6, topic: "Equation of a Straight Line" },
    { term: 3, week: 7, topic: "Circle Geometry" },
    { term: 3, week: 8, topic: "Mensuration: Surface Area and Volume" },
    { term: 3, week: 9, topic: "Vectors: Addition and Scalar Multiplication" },
    { term: 3, week: 10, topic: "Revision" },
    { term: 3, week: 11, topic: "Mock Examination" },
    { term: 3, week: 12, topic: "Examination" },
  ],
};

const GEN_SUBJECT_TOPICS: Topic[] = [
  { term: 1, week: 1, topic: "Introduction to the Subject" },
  { term: 1, week: 2, topic: "Core Concepts and Terminology" },
  { term: 1, week: 3, topic: "Foundational Principles" },
  { term: 1, week: 4, topic: "Topic 1: Key Ideas" },
  { term: 1, week: 5, topic: "Topic 2: Application" },
  { term: 1, week: 6, topic: "Topic 3: Analysis" },
  { term: 1, week: 7, topic: "Practical Activities" },
  { term: 1, week: 8, topic: "Topic 4: Extension" },
  { term: 1, week: 9, topic: "Integration with Other Subjects" },
  { term: 1, week: 10, topic: "Revision" },
  { term: 1, week: 11, topic: "Mid-Term Assessment" },
  { term: 1, week: 12, topic: "End of Term Examination" },
  { term: 2, week: 1, topic: "Review of First Term" },
  { term: 2, week: 2, topic: "New Topic: Introduction" },
  { term: 2, week: 3, topic: "New Topic: Development" },
  { term: 2, week: 4, topic: "New Topic: Application" },
  { term: 2, week: 5, topic: "Practical/Laboratory Work" },
  { term: 2, week: 6, topic: "Topic: Analysis and Evaluation" },
  { term: 2, week: 7, topic: "Topic: Problem Solving" },
  { term: 2, week: 8, topic: "Project Work" },
  { term: 2, week: 9, topic: "Group Discussion and Presentation" },
  { term: 2, week: 10, topic: "Revision" },
  { term: 2, week: 11, topic: "Mid-Term Assessment" },
  { term: 2, week: 12, topic: "End of Term Examination" },
  { term: 3, week: 1, topic: "Review of Second Term" },
  { term: 3, week: 2, topic: "Advanced Topic: Introduction" },
  { term: 3, week: 3, topic: "Advanced Topic: Concepts" },
  { term: 3, week: 4, topic: "Advanced Topic: Applications" },
  { term: 3, week: 5, topic: "Practical/Laboratory Work" },
  { term: 3, week: 6, topic: "Revision of Key Concepts" },
  { term: 3, week: 7, topic: "Mock Examination Preparation" },
  { term: 3, week: 8, topic: "Examination Practice" },
  { term: 3, week: 9, topic: "General Revision" },
  { term: 3, week: 10, topic: "End of Year Examination" },
];

export const getTopicForWeek = (level: string, subject: string, term: number, week: number): Topic | null => {
  const topics = getTopicsForSubject(level, subject);
  return topics.find(t => t.term === term && t.week === week) || null;
};

export const getSubjectsForLevel = (level: string): string[] => {
  if (level.startsWith("KG")) return ["Literacy", "Numeracy", "Creative Arts", "Science & Nature", "Social Habits"];
  if (level.startsWith("Pry")) return PRIMARY_SUBJECTS;
  if (level.startsWith("JSS")) return JSS_SUBJECTS;
  if (level.startsWith("SS")) return SSS_SUBJECTS;
  return [];
};

export const getTopicsForSubject = (level: string, subject: string): Topic[] => {
  if (level.startsWith("KG")) return KG_TOPICS;

  if (subject === "Mathematics") {
    const topics = MATH_TOPICS_BY_CLASS[level];
    if (topics) return topics;
    return GEN_SUBJECT_TOPICS;
  }

  return GEN_SUBJECT_TOPICS;
};

const LEVELS_BY_TYPE: Record<string, string[]> = {
  creche: ["Creche 1", "Creche 2"],
  kg: ["KG 1", "KG 2"],
  primary: ["Pry 1", "Pry 2", "Pry 3", "Pry 4", "Pry 5", "Pry 6"],
  secondary: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"],
};

export const getLevelsForSchoolType = (types: string[]): string[] => {
  return [...new Set(types.flatMap((t) => LEVELS_BY_TYPE[t] || []))];
};
