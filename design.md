# MathFlex design system

All frontend work follows this file. Tokens live in `src/app/globals.css` (Tailwind CSS v4, configured in CSS
with `@theme inline`; there is no `tailwind.config`). Fonts are loaded in `src/app/layout.tsx` with `next/font`.

`globals.css` and `app/layout.tsx` are shared with the admin panel, so any token change also restyles `/admin`.
Check an admin page whenever you change them.

---

## 1. Colour tokens

Each token is a CSS variable (`--primary`) and a Tailwind colour (`bg-primary`, `text-primary`, `border-primary`,
`ring-primary`, `fill-primary`…). Opacity modifiers work: `bg-primary/10`.

| Token | Light | Dark | Use it for |
|---|---|---|---|
| `background` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | Page background |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Default text |
| `card` / `card-foreground` | `oklch(0.995 0 0)` / `0.145` | `oklch(0.21 0.006 285.885)` / `0.985` | Cards, panels, list containers |
| `popover` / `popover-foreground` | `oklch(0.995 0 0)` / `0.145` | `oklch(0.269 0 0)` / `0.985` | Menus, dropdowns, tooltips, modals |
| `primary` / `primary-foreground` | `oklch(0.637 0.237 25.331)` / `0.985` | same | Main actions (Buy, Continue), active states, links, progress |
| `secondary` / `secondary-foreground` | `oklch(0.97 0 0)` / `0.269` | `oklch(0.269 0 0)` / `0.985` | Secondary buttons (`btn-ghost`), neutral chips |
| `muted` | `oklch(0.968 0.007 247.896)` | `oklch(0.274 0.006 286.033)` | Subtle backgrounds: hover rows, empty slots, skeletons |
| `muted-foreground` | `oklch(0.554 0.046 257.417)` | `oklch(0.923 0.003 48.717)` | Secondary text: captions, hints, meta info |
| `accent` / `accent-foreground` | `oklch(0.637 0.237 25.331)` / `0.985` | same | Highlights that should match the brand (same as primary today) |
| `destructive` / `destructive-foreground` | `oklch(0.577 0.245 27.325)` / white | `oklch(0.704 0.191 22.216)` / `0.985` | Errors, wrong answers, delete actions |
| `border` | `oklch(0.929 0.013 255.508)` | `oklch(0.371 0 0)` | Borders and dividers (`border-border`, `divide-border`) |
| `input` | `oklch(0.929 0.013 255.508)` | `oklch(0.371 0 0)` | Form field borders |
| `ring` | `oklch(0.637 0.237 25.331)` | same | Focus rings and outlines |
| `chart-1` … `chart-5` | red · orange · teal · green · violet | brighter versions | Chart series, in that order. Single-series charts use `chart-1`. |
| `sidebar`, `sidebar-foreground`, `sidebar-primary(-foreground)`, `sidebar-accent(-foreground)`, `sidebar-border`, `sidebar-ring` | see `globals.css` | see `globals.css` | Side navigation |

### Primary vs. destructive

`primary` and `destructive` are both red. Keep them apart like this:
- **Primary is solid:** a filled button or badge (`btn-primary`, `bg-primary text-primary-foreground`).
- **Errors are tinted, with an icon and text:** `bg-bad/10 text-bad` (or `bg-destructive/10 text-destructive`),
  plus a `CircleAlert` icon and `role="alert"`. Never show an error as colour alone.

```tsx
<p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
  <CircleAlert className="mt-0.5 size-4 shrink-0" />{error}
</p>
```

## 2. Extended tokens

These are MathFlex-specific colours that the base system doesn't have. They are first-class tokens, so use them freely.

| Token | Light | Dark | Use it for |
|---|---|---|---|
| `brand-2` | `oklch(0.705 0.213 47.604)` | `oklch(0.75 0.183 55.934)` | Warm orange: the second stop in brand gradients, streak flame |
| `xp` | `oklch(0.606 0.25 292.717)` | `oklch(0.702 0.183 293.541)` | XP, levels |
| `gold` | `oklch(0.795 0.184 86.047)` | `oklch(0.852 0.199 91.936)` | Badges, top-3 ranks, "partially correct", pending, expiring soon |
| `ok` | `oklch(0.627 0.194 149.214)` | `oklch(0.723 0.219 149.579)` | Correct answers, paid, success, discounts |
| `bad` | = `destructive` | = `destructive` | Wrong answers, failed, expired (same as `destructive`) |
| `surface-2` | = `muted` | = `muted` | Subtle filled background (same as `muted`) |

Gradient helpers: `bg-brand-gradient` (primary → brand-2 background) and `text-gradient` (same, on text).

## 3. Legacy aliases (don't use in new code)

These names come from before the design system. They still work, because older pages and the whole admin panel use
them, but new code should use the new name.

| Legacy | Use instead |
|---|---|
| `bg-bg`, `text-bg`, `from-bg`, `var(--bg)` | `bg-background`, `text-background`, `from-background` |
| `bg-surface`, `var(--surface)` | `bg-card` |
| `text-fg`, `bg-fg`, `var(--text)` | `text-foreground`, `bg-foreground` |
| `text-muted` | `text-muted-foreground` |
| `*-brand`, `var(--brand)` | `*-primary`, `var(--primary)` |

**Watch out with `muted`:** `text-muted` is a legacy alias for grey text (`muted-foreground`), but `bg-muted` is the
design-system muted *background*. For grey text always write `text-muted-foreground`. For a grey dot or fill, use
`bg-muted-foreground`.

## 4. Typography

