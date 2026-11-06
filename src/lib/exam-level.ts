// Which JEE paper a question belongs to, read from its free-text exam tag ("JEE Main · 24 Jan 2023
// Shift 1", "JEE Advanced 2019", "AIEEE 2010"...). Old IIT-JEE papers count as Advanced and AIEEE as
// Main, since those exams became them. A bare "JEE", a board exam or no tag belongs to neither.
export type ExamLevel = "MAIN" | "ADVANCED";

export const EXAM_LEVELS: { value: ExamLevel; label: string }[] = [
  { value: "MAIN", label: "JEE Main" },
  { value: "ADVANCED", label: "JEE Advanced" },
];

export function examLevel(exam: string | null | undefined): ExamLevel | null {
  const e = (exam ?? "").toLowerCase();
  if (/advanced|\badv\b|iit[\s-]*jee/.test(e)) return "ADVANCED";
  if (/\bmains?\b|aieee/.test(e)) return "MAIN";
  return null;
}
