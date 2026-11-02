# Product and architecture decisions

| Topic | Decision |
|:--|:--|
| Name | The product is called TimeMesh. |
| Simplicity | A project needs only a name. Everything happens on one board, with no settings or personal profile. |
| New project defaults | Starts on the current week's Monday and runs for a year, in 30-minute cells, in `Europe/Lisbon`. |
| Marking hours | People mark when they can, by dragging, Shift+click, or typing a short phrase such as "seg a sex 18-22". There is no separate "unavailable" state in the interface. |
| Shift+click | Fills the rectangle from the last clicked cell, giving it that cell's state. |
| Saving | Automatic, about half a second after a change. Each save replaces that week atomically through a database function. |
| Live updates | The board asks for the group's hours every 5 seconds while visible. Supabase Realtime isn't used, because guests have no session. |
| Best times | Bigger groups first, then longer periods, then earliest. Calculated in the browser with the compatibility engine, so they change as you mark. |
| Grid bars | A column is shared only by the people present at that time, so someone alone fills it. |
| Large groups | From 5 people the grid shows counts by intensity instead of per-person bars, because the bars become too narrow. |
| Past hours | Can't be changed and aren't suggested. They stay visible, faded. |
| Visible hours | 09:00–23:00 by default, widened to fit marked hours. The range updates only after a gesture ends, so rows don't move under the pointer. |
| Phones | Show one day at a time by default, with a strip beside the cells for scrolling, since dragging on cells marks them. |
| Hiding people | The eye icon only changes what the grid shows on that screen. It isn't saved, and the shared times still count everyone. |
| Theme | Follows the device until someone chooses light or dark, and that choice is kept in the browser. |
| Visibility | Everyone in a project can see each person's hours. |
| Sharing | New projects let any participant share the invitation link. |
| Invitations | By link only; the app doesn't send invitation emails. |
| Single invitation link | A project shows one active link. Revoking it stops new joins; people who already joined keep access. |
| Guest access | Guests have no Supabase session, so trusted server code validates a hash of their token. The secret key never reaches the browser. |
| Invitation tokens | Guest personal tokens are stored only as hashes. Project link tokens stay readable to the server and host, so the link can be copied again. |
| Lost guest link | The host generates a new personal link, which revokes the old one. |
| Removed members | A removed registered user can't rejoin through a link. A removed guest's link stops working. |
| Token page headers | `/join` and `/guest` use `Referrer-Policy: same-origin`, because `no-referrer` makes browsers send `Origin: null`, which Server Actions reject. |
| Time zones | Each project has one time zone. All participants see the same times. |
| Storage | Instants are stored in UTC along with the project's IANA time zone, so more time zones can be added later. |
| Nonexistent local time | Moves forward to the first valid time. |
| Repeated local time | Uses the first occurrence, without asking the user. |
| Kept for later | The database columns and tested logic for recurring schedules, presets and session durations remain, without any interface. |
