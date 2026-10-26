
## Profile data regression and Thing route compatibility — Complete in source; lint/build validated
- Keep profile-dependent areas usable while the account lifecycle migration is pending by falling back to the pre-lifecycle profile column set.
- Preserve old `/things/:id` links by redirecting them to `/thing/:id`.
- Verify the production profile schema mismatch and the Thing detail route before delivery.
