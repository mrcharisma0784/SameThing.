
## Admin feedback custom duration, Broadcasting validation and user detail cards — Complete in source; lint/build validated
- Feedback prompts support a site-styled custom duration picker with amount and minute/hour/day/week/month units, while preserving preset durations and Until stopped.
- Feedback prompt reads and writes remain usable when production has not yet applied `expires_at`; once the migration exists, expiry is stored and enforced.
- Broadcasting recipient input requires the `@username` format and resolves the username without the leading @.
- Admin user detail data is presented in readable, appropriately sized cards for profile, auth, tags, Things, comments, votes and feedback.
