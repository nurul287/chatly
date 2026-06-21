# Chatly — Documentation

A historical, time-ordered record of how this project was built. Each doc is frozen at the moment it was written — when something changes later, write a new doc rather than editing an old one. That way you can come back in a year and see exactly what was decided and why.

## Read in this order

| # | Doc | Summary |
|---|---|---|
| 0 | [ARCHITECTURE.md](./ARCHITECTURE.md) | Living overview — the 12-step build guide and mental model. Update this when the system changes. |
| 1 | [01-initial-build.md](./01-initial-build.md) | The original plan: scaffold, Firebase setup, auth, conversations, messages, presence, read receipts, groups, mobile UI |
| 2 | [02-audit-improvements.md](./02-audit-improvements.md) | Post-launch audit pass: title/favicon/OG tags, `.firebase/` ignore, N+1 fix, case-insensitive search, message pagination, date separators, typing indicator, leave conversation, long-text wrap, 1000-char message limit |
| 3 | [03-attachments-and-voice.md](./03-attachments-and-voice.md) | Adding image (`.jpg`/`.png`/`.gif`/`.webp`) and PDF attachments plus voice notes, with an industry-standard quarantine → AV-scan → release pipeline |

## Doc convention

Every numbered doc follows the same shape:

1. **Context** — what problem prompted the work, what we wanted at the end
2. **What changed** — the concrete delta (files added/modified, decisions made)
3. **Verification** — how we confirmed it worked

Keep numbered docs **historical**. The only living doc is `ARCHITECTURE.md`.
