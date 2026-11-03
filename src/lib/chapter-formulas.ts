import { toHtml } from "./math-html";

// Two signature formulas per chapter, for the "Most marks for your time" posters. They are short on
// purpose: the posters are narrow. A chapter missing from this list shows its symbol instead.
const FORMULAS: Record<string, [string, string]> = {
  "3d-geometry": ["l^2+m^2+n^2=1", "\\vec r=\\vec a+\\lambda\\vec b"],
  "basic-maths": ["\\log_a b=\\frac{\\ln b}{\\ln a}", "|x|=\\sqrt{x^2}"],
  "binomial-theorem": ["T_{r+1}={}^nC_r\\,a^{n-r}b^r", "\\sum_{r=0}^{n}{}^nC_r=2^n"],
  circle: ["x^2+y^2=r^2", "xx_1+yy_1=r^2"],
  "complex-numbers": ["z=re^{i\\theta}", "|z|^2=z\\bar z"],
  "continuity-and-differentiability": ["\\lim_{x\\to a}f=f(a)", "(uv)'=u'v+uv'"],
  "definite-integrals": ["\\int_0^1 x^n dx=\\frac{1}{n+1}", "\\int_0^{\\pi/2}\\sin^2x\\,dx=\\frac{\\pi}{4}"],
  determinants: ["|AB|=|A||B|", "|kA|=k^n|A|"],
  "differential-equations": ["\\frac{dy}{dx}+Py=Q", "\\text{I.F.}=e^{\\int P\\,dx}"],
  ellipse: ["\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1", "b^2=a^2(1-e^2)"],
  functions: ["f:A\\to B", "f^{-1}(f(x))=x"],
  hyperbola: ["\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1", "b^2=a^2(e^2-1)"],
  "indefinite-integrals": ["\\int x^n dx=\\frac{x^{n+1}}{n+1}+C", "\\int\\frac{dx}{x}=\\ln|x|+C"],
  "inverse-trigonometric-functions": ["\\sin(\\sin^{-1}x)=x", "\\tan^{-1}1=\\frac{\\pi}{4}"],
  "limits-and-derivatives": ["\\lim_{x\\to0}\\frac{\\sin x}{x}=1", "\\frac{d}{dx}x^n=nx^{n-1}"],
  "mathematical-reasoning": ["p\\Rightarrow q\\equiv\\neg q\\Rightarrow\\neg p", "\\neg(\\neg p)\\equiv p"],
  matrices: ["AA^{-1}=I", "A^{-1}=\\frac{\\operatorname{adj}A}{|A|}"],
  "maxima-and-minima": ["f'(c)=0", "f''(c)<0\\Rightarrow\\text{max}"],
  monotonicity: ["f'(x)>0\\Rightarrow f\\uparrow", "f'(x)<0\\Rightarrow f\\downarrow"],
  "pair-of-straight-lines": ["h^2\\ge ab", "\\tan\\theta=\\left|\\frac{2\\sqrt{h^2-ab}}{a+b}\\right|"],
  parabola: ["y^2=4ax", "y=mx+\\frac{a}{m}"],
  "permutations-and-combinations": ["{}^nP_r=\\frac{n!}{(n-r)!}", "{}^nC_r=\\frac{n!}{r!(n-r)!}"],
  probability: ["P(A|B)=\\frac{P(A\\cap B)}{P(B)}", "P(A')=1-P(A)"],
  "quadratic-equations-and-expressions": ["x=\\frac{-b\\pm\\sqrt{D}}{2a}", "D=b^2-4ac"],
  "sequence-and-series": ["a_n=a+(n-1)d", "S_\\infty=\\frac{a}{1-r}"],
  "sets-and-relations": ["(A\\cup B)'=A'\\cap B'", "A\\cap A'=\\varnothing"],
  "solution-of-triangles": ["\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=2R", "\\cos C=\\frac{a^2+b^2-c^2}{2ab}"],
  statistics: ["\\bar x=\\frac{\\sum x_i}{n}", "\\sigma^2=\\frac{\\sum(x_i-\\bar x)^2}{n}"],
  "straight-lines": ["y=mx+c", "d=\\frac{|ax_1+by_1+c|}{\\sqrt{a^2+b^2}}"],
  "trigonometric-equations": ["x=n\\pi+(-1)^n\\alpha", "x=2n\\pi\\pm\\alpha"],
  "vector-algebra": ["\\vec a\\cdot\\vec b=ab\\cos\\theta", "|\\vec a\\times\\vec b|=ab\\sin\\theta"],
};

// Rendered here on the server so the chapters page doesn't ship KaTeX to the browser.
export const chapterFormulas = (slug: string) => (FORMULAS[slug] ?? []).map((f) => toHtml(`$${f}$`));
