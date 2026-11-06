// JEE 2027 facts for /jee-exam. Every fact here comes from the official sources listed at the bottom.
// Re-check them whenever NTA or the JEE (Advanced) board posts a notice, and at least every quarter
// (seo.md §9), then move UPDATED forward. JEE (Advanced) 2027 isn't announced yet: its rows say so.

export const UPDATED = "6 November 2026";

export const SOURCES = [
  { label: "JEE (Main) 2027 Information Bulletin, NTA (24 October 2026)", href: "https://jeemain.nta.nic.in/" },
  { label: "JEE (Main) 2027 syllabus, NTA", href: "https://jeemain.nta.nic.in/document/syllabus-2027/" },
  { label: "JEE (Advanced) official website", href: "https://jeeadv.ac.in/" },
  { label: "JEE (Advanced) 2026 syllabus", href: "https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf" },
];

export const MAIN_DATES = [
  { what: "Session 1 applications", when: "24 October to 22 November 2026" },
  { what: "Session 1 admit cards", when: "13 January 2027" },
  { what: "Session 1 exam", when: "20, 21, 22, 23, 24 and 28 January 2027" },
  { what: "Session 2 applications", when: "5 January to 3 February 2027" },
  { what: "Session 2 admit cards", when: "25 March 2027" },
  { what: "Session 2 exam", when: "2, 3, 4, 5, 6 and 7 April 2027" },
];

export const MAIN_PATTERN = [
  { k: "Mode", v: "Computer-based test" },
  { k: "Duration", v: "3 hours" },
  { k: "Questions", v: "75: 25 each in Mathematics, Physics and Chemistry" },
  { k: "Each subject", v: "Section A: 20 multiple-choice questions · Section B: 5 numerical-answer questions" },
  { k: "Total marks", v: "300 (100 per subject)" },
  { k: "Marking", v: "+4 correct, −1 wrong, 0 unanswered, in both sections" },
  { k: "Numerical answers", v: "Typed on an on-screen keypad, rounded to the nearest whole number" },
  { k: "Shifts", v: "Usually two a day: 9:00 AM–12:00 noon and 3:00–6:00 PM IST" },
];

// Unit names as NTA's Paper 1 syllabus lists them. The NTA PDF has the topics under each unit.
export const MAIN_MATHS = [
  "Sets, relations and functions",
  "Complex numbers and quadratic equations",
  "Matrices and determinants",
  "Permutations and combinations",
  "Binomial theorem and its simple applications",
  "Sequence and series",
  "Limit, continuity and differentiability",
  "Integral calculus",
  "Differential equations",
  "Co-ordinate geometry",
  "Three-dimensional geometry",
  "Vector algebra",
  "Statistics and probability",
  "Trigonometry",
];

// Headings of the JEE (Advanced) 2026 Mathematics syllabus, which is unchanged from 2025.
export const ADVANCED_MATHS = [
  "Sets, relations and functions",
  "Algebra",
  "Matrices",
  "Probability and statistics",
  "Trigonometry",
  "Analytical geometry (two and three dimensions)",
  "Differential calculus",
  "Integral calculus",
  "Vectors",
];

export const ADVANCED_PATTERN = [
  { k: "Papers", v: "Paper 1 and Paper 2, 3 hours each, on the same day. Both are compulsory." },
  { k: "Subjects", v: "Each paper has Physics, Chemistry and Mathematics sections." },
  { k: "Question types", v: "Change every year: one correct option, more than one correct option, numerical answers and matching. Some carry partial marks and negative marks." },
  { k: "Who can sit it", v: "The top 2,50,000 candidates in JEE (Main) Paper 1 (2026 rule), who also meet the age and Class 12 conditions." },
];
