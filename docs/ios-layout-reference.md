# iOS Layout Reference — Momentra Complete Screen Catalog

Every page, every component, every pixel. Use this to replicate exactly on Android (Jetpack Compose) and Web (Next.js React).

---

## 1. Splash Screen (`LaunchScreenView.swift`)

**Duration:** ~0.8s, then auto-dismiss to `AppRootView`

| Element | Spec |
|---------|------|
| **Background** | `#120F20` (MomentraBase.bg) |
| **Top-right orb** | Circle, fill `#D4875C` (splash.ember) opacity 0.18, 260×260, offset (x:110, y:-190) |
| **Bottom-left orb** | Circle, fill `#E2945A` (splash.amber) opacity 0.12, 200×200, offset (x:-110, y:210) |
| **Mark (Canvas 120×120)** | Ghost stroke (opacity 0.15 of `#F5F0FF`), 5 white dots (r=6) at positions: (14,100), (14,62), (34,74), (54,32), (54,100). Right peak ember→amber gradient stroke w=8. Amber arc trail. Amber/ember spark dot (r=10, at 105,18) |
| **Wordmark** | "momentr" in `#F5F0FF` / system size 32 medium + "a" in `#D4875C` (ember). Float amber dot 7×7 above 'a'. Tagline "TOGETHER · FORWARD" 9pt regular, tracking 3, opacity 0.38 |
| **Loading** | ProgressView + "Loading…" 10pt, `#F5F0FF` opacity 0.6, bottom padding 36 |

---

## 2. App Root Navigation (`AppRootView.swift`)

**Routing logic:**
- If authenticated + setup complete → `MainShellView()` (the app)
- If not authenticated, onboarding seen → `AuthRootView()` (phone login)
- If authenticated but setup not complete → `SetupWizardView()`
- If not authenticated, no onboarding → `OnboardingMVPView()`

Uses `NavigationStack` with `.animation(.easeOut(duration: 0.3))` fade from splash.

---

## 3. Onboarding (`OnboardingMVPView.swift`)

**Screen: OB-MVP-2**

