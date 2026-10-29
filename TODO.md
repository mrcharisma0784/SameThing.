
## Admin labels, report forms and plain Tags — Complete in source; lint/build validated
- Remove the redundant BANNED label from red-tinted Admin Users rows.
- Replace profile report browser prompts with a SameThing-styled in-app modal.
- Keep Admin Things Tags as plain inline text inside the full-width Tags subcard, without chip/card backgrounds.

## Haptics, silent notifications and avatar sizing — Complete in source; production build validated
- Give a brief haptic pulse for each typed or erased character in typewriter animations and while text selection changes; give site-wide feedback for enabled interactive controls. Respect a user-controlled haptics toggle in Appearance and gracefully do nothing on unsupported browsers/devices.
- Run Drop prompts once, then type the final “Use #tag to tag something.” prompt one additional time and stop; do not loop the animation continuously.
- Provide a Silent mode switch in Notification settings. While enabled, pause unread badges and browser alerts, retain ordinary notification records and restore them to the Inbox when disabled, and keep account-security/legal notices available in the Inbox without alerts. Do not replay notifications accumulated during the silent period as browser alerts after unmuting.
- Make uploaded profile photos fill their avatar frames consistently across the feed, Search, profile pages, comments, quote cards, connections, mentions, leaderboard, navigation and Admin, while keeping fallback marks at their existing sizes.
