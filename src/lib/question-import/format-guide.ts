// The template and conversion prompt shown on /admin/question-format.

export const TEMPLATE = String.raw`format: mathflex-1
title: Vector Algebra PYQ

---
Q1
exam: JEE Main · 2 Apr 2017 Offline
year: 2017
type: single
difficulty: medium
topic: Cross product

Let $\vec{a} = 2\hat{i} + \hat{j} - 2\hat{k}$ and $\vec{b} = \hat{i} + \hat{j}$. Then $|\vec{a} \times \vec{b}|$ is equal to:

(A) $1$
(B) $3$
(C) $\sqrt{5}$
(D) $9$

answer: B

solution:
$$\vec{a} \times \vec{b} = \begin{vmatrix} \hat{i} & \hat{j} & \hat{k} \\ 2 & 1 & -2 \\ 1 & 1 & 0 \end{vmatrix} = 2\hat{i} - 2\hat{j} + \hat{k}$$
So $|\vec{a} \times \vec{b}| = \sqrt{4 + 4 + 1} = 3$.

---
Q2
exam: JEE Advanced
year: 2019
type: multiple
difficulty: medium
topic: Vector identities

Which of these are true for all vectors $\vec{a}$ and $\vec{b}$?

(A) $\vec{a} \cdot \vec{b} = \vec{b} \cdot \vec{a}$
(B) $\vec{a} \times \vec{b} = \vec{b} \times \vec{a}$
(C) $\vec{a} \cdot (\vec{a} \times \vec{b}) = 0$
(D) $\vec{a} \times \vec{a} = \vec{a}$

answer: A, C

solution:
The dot product is commutative, so (A) is true. The cross product changes sign when swapped, so (B) is false.
$\vec{a} \times \vec{b}$ is perpendicular to $\vec{a}$, so (C) is true. $\vec{a} \times \vec{a} = \vec{0}$, so (D) is false.

---
Q3
exam: JEE Main · 24 Jan 2023 Shift 1
year: 2023
type: numerical
difficulty: easy
topic: Dot product

If $\vec{a} = \hat{i} + 2\hat{j} + 3\hat{k}$ and $\vec{b} = 2\hat{i} - \hat{j} + \hat{k}$, find $\vec{a} \cdot \vec{b}$.

answer: 3

solution:
$\vec{a} \cdot \vec{b} = (1)(2) + (2)(-1) + (3)(1) = 3$.
`;

export const AI_PROMPT = String.raw`Convert the attached JEE maths question file into the exact format below. Output only the converted text in one plain-text code block, with nothing before or after it.

RULES
1. The first lines are: format: mathflex-1, then title: <chapter and DPP or PYQ>.
2. Put a line with only --- before every question.
3. Each question starts with Q<number>, then these detail lines, one per line. Leave out any you don't know:
   exam: <e.g. JEE Main · 24 Jan 2023 Shift 1, or JEE Advanced 2019 Paper 1. Always start with "JEE Main" or "JEE Advanced", because students filter tests by it>
   year: <4 digits>
   type: single, multiple or numerical
   difficulty: easy, medium or hard
   topic: <short sub-topic>
4. Then a blank line, then the question text exactly as written. Do not solve, reword or shorten it.
5. Write ALL maths in LaTeX between dollar signs: $x^2$ inside a sentence, and $$ ... $$ for an equation on its own line. Use \vec{a}, \hat{i}, \frac{a}{b}, \sqrt{x}, \int, \sum, \lim, \begin{vmatrix}. Never use Unicode maths symbols or images.
6. Write a literal dollar sign as \$.
7. Options: each on its own line as (A) ... (B) ... (C) ... (D) ... Numerical questions have no options.
8. Then one line: answer: followed by the letter (B), the letters for several correct options (A, C), or the number (12.5).
9. Then solution: on its own line, followed by the full worked explanation from the file, with clear steps. Do not leave it out or summarise it.
10. Keep every question, in the original order. If the file holds several DPPs, keep going through all of them. If the output is too long for one reply, stop at the end of a question and say where you stopped.
11. If part of a question or formula can't be read, keep the question and write [UNCLEAR] at that spot. Never guess an answer: if the file gives no answer, write answer: [MISSING].
12. Do not add headers, footers, page numbers, website names or watermarks.

EXAMPLE
` + TEMPLATE;
