// Free practice: public question sets by subject and level (Resources → Free practice).
//
// PLACEHOLDER: a starter set so the page can be reviewed. The target is ~100 questions per
// subject across Easy / Medium / Hard; when they're managed in a CMS (Sanity) or the admin
// question bank, replace getPracticeSet() with that fetch, returning the same shape.
// Answers are checked in the browser and progress is kept on the device only (no backend).

export type Level = "easy" | "medium" | "hard";
export const LEVELS: { key: Level; label: string; hint: string }[] = [
  { key: "easy", label: "Easy", hint: "Warm up on the basics" },
  { key: "medium", label: "Medium", hint: "JEE Main level" },
  { key: "hard", label: "Hard", hint: "The ones that decide ranks" },
];

export type Subject = { key: string; title: string; live: boolean };
export const SUBJECTS: Subject[] = [
  { key: "maths", title: "Mathematics", live: true },
  { key: "physics", title: "Physics", live: false },
  { key: "chemistry", title: "Chemistry", live: false },
];

export type PracticeQ = {
  id: string;
  level: Level;
  chapter: string;
  prompt: string;
  options: string[];
  answer: number; // index into options
  solution: string;
};

const MATHS: PracticeQ[] = [
  // Easy
  { id: "m-e-01", level: "easy", chapter: "Quadratic Equations", prompt: "What is the sum of the roots of x² − 5x + 6 = 0?", options: ["5", "−5", "6", "1"], answer: 0, solution: "For ax² + bx + c = 0 the sum of roots is −b/a = −(−5)/1 = 5." },
  { id: "m-e-02", level: "easy", chapter: "Limits", prompt: "lim (x→0) tan(2x) / x = ?", options: ["0", "1", "2", "1/2"], answer: 2, solution: "tan(2x)/x = 2 · tan(2x)/(2x), and tan(t)/t → 1 as t → 0. So the limit is 2." },
  { id: "m-e-03", level: "easy", chapter: "Differentiation", prompt: "If f(x) = x³, what is f′(2)?", options: ["6", "8", "12", "4"], answer: 2, solution: "f′(x) = 3x², so f′(2) = 3 · 4 = 12." },
  { id: "m-e-04", level: "easy", chapter: "Complex Numbers", prompt: "i⁴⁹ equals", options: ["1", "−1", "i", "−i"], answer: 2, solution: "Powers of i repeat every 4. 49 = 4 · 12 + 1, so i⁴⁹ = i¹ = i." },
  { id: "m-e-05", level: "easy", chapter: "Permutations & Combinations", prompt: "In how many ways can the letters of the word CAT be arranged?", options: ["3", "6", "9", "27"], answer: 1, solution: "Three distinct letters can be arranged in 3! = 6 ways." },
  { id: "m-e-06", level: "easy", chapter: "Straight Lines", prompt: "The distance between the points (1, 2) and (4, 6) is", options: ["5", "7", "√7", "25"], answer: 0, solution: "√[(4 − 1)² + (6 − 2)²] = √(9 + 16) = √25 = 5." },
  { id: "m-e-07", level: "easy", chapter: "Logarithms", prompt: "log₂ 32 = ?", options: ["4", "5", "6", "16"], answer: 1, solution: "32 = 2⁵, so log₂ 32 = 5." },
  { id: "m-e-08", level: "easy", chapter: "Definite Integrals", prompt: "∫₀¹ 2x dx = ?", options: ["0", "1/2", "1", "2"], answer: 2, solution: "∫ 2x dx = x². Evaluated from 0 to 1: 1 − 0 = 1." },
  { id: "m-e-09", level: "easy", chapter: "Sequences & Series", prompt: "The 10th term of the AP 2, 5, 8, … is", options: ["27", "29", "30", "32"], answer: 1, solution: "aₙ = a + (n − 1)d = 2 + 9 · 3 = 29." },
  { id: "m-e-10", level: "easy", chapter: "Straight Lines", prompt: "The slope of the line 2x + 3y = 6 is", options: ["2/3", "−2/3", "3/2", "−3/2"], answer: 1, solution: "Write it as y = −(2/3)x + 2. The slope is −2/3." },

  // Medium
  { id: "m-m-01", level: "medium", chapter: "Quadratic Equations", prompt: "If α and β are the roots of x² − 3x + 1 = 0, then α² + β² equals", options: ["7", "9", "11", "5"], answer: 0, solution: "α + β = 3 and αβ = 1. α² + β² = (α + β)² − 2αβ = 9 − 2 = 7." },
  { id: "m-m-02", level: "medium", chapter: "Limits", prompt: "lim (x→0) (1 − cos 2x) / x² = ?", options: ["1", "2", "1/2", "4"], answer: 1, solution: "1 − cos 2x = 2 sin²x, so the expression is 2 · (sin x / x)² → 2." },
  { id: "m-m-03", level: "medium", chapter: "Definite Integrals", prompt: "∫₀^(π/2) sin x / (sin x + cos x) dx = ?", options: ["π/2", "π/4", "1", "0"], answer: 1, solution: "By King's rule (x → π/2 − x) the integral equals the same with cos x on top. Adding both gives ∫₀^(π/2) 1 dx = π/2, so each is π/4." },
  { id: "m-m-04", level: "medium", chapter: "Binomial Theorem", prompt: "The coefficient of x³ in (1 + 2x)⁵ is", options: ["10", "40", "80", "160"], answer: 2, solution: "The general term is ⁵Cᵣ (2x)ʳ. For r = 3: ⁵C₃ · 2³ = 10 · 8 = 80." },
  { id: "m-m-05", level: "medium", chapter: "Complex Numbers", prompt: "If z = (3 + 4i) / (1 − i), then |z| equals", options: ["5", "5/√2", "5√2", "5/2"], answer: 1, solution: "|z| = |3 + 4i| / |1 − i| = 5 / √2." },
  { id: "m-m-06", level: "medium", chapter: "Probability", prompt: "A fair coin is tossed 3 times. The probability of getting at least one head is", options: ["1/8", "3/8", "1/2", "7/8"], answer: 3, solution: "P(no head) = (1/2)³ = 1/8. So P(at least one head) = 1 − 1/8 = 7/8." },
  { id: "m-m-07", level: "medium", chapter: "Determinants", prompt: "A is a 3 × 3 matrix with |A| = 2. Then |3A| equals", options: ["6", "18", "54", "9"], answer: 2, solution: "For an n × n matrix, |kA| = kⁿ|A|. Here 3³ · 2 = 54." },
  { id: "m-m-08", level: "medium", chapter: "Application of Derivatives", prompt: "The equation of the tangent to y = x² at (1, 1) is", options: ["y = 2x − 1", "y = x", "y = 2x + 1", "y = x + 1"], answer: 0, solution: "dy/dx = 2x = 2 at x = 1. y − 1 = 2(x − 1), so y = 2x − 1." },
  { id: "m-m-09", level: "medium", chapter: "Area Under Curves", prompt: "The area enclosed between y = x² and y = x is", options: ["1/2", "1/3", "1/6", "1/12"], answer: 2, solution: "They meet at x = 0 and x = 1. Area = ∫₀¹ (x − x²) dx = 1/2 − 1/3 = 1/6." },
  { id: "m-m-10", level: "medium", chapter: "3D Geometry", prompt: "The distance of the point (1, 1, 1) from the plane x + 2y + 2z = 2 is", options: ["1", "3", "1/3", "5/3"], answer: 0, solution: "|1 + 2 + 2 − 2| / √(1 + 4 + 4) = 3 / 3 = 1." },

  // Hard
  { id: "m-h-01", level: "hard", chapter: "Definite Integrals", prompt: "∫₀^π x sin x / (1 + cos²x) dx = ?", options: ["π/4", "π²/4", "π²/2", "π/2"], answer: 1, solution: "With x → π − x, I = (π/2) ∫₀^π sin x / (1 + cos²x) dx. Put t = cos x: (π/2) ∫₋₁¹ dt / (1 + t²) = (π/2)(π/2) = π²/4." },
  { id: "m-h-02", level: "hard", chapter: "Limits", prompt: "lim (x→0) (tan x − sin x) / x³ = ?", options: ["0", "1", "1/2", "1/6"], answer: 2, solution: "tan x − sin x = tan x (1 − cos x). tan x / x → 1 and (1 − cos x)/x² → 1/2, so the limit is 1/2." },
  { id: "m-h-03", level: "hard", chapter: "Binomial Theorem", prompt: "(⁴C₀)² + (⁴C₁)² + (⁴C₂)² + (⁴C₃)² + (⁴C₄)² = ?", options: ["16", "64", "70", "256"], answer: 2, solution: "Σ (ⁿCᵣ)² = ²ⁿCₙ. For n = 4: ⁸C₄ = 70. (Check: 1 + 16 + 36 + 16 + 1 = 70.)" },
  { id: "m-h-04", level: "hard", chapter: "Functions", prompt: "The minimum value of f(x) = |x − 1| + |x − 3| is", options: ["0", "1", "2", "4"], answer: 2, solution: "The sum of distances from x to 1 and to 3 is smallest when x lies between them, where it equals 3 − 1 = 2." },
  { id: "m-h-05", level: "hard", chapter: "3D Geometry", prompt: "The shortest distance between the x-axis and the line through (0, 1, 1) parallel to the y-axis is", options: ["0", "1", "√2", "1/√2"], answer: 1, solution: "Directions (1, 0, 0) and (0, 1, 0) give the common normal (0, 0, 1). The vector between the points is (0, 1, 1), and its component along (0, 0, 1) is 1." },
  { id: "m-h-06", level: "hard", chapter: "Probability", prompt: "Bag A has 3 red and 2 black balls; bag B has 2 red and 3 black. A bag is chosen at random and a ball drawn is red. The probability it came from bag A is", options: ["1/2", "3/5", "2/5", "3/10"], answer: 1, solution: "Bayes: (½ · 3/5) / (½ · 3/5 + ½ · 2/5) = 3/5." },
  { id: "m-h-07", level: "hard", chapter: "Permutations & Combinations", prompt: "How many 4-digit numbers have all digits different?", options: ["5040", "4536", "4500", "3024"], answer: 1, solution: "First digit: 9 choices (not 0). Then 9, 8 and 7 choices. 9 · 9 · 8 · 7 = 4536." },
  { id: "m-h-08", level: "hard", chapter: "Complex Numbers", prompt: "If |z − 3 − 4i| = 2, the maximum value of |z| is", options: ["5", "7", "3", "9"], answer: 1, solution: "z lies on a circle of radius 2 centred at 3 + 4i, which is 5 from the origin. The farthest point is 5 + 2 = 7 away." },
  { id: "m-h-09", level: "hard", chapter: "Area Under Curves", prompt: "The area of the region |x| + |y| ≤ 2 is", options: ["4", "8", "16", "2"], answer: 1, solution: "It's a square with diagonals of length 4. Area = d²/2 = 16/2 = 8." },
  { id: "m-h-10", level: "hard", chapter: "Limits", prompt: "lim (x→∞) (1 + 2/x)ˣ = ?", options: ["1", "2", "e", "e²"], answer: 3, solution: "(1 + 2/x)ˣ = [(1 + 2/x)^(x/2)]² → e²." },
];

export async function getPracticeSet(subject: string): Promise<PracticeQ[]> {
  return subject === "maths" ? MATHS : [];
}
