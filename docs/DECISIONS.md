# Product and architecture decisions

| Topic | Decision |
|:--|:--|
| Name | The product is called TimeMesh. |
| Invitations | By link only; the app doesn't send invitation emails. |
| Guest access | Guests have no Supabase session, so trusted server code validates a hash of their token. The service-role key never reaches the browser. |
| Lost guest link | The host generates a new personal link, which revokes the old one. |
| Guest email | Not collected. |
| Time zones | Each project has one time zone, `Europe/Lisbon` by default. All participants see the same times. |
| Storage | Instants are stored in UTC along with the project's IANA time zone, so more time zones can be added later. |
| Recurring schedules | Stored as local wall-clock times and converted to UTC only when calculating. |
| Nonexistent local time | Moves forward to the first valid time. |
| Repeated local time | Uses the first occurrence, without asking the user. |
| Availability precedence | Explicit unavailability, then manual entries and exceptions, then inherited recurring availability. |
| Individual visibility | A project setting, on by default. |
| Result updates | Revalidation or polling, not Supabase Realtime, because guests have no session. |
| Pending invitations | With link-only invites, the dashboard shows joined projects where the user hasn't filled in availability. |
