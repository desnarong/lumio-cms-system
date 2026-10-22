# Lumio Design Tokens

อ้างอิงจาก [`docs/design/06-design-system.md`](../../../docs/design/06-design-system.md) หัวข้อ 6.2–6.6

## สี (Brand)

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--brand-50` | `#EEF2FF` | พื้นอ่อน |
| `--brand-100` | `#E0E7FF` | hover อ่อน |
| `--brand-500` | `#6366F1` | Primary |
| `--brand-600` | `#4F46E5` | hover/active |
| `--brand-700` | `#4338CA` | pressed |
| `--accent-500` | `#F472B6` | highlight / AI |
| `--gradient-ai` | `linear-gradient(135deg,#6366F1,#A855F7,#F472B6)` | AI element |

## Semantic (ใช้ตัวนี้ใน component)

| Semantic | อ้างถึง |
|---|---|
| `--color-primary` | `--brand-500` |
| `--color-primary-hover` | `--brand-600` |
| `--color-bg` | `--bg` |
| `--color-surface` | `--surface` |
| `--color-border` | `--border` |
| `--color-text` | `--text` |
| `--color-text-muted` | `--text-muted` |
| `--color-success` | `#10B981` |
| `--color-warning` | `#F59E0B` |
| `--color-danger` | `#EF4444` |
| `--color-info` | `#3B82F6` |

## Neutral — Light / Dark

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F8FAFC` | `#0B1020` |
| `--surface` | `#FFFFFF` | `#131A2E` |
| `--border` | `#E2E8F0` | `#243049` |
| `--text` | `#0F172A` | `#E8ECF6` |
| `--text-muted` | `#64748B` | `#94A3B8` |

## Shape & Shadow

| Token | ค่า |
|---|---|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 20px |
| `--radius-full` | 999px |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,.06)` |
| `--shadow-md` | `0 8px 24px rgba(15,23,42,.08)` |
| `--shadow-lg` | `0 20px 48px rgba(15,23,42,.14)` |

## Typography Scale

| Token | Size | Line-height |
|---|---|---|
| `--text-xs` | 12px | 1.5 |
| `--text-sm` | 14px | 1.6 |
| `--text-base` | 16px | 1.6 |
| `--text-lg` | 20px | 1.6 |
| `--text-xl` | 24px | 1.5 |
| `--text-2xl` | 32px | 1.4 |
| `--text-3xl` | 40px | 1.3 |

ฟอนต์: UI = Noto Sans Thai / IBM Plex Sans Thai + Inter; หัวข้อ = Plus Jakarta Sans / Prompt; Code = JetBrains Mono

## Spacing

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (กริด 8px)

## Motion

- ease: `cubic-bezier(.2,.8,.2,1)`
- duration: 150–250ms
- เคารพ `prefers-reduced-motion`

## Breakpoints

`640 · 768 · 1024 · 1280 · 1536`
Sidebar 240px (ย่อ 72px) · Content max-width 1200px
