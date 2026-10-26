# SameThing implementation TODO

## Under-15 guardian approval — Blocked pending production setup
- During onboarding, users under 15 must be able to enter a parent or guardian phone number or email, complete a genuine verification/consent step, and continue only after approval is verified.
- Choose a proportionate option for EU users and do not present self-entered contact information as verified consent.
- Do not ship a false approval shortcut. The app currently blocks under-15 access because the consent flow is not yet implemented.

## Supabase Edge Function deployment — Blocked pending production project authorization
- Deploy the retired `simplify-thing` Edge Function as a `410 Gone` response.
- Confirm and deploy only to the live production Supabase project; the repository's `supabase/config.toml` currently points to a different project.

## One-time Drop AI-processing notice — Complete in source; build validated
- Show this exact copy in a simple acknowledgement form on the Drop a Thing screen once per signed-in account: “Your Thing text is sent to Cloudflare for a safety review after posting. For Premium accounts, text of 8 or more characters is also sent as you type to suggest tags; using a suggestion is optional. Your post may include personal or sensitive details. Read our Privacy Policy.”
- After dismissal, do not show the notice again for that account in the same browser profile.

## Settings disabled-option labels — Complete in source; build validated
- Remove the “Unavailable” adornment before the disabled Streak and Test Users options in Settings while keeping the rows disabled and their hints intact.

## Feed-filter tag addition — Complete in source; build validated
- Let the Appearance plus input select a supported existing tag or create a valid custom tag, then save it to Feed filter pills.
- Preserve the existing tag and credit limits; restore the previous selection and show an error if saving fails.

## Drop type-by-type prompt — Complete in source; build validated
- On each Drop a Thing screen entry, type “The exact thought, fear, habit, or moment.” character by character, erase it, then type “Use @username to tag someone.” character by character, erase it, and repeat until the user interacts with the input.

## Empty bio and profile-menu motion — Complete in source; build validated
- Display a suitable English default sentence when a profile bio is empty without writing that sentence into the user's saved bio.
- Add restrained, reduced-motion-aware opening and closing animation to the profile-view menu, with subtle motion on its related buttons.

## Landing-page card arrows, spacing and footer — Complete in source; build validated
- Remove the arrow icons from the cards in “The quiet loop.” Place a restrained arrow at the right-center of each “Thoughts” card; keep those cards non-clickable for now because they may later link to real Things.
- Remove “Leave it unfinished. Let the room meet you there.” and reduce the surrounding gap so the next divider does not leave an oversized blank area.
- Put quotation marks around the footer sentence “A quieter social space for the things that make us feel less alone.” Keep “© 2026 SameThing.” and “for the in-between” side by side.

## Documentation navigation and first-entry motion — Complete in source; build validated
- Remove the top-right menu button while preserving the existing right-swipe gesture that opens the side menu. Place the “Back to the room” button at the far right.
- On a visitor’s first Documentation visit, animate the side menu open and then closed, like the Inbox tutorial. Keep navigation groups collapsed by default so the sidebar starts in compact mode.