| Family | Tailwind | Font | Use it for |
|---|---|---|---|
| Sans | `font-sans` (default on `<body>`) | Inter | Everything: body, UI, buttons, forms |
| Display | `font-display` | Inter, letter-spacing `-0.025em` | Headings, big numbers, prices. Pair with a heavy weight: `font-display font-extrabold` |
| Mono | `font-mono` | JetBrains Mono | Codes, IDs, coupon codes, tabular numbers |
| Serif | `font-serif` | Noto Serif | Rare editorial or quote moments only (not loaded until used; no preload) |

- `font-display` only sets the family and tracking. Set the weight yourself, normally `font-extrabold` for headings
  and `font-bold` for sub-headings.
- Body letter-spacing is `--letter-spacing` (`0em`), which `tracking-normal` also uses.
- Use Tailwind's size scale (`text-sm`, `text-xl`, `text-4xl`…). Avoid one-off `text-[13px]`; `text-[10px]`/`text-[11px]`
  for tiny poster labels is the existing exception.

## 5. Radius, spacing, shadow

**Radius:** derived from `--radius: 0.5rem`.

| Class | Value | Use it for |
|---|---|---|
| `rounded-sm` | `radius − 4px` (4px) | Tiny tags, inner elements |
| `rounded-md` | `radius − 2px` (6px) | Small badges, inline chips |
| `rounded-lg` | `radius` (8px) | **Buttons and inputs** (what `btn` and `input` use) |
| `rounded-xl` | `radius + 4px` (12px) | **Cards** (what `card` uses), panels |
| `rounded-full` | circle | Only for genuinely round things: avatars, icon buttons, dots, pill badges |

`rounded-2xl` and `rounded-3xl` still have Tailwind's defaults (16px / 24px). Older code uses them, but don't use them
in new code.

**Spacing:** `--spacing: 0.25rem` is the base unit for Tailwind's whole spacing scale (`p-4` = 1rem). Use the
scale, not arbitrary values.

**Shadow:** `shadow` is built from `--shadow-offset-x/-y`, `--shadow-blur`, `--shadow-spread`, `--shadow-color` and
`--shadow-opacity` (default: `0 1px 4px 0` black at 10%). Cards get it automatically. Tune the look by editing those
variables, not by adding new shadows. The larger `shadow-lg/xl/2xl` (Tailwind defaults) are for floating layers only:
popovers, modals, the chat widget.

## 6. Shared component classes

These are defined in `globals.css` and shared with admin.

| Class | What it gives you |
|---|---|
| `card` | `bg-card`, `text-card-foreground`, 1px `border`, `rounded-xl`, `shadow` |
| `btn` | Base button: inline-flex, gap, `rounded-lg`, bold, press animation, `ring` focus outline |
| `btn btn-primary` | Solid `primary` button |
| `btn btn-ghost` | `secondary` button |
| `input` | Text field: `card` background, `input` border, `rounded-lg`, `ring` focus glow, `muted-foreground` placeholder |

```tsx
<div className="card p-5">
  <h2 className="font-display text-xl font-extrabold">Limits & Derivatives</h2>
  <p className="mt-1 text-sm text-muted-foreground">12 parts · 4h 20m</p>
  <div className="mt-4 flex gap-2">
    <button className="btn btn-primary">Buy chapter</button>
    <button className="btn btn-ghost">Preview</button>
  </div>
</div>

<input className="input" placeholder="Coupon code" />
<span className="rounded-md bg-ok/15 px-2 py-0.5 text-xs font-bold text-ok">PAID</span>
<span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">PENDING</span>
<div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: "40%" }} /></div>
<div style={{ background: "var(--chart-1)" }} />  {/* inline styles: use the CSS variable */}
```

## 7. Dark mode

- Dark mode is the `.dark` class on `<html>` (`@custom-variant dark` in `globals.css`). It doesn't follow the system
  setting directly.
- A script in `app/layout.tsx` adds `.dark` before the first paint. **Dark is the default.** A visitor gets light mode
  only after choosing it with `ThemeToggle`, which is stored in `localStorage` as `mf-theme`.
- Every token has a light and a dark value, so token classes switch automatically. You almost never need `dark:`.
  Use it only for one-offs that no token covers.
- Always check new UI in both themes.

## 8. Rules

**Do**
- Use tokens for every colour: `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary/10`.
- Use `card`, `btn`, `btn-primary`, `btn-ghost` and `input` instead of rebuilding them.
- Use `font-display` plus a heavy weight for headings.
- Show errors as a tinted box with an icon and text, not as colour alone.
- Use `ok` / `gold` / `bad` / `xp` for status, and `chart-1…5` for data series.
- Add a new token to `globals.css` (light and dark values, `@theme` entry, and this file) when something truly new is
  needed.

**Don't**
- Don't hardcode colours: no hex/rgb/oklch in components, no `bg-[#…]`, no Tailwind palette colours like
  `text-green-500`.
- Don't use `rounded-full` for rectangular buttons or cards, and don't use arbitrary radii like `rounded-[10px]`.
- Don't write `text-muted` or other legacy aliases in new code.
- Don't use `dark:` overrides when a token already handles both themes.
- Don't add fonts outside `app/layout.tsx`.

**Allowed exceptions** (not tokens, on purpose)
- White/black overlays on posters, images and video (`text-white`, `bg-black/40`, `from-black/80`). These sit on
  photos and should look the same in both themes.
- Colours that come from the database: chapter and course poster gradients, banner colours, avatar colours.
- Confetti colours, third-party brand colours (Paytm blue on the mock payment page), and the logo (`Logo.tsx`).
