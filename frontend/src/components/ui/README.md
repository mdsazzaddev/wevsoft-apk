# Core UI (`@/components/ui`)

```tsx
import { Button, IconButton, Input, Card, CardTitle, Modal, Sheet } from '@/components/ui';
```

Tokens live in `src/index.css` (`@theme` blocks + `:root` z-index vars).

| Instead of | Use |
|---|---|
| `bg-rose-600`, `bg-[#e11d48]` | `bg-destructive` |
| `hover:bg-black/5 dark:hover:bg-white/5` | `hover:bg-surface-hover` |
| `text-[11px]`/`text-xs` labels | `text-caption` |
| `text-[13px]` | `text-body-sm` |
| `z-[9999]`, `z-50` overlays | `z-(--z-modal)`, `z-(--z-toast)`, `z-(--z-dropdown)` |
| `h-[40px]` controls | `h-control-md` |

Migration: when you touch a file, swap raw `<button>`/arbitrary values for these. No mass rewrite.
