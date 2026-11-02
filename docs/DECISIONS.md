# Product and architecture decisions

| Topic | Decision |
|:--|:--|
| Name | The product is called TimeMesh. |
| Invitations | By link only; the app doesn't send invitation emails. |
| Guest access | Guests have no Supabase session, so trusted server code validates a hash of their token. The service-role key never reaches the browser. |
| Lost guest link | The host generates a new personal link, which revokes the old one. |
| Guest email | Not collected. |
| Planning periods | `member_weeks` replaces a `planning_periods` table: weeks come from the project dates, and this stores each person's status per week. |
| Recurring schedule scope | Per account across all its projects, shown as inherited until confirmed. Guests have one per project. |
| Exceptions scope | Per project, so an absence must be marked in each project. |
| Invitation tokens | Guest personal tokens are stored only as hashes. Project link tokens stay readable to the host, so the link can be copied again, and can be revoked. |
| Availability visibility in results | Calculations run in trusted server code, so results work when individual availability is hidden. |
| Time zones | Each project has one time zone, `Europe/Lisbon` by default. All participants see the same times. |
| Storage | Instants are stored in UTC along with the project's IANA time zone, so more time zones can be added later. |
| Recurring schedules | Stored as local wall-clock times and converted to UTC only when calculating. |
| Nonexistent local time | Moves forward to the first valid time. |
| Repeated local time | Uses the first occurrence, without asking the user. |
| Availability precedence | Date-specific entries (manual or exception) beat recurring ones. Within the same level, unavailability wins. |
| Recurring end times | An end at or before the start ends on the next day, so an equal start and end means 24 hours. |
| Session suggestions | Larger groups first, then closest to the preferred duration, then earliest. A maximum duration shortens a suggestion and never changes the underlying results. |
| Individual visibility | A project setting, on by default. |
| Result updates | Revalidation or polling, not Supabase Realtime, because guests have no session. |
| Pending invitations | With link-only invites, the dashboard shows joined projects where the user hasn't filled in availability. |