| Element | Spec |
|---------|------|
| **Background** | `#120F20` + two blur orbs (ember 0.12, brand purple 0.08) |
| **Mark (44×44)** | Same as splash but static (all anim states = 1) |
| **Wordmark** | 18pt momentr wordmark with small dot |
| **Preview Card** | Rounded rect 24pt radius. `#1A1728` bg. Shows ₹1,24,500 (28pt bold), "Net balance · May 2025" (11pt). 3 pills: Personal (#2D1F5E bg, #C4B5FD text), Groups (#064E35 bg, #A7F3D0 text), Business (#2E2000 bg, #FDE68A text) — each 10px x 10px radius 999. 3 txn rows (🍽, 🛒, 💰) 11pt text on `#241F38` bg radius 10. Then a Goa Trip Fund card (14pt padding, 14pt radius) with "77%" in `#10B981` |
| **Headline** | "Your money,\\nall in one place." 36pt bold leading 4. "Track expenses, split…" 15pt muted |
| **Divider** | Brand purple rect 24×8, corner radius 4, centered |
| **CTA Button** | "Get Started" 17pt bold white, `#6C4EF2` bg, corner radius 16, full-width, vertical padding 16 |
| **Sign in link** | "Already have an account?  Sign in" 13pt muted |
| **Bottom text** | "🔒  No card needed · Private · Free to start" 11pt muted2 |

---

## 4. Auth — Phone Login (`PhoneLoginView.swift` via `AuthRootView.swift`)

**This is `PhoneLoginView` + `OtpVerifyView`** — standard phone OTP flow.

- `PhoneLoginScreen.kt` (Android) already mirrors this closely
- Web uses `login/` route with phone input

---

## 5. Setup Wizard (`SetupWizardView.swift`)

Appears after first auth. Collects: **primary focus** (Personal/Group/Business), default currency, organization name. Uses `POST /users/sync` to mark `setupCompleted: true`.

---

## 6. Main Shell (`MainShellView` in `ContextRouterView.swift`)

**The core app — a single view with:** Context switcher + Group picker + Tab content + Bottom nav + FAB

### 6a. Structure (layout tree)
```
ZStack(alignment: .bottom)
  VStack(spacing: 0)
    ContextSwitcher (height: ~48pt, horizontal padding 16, top padding 8)
    Divider (0.5pt, #302A48 opacity 0.45)
    GroupMomentPickerBar (if context == .group && moments not empty) — 40pt
    Divider (0.5pt)
    TabContentView (fills remaining space, padding vertical 16)
    BottomNavBar (padding h:16, top:10, bottom:8)
  FloatingAddButton (offset bottom 66, overlaid on ZStack)
```

### 6b. Screen Chrome (`MomentraScreenChrome`)
| Element | Value |
|---------|-------|
| **Background** | `#120F20` full screen |
| **Header gradient** | Context-specific: Personal (`#1A0E38`→`#120F20`), Group (`#0A2A1A`→`#120F20`), Business (`#1A1200`→`#120F20`) |
| **Header height** | 160pt (188pt when group moments picker visible) |
| **Orb** | Circle, context accent color, opacity 0.25-0.30 (group=0.30), size 360×360, offset Y: -178, extra opacity 0.02 |

### 6c. Color Reference

| Token | Personal | Group | Business |
|-------|----------|-------|----------|
| cover (header top) | `#1A0E38` | `#0A2A1A` | `#1A1200` |
| surface (cards/pills) | `#2D1F5E` | `#064E35` | `#2E2000` |
| accent (primary) | `#6C4EF2` | `#0EC97F` | `#D4880A` |
| accentEnd | `#8B6FF5` | `#34D399` | `#F5A623` |
| text (on-accent) | `#C4B5FD` | `#A7F3D0` | `#FDE68A` |
| hero (card bg) | `#0F0A20` | `#091A12` | `#0D0900` |
| tabBg (nav/chrome) | `#1A1430` | `#0E2018` | `#1A1000` |
| tabDim (inactive tab) | `#6B5FA0` | `#3D7A5C` | `#7A5010` |

### 6d. Base Colors
| Token | Value | Usage |
|-------|-------|-------|
| bg | `#120F20` | Every screen bg |
| s100 | `#1A1728` | Cards, sheets, nav bg |
| s200 | `#241F38` | Inputs, inactive chips |
| s300 | `#302A48` | Borders, separators |
| onDark | `#F5F0FF` | Primary text on dark |
| onDark80/60/40/20 | Opacity variants | Muted text |

### 6e. Typography (Plus Jakarta Sans)
| Token | Size/Weight | Usage |
|-------|-------------|-------|
| display | 28pt bold leading tight | Hero numbers |
| titleXL | 22pt bold | Page headings |
| titleLG | 20pt semibold | Section headings |
| titleMD | 17pt semibold | Card titles |
| titleSM | 15pt semibold | Item titles |
| body | 14pt regular | Body text |
| bodyMedium | 14pt medium | Emphasized body |
| caption | 12pt regular | Secondary text |
| contextTab | 12pt medium | Context switcher |
| label | 11pt semibold | Button labels, tab text |
| micro | 10pt semibold | Small badges, hints |
| nano | 9pt medium | Tiny labels |

### 6f. Spacing (4pt grid)
| Token | Value |
|-------|-------|
| xs | 4 |
| inline | 6 |
| item | 8 |
| section | 12 |
| cardH | 14 |
| screenV | 16 |
| screenH | 18 |

### 6g. Corner Radius
| Token | Value | Usage |
|-------|-------|-------|
| data | 4 | Data rows |
| input | 12 | Input fields |
| cardSm | 12 | Small cards |
| card | 14 | General cards, nav |
| momentCard | 16 | Goal/moment rows |
| contextTabInner | 10 | Context switcher |
| button | 14 | CTA buttons |
| hero | 18 | Hero cards, sheets |
| pill | 999 | Chips, badges |

### 6h. Sizing
| Token | Value |
|-------|-------|
| navHeight | 54 |
| barHeight | 4 |
| indicatorDot | 7 |
| triggerDot | 8 |
| avatarXL/LG/MD/SM | 44/34/26/20 |
| ringOuter/Inner | 80/66 |

### 6i. Animation
| Token | Value |
|-------|-------|
| instant | 0.1s |
| fast | 0.15s |
| normal | 0.2s |
| medium | 0.35s |
| Button press: scale 0.97, opacity 0.92, easeOut 0.1s |
| Row done opacity: 0.5 |
| Disabled opacity: 0.4 |

### 6j. Urgency Colors
| Level | Value |
|-------|-------|
| high (red) | `#E24B4A` |
| highText | `#FCA5A5` |
| highSurface | `#450A0A` |
| medium (amber) | `#F59E0B` |
| mediumText | `#FDE68A` |
| mediumSurface | `#451A00` |
| cta (teal) | `#10B981` |
| ctaEnd | `#34D399` |
| paidBg/Text | `#064E35` / `#10B981` |
| pendingBg/Text | `#451A00` / `#F59E0B` |
| overdueBg/Text | `#450A0A` / `#E24B4A` |

---

## 7. Context Switcher (`MomentraContextTabs`)

**Horizontal scrollable pill strip**

| Property | Value |
|----------|-------|
| **Outer bg** | `#1A1728` opacity 0.97, radius 14 |
| **Padding** | 6pt all sides |
| **Item padding** | H:16, V:9 |
| **Item radius** | 10 |
| **Unselected** | tabBg bg (e.g. `#1A1430`) opacity 0.9, text: onDark opacity 0.38 |
| **Selected** | surface bg (e.g. `#2D1F5E`), text color: context text (e.g. `#C4B5FD`) |
| **Dot** | 7×7 circle, fill accent color, gap 6 from label |
| **Font** | 12pt medium |
| **Items** | 4 contexts: Personal, Group, Business, Circle |

---

## 8. Group Moment Picker Bar

| Property | Value |
|----------|-------|
| **Layout** | HStack: "Moment" label + Picker + Spacer |
| **"Moment" label** | caption weight semibold, onDark60 |
| **Picker** | Default SwiftUI .menu picker style |
| **Padding** | H:16, V:8 |

---

## 9. Bottom Navigation Bar (`BottomNavBar`)

**5 tabs**

| Tab | Default icon | Context override |
|-----|-------------|------------------|
| Today | calendar | — |
| Plan | target | — |
| Activity | list.bullet.rectangle | — |
| People | person.2 | In personal → chart.pie.fill (title: "Insights") |
| Me | person.crop.circle | — |

| Property | Value |
|----------|-------|
| **Outer bg** | `#1A1728` opacity 0.94, radius 14 |
| **Border** | `#302A48` opacity 0.5, 0.5pt |
| **Padding** | H:6 |
| **Icon** | systemImage, 16pt semibold |
| **Label** | label font (11pt semibold) |
| **Spacing** | icon↔label: 3 |
| **Active color** | context accent |
| **Inactive color** | context tabDim |
| **Button padding** | V:8, full-width |

---

## 10. Floating Add Button (FAB)

| Property | Value |
|----------|-------|
| **Shape** | Capsule (Capsule()) |
| **Label** | "Add" + plus icon, titleSM font (15pt semibold) |
| **Text color** | White (`MomentraSemantic.ctaText`) |
| **Padding** | V:12, H:22 |
| **Background** | Linear gradient: accent → accentEnd, leading→trailing |
| **Position** | Overlaid, bottom: 66pt from bottom |
| **Button style** | `MomentraPressButtonStyle()` — scale 0.97 on press, easeOut 0.1s |

---

## 11. Today Tab (`TodayRouter`)

### 11a. Personal Today

| Section | Content |
|---------|---------|
| **Heading** | "Personal · Today" — titleXL (22pt bold) |
| **Error** | If errorMessage, show in caption font, `#FCA5A5` color |
| **KPI Row** | 3 cells in HStack, spacing 10: **Spend**, **Income**, **Net**. Each cell shows title (11pt muted) + value (onDark color). Net is green (`#10B981`) if >=0, red (`#E24B4A`) if <0 |
| **Action Row** | 2 `MomentraActionButton` side by side, spacing 10: "New moment" (primary variant) + "Add txn" (secondary variant, text color = theme text) |
| **Section label** | "Today's ledger" bodyMedium (14pt medium) |
| **Txns list** | ForEach over `personalTransactionsToday`. Each row is a button → `PersonalTodayTransactionRow`. Empty state: `ShellEmptyHint` |
| **Hint text** | "Goals and moments live on Plan…" caption, onDark60 |
| **Footer** | "Loaded N ledger rows…" micro (10pt), onDark40 |

**PersonalTodayTransactionRow:**
| Element | Spec |
|---------|------|
| **Layout** | HStack: icon (emoji, 14pt) → VStack(title subtitle) → Spacer → amount |
| **Title** | 12pt medium → 13pt? Actual: the transaction's `title` in body text |
| **Subtitle** | caption, muted |
| **Amount** | bold, income = cta green, expense = urgency high red |
| **Padding** | 10pt inside |

**PersonalTodayKpiCell:**
| Property | Value |
|----------|-------|
| **Layout** | VStack(title, value) |
| **Title** | nano (10pt semibold) uppercase, onDark40 |
| **Value** | titleSM (15pt semibold), accent color |

### 11b. Group Today

| Section | Content |
|---------|---------|
| **Heading** | "Group · Today" — titleXL |
| **Hint** | "Uses the moment selected in the bar above…" caption |
| **Empty** | If no moments → ShellEmptyHint. If no detail loaded → loading hint. |
| **KPI Row** | 2 cells: **Today** (expense count) + **Spend** (total). Uses `GroupTodayKpiCell` |
| **Action Row** | "New group" + "Add expense" |
| **Section** | "Today's shared expenses" label (11pt), tracking 0.4, onDark40 |
| **List** | ForEach today expenses → `GroupExpenseLedgerRow` |

### 11c. Business Today
Title + "Budgets: N · Workspaces: M" caption + list of budgets + first workspace name.

### 11d. Circle Today
Title + hint + signal count.

---

## 12. Plan Tab (`PlanRouter`)

### 12a. Personal Plan
| Section | Content |
|---------|---------|
| **Heading** | "Personal · Plan" — titleXL |
| **Subtitle** | "Moments, horizons, and targets you are steering toward." caption, onDark60 |
| **Empty** | ShellEmptyHint |
| **List** | ForEach `personalMoments` → `PersonalMomentGoalCardView` |

**PersonalMomentGoalCardView:** Shows title, momentType, targetAmount, durationType, endDate, status, savedAmount. Uses context theme.

### 12b. Group Plan
Same heading pattern. If moments exist → list of `GroupPlanMomentCardView`. Wrapped in a hero card (cover opacity 0.22, radius hero, border accent 0.16, 0.5pt).

### 12c. Business Plan
Workspaces list + Units list + Legacy budgets list. Each item uses `shellListRowChrome()`.

### 12d. Circle Plan
Hint text with 2 labels (sparkles icon + bubble icons).

---

## 13. Activity Tab (`ActivityRouter`)

### 13a. Personal Activity
| Section | Content |
|---------|---------|
| **Heading** | "Personal · Activity" — titleXL |
| **Subtitle** | "Ledger grouped by book date…" caption |
| **Sections** | ForEach `personalActivitySections` (grouped by day). Each section: date header (abbreviated, onDark60) + list of transactions. Each txn row: emoji → VStack(title, subtitle, category) → amount. Tappable → edit sheet. |
| **Empty** | ShellEmptyHint |

### 13b. Group Activity
Same structure with `groupExpenseSections`. Each expense row: member name, amount, date.

---

## 14. People / Insights Tab (`PeopleRouter`)

- Personal context: Shows "Insights" tab. Spend by category breakdown (`personalSpendByCategory`), sorted by total descending. Each row: category name + total amount.
- Group context: Shows "People" tab. Members list with balances.
- Business: Team members.
- Circle: Circle members.

---

## 15. Me Tab (`MeView`)

User profile, settings, and refresh control. Context-aware.

---

## 16. Add Sheet (`AddActionSheet`)

Context-based bottom sheet with quick action options. Shown via FAB. Personal options: Add transaction (income/expense), Create moment. Group options: Create moment, Add expense. Business: Create budget, Add expense.

---

## 17. Sheet Views

### 17a. Personal Moment Detail (`PersonalMomentDetailView`)
Full detail sheet: title, type, duration, target, saved, progress bar, transactions list.

### 17b. Transaction Edit Sheet (`PersonalTransactionEditSheet`)
Edit form for a transaction: title, amount, category, date, income/expense toggle. Save + Delete buttons.

### 17c. Personal Create Moment (`PersonalCreateMomentView`)
Form with: Title, Rhythm picker (Monthly/Ends on date), Start date, End date (conditional), Target amount, Description, Private toggle. Toolbar: Cancel + Create/ProgressView. Uses `.momentraFormSheetChrome()` — hide scroll content bg, bg color `#120F20`, dark scheme.

### 17d. Group Create Moment (`GroupCreateMomentView`)
Similar form with Group-specific fields.

### 17e. Group Expense Detail (`GroupExpenseDetailSheet`)
Shows expense details: who paid, amount, split, date.

### 17f. Group Moment Detail (`GroupMomentDetailView`)
Full detail view: members, expenses, progress, settings tabs.

---

## Key Components Reference

### `MomentraCard`
`content().padding(spacing.cardH).background(s100).clipShape(RoundedRectangle(cornerRadius: radius.card))`

### `MomentraPrimaryButton`
Full-width button: label (11pt semibold), gradient bg, 14pt radius, white text, 0.5pt stroke, press animation.

### `MomentraActionButton`
Two variants: **primary** (gradient bg, white text) and **secondary** (opacity 0.12 solid bg, text = theme text or secondaryText). HStack with optional systemImage. 14pt horizontal/12pt vertical padding. Full-width. 14pt radius.

### `MomentraProgressBar`
Capsule track + capsule fill. Height = 4pt (sizing.barHeight).

### `MomentraBudgetBar`
MomentraProgressBar with color: ≥85% → urgency high else accent.

### `MomentraStatusBadge`
Capsule pill: micro font (10pt semibold), H padding 8, V padding 3.

### `ShellEmptyHint`
Multi-line text in caption font, onDark60.

### `shellListRowChrome()`
View modifier: padding, bg, corner radius, border.

---

## Replication Guide Summary

### For Android (Jetpack Compose):
| iOS | Compose Equivalent |
|-----|-------------------|
| `#120F20` bg | `Color(0xFF120F20)` — all screens |
| `MomentraScreenChrome` | `Box` with gradient background `Modifier.fillMaxSize()` + orb circle `drawBehind` |
| `ContextSwitcher` | `LazyRow` with pill-shaped chips, `rememberScrollState()` |
| `BottomNavBar` | `BottomNavigation` or custom `Row` with 5 icons + labels |
| `FloatingAddButton` | `FloatingActionButton` with capsule shape |
| `TodayRouter` | Column scrollable, `LazyColumn` for txns |
| `PersonalTransactionRow` | `Row` with emoji Text, Column(title, subtitle), Spacer, amount Text |
| `MomentraActionButton` | `OutlinedButton` / `Button` with gradient background |
| `MomentraProgressBar` | `LinearProgressIndicator` with custom colors |
| Spacing grid | Replace with 4dp base: 4, 6, 8, 12, 14, 16, 18 |

### For Web (Next.js React):
| iOS | CSS/Tailwind Equivalent |
|-----|------------------------|
| `#120F20` bg | `bg-[#120F20]` tailwind class |
| `MomentraScreenChrome` | `div` with gradient bg `bg-gradient-to-b from-[...] to-[#120F20]` + orb circle |
| `ContextSwitcher` | Horizontal scroll `div` with 4 pill buttons |
| `BottomNavBar` | Fixed bottom `nav` with 5 items, `position: fixed; bottom: 0` |
| `FloatingAddButton` | Fixed `button` bottom-right, `border-radius: 999px`, gradient bg |
| `TodayRouter` | `div` with `max-w-6xl mx-auto`, scrollable |
| Spacing grid | The existing `m-*` spacing tokens map well |
| Font | Use Plus Jakarta Sans from Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');` |
| Typography tokens | Map to existing Momentra CSS classes (`text-[22px] font-bold`, `text-[13px]` etc.) |
