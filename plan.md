# SameThing account lifecycle, navigation and league update

## Scope

- Replace manual account deletion/export review with autonomous account lifecycle requests.
- Keep deletion scheduled for 30 days; delete only when the user has not logged in during that window.
- Show pending-deletion state and remaining days to the user; allow cancellation and enforce a 30-day cancellation cooldown.
- Allow one export request per 30 days. Build a structured JSON export and email it only when email delivery is configured; otherwise leave it pending.
- Update auth provider buttons without logos.
- Restore a Docs menu button while explaining that browser edge-swipe can trigger Back and recommending the installed app.
- Simplify About SameThing navigation/content and increase Product status labels.
- Preserve Leaderboard visual design while adding annual personal leagues, points, tiers and year-end reward-ready metadata.

## Implementation

- Add profile lifecycle timestamps and a durable account_data_requests schema migration.
- Add server-side account lifecycle helpers, daily retention/export processing and safe user-data deletion.
- Extend authenticated profile data with deletion warning/cancellation state.
- Update account UI with deletion confirmation, optional export prompt, monthly export limit, lifecycle warning and cancellation.
- Keep admin request visibility read-only; no admin approval is required.
- Add league configuration and activity-point calculation to the existing leaderboard server function, returning current user progress and annual season metadata.
- Update docs/about/auth presentation only; reuse existing style and routes.

## Acceptance criteria

- Account deletion requests require no admin approval, schedule deletion for 30 days, and delete after the scheduled date only when no later login exists.
- A user sees that the account is pending deletion, the remaining days, and can cancel; cancellation blocks a new deletion request for one month.
- Deletion confirmation asks whether the user also wants a data export.
- Export requests are limited to once per month, produce a structured file, and email it when provider configuration exists; otherwise remain visibly pending without pretending delivery occurred.
- Google and Phone auth buttons have no logos and use the existing first-button-sized rectangular treatment.
- Docs has a small informational installed-app message and a menu button; no swipe interaction is interpreted as browser navigation in the app UI.
- About removes the top Documentation button, keeps logo/wordmark left with Back, removes the hero orbit card and footer tagline, trims repeated copy, and enlarges Paid plans, Research API and Core space labels.
- Leaderboard keeps its current visual language and adds Astra → Cosmo-style annual personal progression with activity points and promotion thresholds.
