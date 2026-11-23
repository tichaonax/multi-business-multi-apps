# Building a camera alert list like Farm Control's

**For third-party applications using the Farm Control integration,
contract version 1, revision 6 (feature `cameraAlerts`; the clip player
from revision 6).** A companion to
the *Farm Control integration guide*; section numbers (§) refer to it.

This describes the alert list in Farm Control itself (the 📹 list, as of
0.5.0-rc206): what the user sees, how it behaves, and how to build the
same with the calls and frames of version 1. The clip player that plays an
alert in a row (§2.2) came in revision 6, at FarmNet's request from your
side; everything else was already there. Where Farm Control keeps something on its own
server that the integration does not give you (the list of alerts, seen
and dismissed, watch later, paused), this says what to keep on yours.

---

## 1. What makes the list work

The things users noticed most, in order:

1. **A picture on every alert**, so most alerts are judged without playing
   anything.
2. **Play in the list**: the picture becomes the video of that moment,
   starting 5 seconds before it, in place. No new page.
3. **Back-to-back findings joined into one alert** ("Movement ×4"), with
   **‹ Back · 2 of 4 · Next ›** to step through them.
4. **The date and time on every row**, short ("Sun 22 Nov", "6:42:16 PM").
5. **Find, site and kind filters**, with the number that match.
6. **Big screen without losing your place**: the full viewer opens and the
   list folds into a bar at the bottom; one tap opens it again where you
   were.
7. **Quick ways out**: dismiss (✕), keep for later (☆), stop alerts from
   a noisy camera for a while (🔕).

---

## 2. The screens

### 2.1 The list (desktop: a panel over the page; phone: full screen)

```
 ┌ Camera alerts   12 new ─────────────────────────────────────── ✕ ┐
 │ [ New (12) ]  [ ★ Watch later (3) ]  [ 🔕 Paused (1) ]           │
 │ [ Camera, site or a time (1:38)… ]  [ All sites (12) ▾ ]         │
 │ Day [ 22/11/2026 ] [‹] [›]  [ Any hour ▾ ]  Any time             │
 │ ( All ) ( Movement ) ( Sound ) ( No picture )                    │
 │ 4 new match · Clear the filters                                  │
 │ ┌──────┐ Parking Lot  Movement ×4 · Sun 22 Nov                   │
 │ │ pic  │ ✕ 6:42:16 PM – 6:47:02 PM · Site 3                      │
 │ └──────┘ [▶ Play] [⛶ Big] [☆ Later] [🔕]                        │
 │ ┌──────┐ Gate  Sound · Sun 22 Nov                                │
 │ │ pic  │ ✕ 6:40:03 PM · Site 1                                   │
 │ └──────┘ [▶ Play] [⛶ Big] [☆ Later] [🔕]                        │
 │ …                                                                │
 │ [ Mark all seen ] [ Dismiss all ]  🔊 Chime on      History →    │
 └──────────────────────────────────────────────────────────────────┘
```

- **The opener:** 📹 with the new count in your top bar. Shown once the
  user has ever had a camera alert.
- **Tabs, not stacked sections:** New, ★ Watch later (only once anything
  has been kept), 🔕 Paused (only while a camera is paused).
- **Rows are compact:**
  - The picture sits on the left, small (112 × 63 in Farm Control, 16:9), and is
    **centred vertically** in the row.
  - The **first line** is the camera name in bold, then what set it off
    (Movement, Sound, Movement and sound) with ×n when joined, then the
    short day (add the year when it isn't this year).
  - The **second line** is ✕ (dismiss), then the time or "from – to",
    then the site. The ✕ stands *before* the time so the buttons keep to
    one line.
  - The **buttons** go side by side on one line. Explanations are in a
    tooltip or a ? icon, not written out on the row.
- **A row still going on** (the camera is finding it now) says "now" for
  its end and is marked (a thin amber, blue or purple left edge for
  movement, sound or both, the same colours Farm Control's strip uses,
  §5).
- **Newest first.** Show 50, with "and 120 more" and a way to page; keep
  long lists fast.

### 2.2 Playing in the list

```
 │ ┌───────────────────────┐ Parking Lot  Movement ×4 · Sun 22 Nov   │
 │ │  ‹ Back · 2 of 4 · Next ›                                       │
 │ │        (video)        │ ✕ 6:42:16 PM – 6:47:02 PM · Site 3      │
 │ │                       │ [■ Stop] [⛶ Big] [☆ Later] [🔕]        │
 │ └───────────────────────┘                                         │
```

- **▶ Play** replaces that row's picture with the **clip player** (the
  player frame with `mode=recordings&controls=0`, guide §5, revision 6) in
  the same place, a little larger, from **5 seconds before** the finding to
  **3 seconds after** its end (`&until=`). It is the same player as Farm
  Control's own list:
  - the video only, muted at first with a small 🔇/🔊, and a click pauses
    and resumes it;
  - 2 minutes at a time, then **▶ Play on**.
- **Only one plays at a time.** Playing another row stops the first. This
  is also needed for the limit of 2 viewers and players per user (§10).
- **Scroll the playing row into view:** after it opens, use
  `element.scrollIntoView({block: "nearest", behavior: "smooth"})`, on
  desktop and phone. Without this the video often opens half hidden.
- **A joined alert** shows **‹ Back · n of m · Next ›** over the video
  (yours, over the frame).
  - Next plays the next finding from 5 seconds before it: send the frame
    `player.seek` (guide §6). It plays there without reloading and without
    taking a second place (§10).
  - The "n" follows the video's real position, from the frame's
    `player.position` messages (§3.3), so letting it run on moves the
    count by itself.
- **■ Stop**, closing the list, or switching tabs **removes the frame**
  (§5: removing a frame frees its place at once).

### 2.3 Big screen, and the list folding away

```
 ┌ your page ───────────────────────────────────────────────────────┐
 │            (Farm Control viewer frame: recordings at the alert)  │
 │                                                                  │
 ├──────────────────────────────────────────────────────────────────┤
 │ ▲ 📹 12 · Parking Lot in the player        ‹  ›              ✕   │
 └──────────────────────────────────────────────────────────────────┘
```

- **⛶ Big** opens the **viewer frame** on the recordings at the alert
  (§5). The list does not close: it **folds into a bar at the bottom**,
  so the whole viewer, buttons included, is free to use.
- **The bar:**
  - ▲ opens the list again where it was (same tab, filters and scroll).
  - ‹ › go to the alert before or after and play it in the viewer
    **without reloading your page**.
  - ✕ closes it.
- **The open list sits over a light shade** of the page behind it, so
  the two never mix.
- **A new time** (‹ ›, or ⛶ Big on another alert) goes to the viewer
  frame by giving it a new address (`&at=`). Version 1 has **no message to
  move an open viewer to a new time** (§6), so that one frame reloads.
  Reload only that frame and keep the rest of your page as it is, the bar
  and the list's place included. Farm Control's own page goes to the new
  time without reloading, but that isn't offered to integrations in
  version 1.

### 2.4 Phone details

- The list is full screen. The rows are the same, the buttons wrap less
  because the ✕ is on the time line, and the picture stays at the left.
- **The phone's Back button closes the list**, not the browser:
  1. When the list opens, call `history.pushState({…, alertList: true}, "")`.
  2. On `popstate`, close the list only when that mark is gone *and*
     the page address is the one the list was opened on. Opening the big
     viewer may change the address and also fires `popstate`.
  3. When the list is closed by its own ✕, call `history.back()` if your
     step is still on top.
- **Watch later** on a phone: one line of buttons per row; no empty
  columns.

### 2.5 Arriving alerts

- **A corner card** for about 8 seconds: the picture, camera, what, time,
  and ▶ Play, ✕, 🔕. A click opens the list on it.
- **A short chime**, which the user can turn off in the list. You may
  use your own sound, or Farm Control's (`alertSound`, §5).
- **Your notification** (also while your application is closed, §7.12).
  When tapped, it opens the list on that alert, or the viewer at the
  moment.
- The 📹 count goes up. A finding that **joins** an alert already in the
  list updates that row (×n, end time) **without another card, chime or
  notification**.

---

## 3. Building it with the integration

### 3.1 Where the data comes from

| On screen | From |
|---|---|
| The user's alerting cameras | `GET /cameras?alerting=true` (§7.3); the camera's `alert` (`motion`, `sound`, `any`) |
| Something found **now** | `goingOn` in `GET /camera-events` (§7.12), or `camera.alert` from an open strip (§6) |
| The alert itself (camera, site, what, start, end) | `events` in `GET /camera-events?since=` (§7.12): `CameraEvent` `{id, cameraId, name, site {id, name}, trigger, start, end, pictureUrl}` (§8) |
| The picture | `GET` the event's `pictureUrl` **from your server, with the user's token** (§7.12). About 320 wide and 10–20 KB: **keep a copy** with your alert, and serve it to your page yourself |
| The picture for one going on (no event yet) | `GET /cameras/{id}/picture` (§7.3), the camera now |
| ▶ Play in the row | **The clip player**: `/embed/v1/player?integration=ID&camera=C&mode=recordings&controls=0&at=<start − 5 s>&until=<end + 3 s>` (guide §5, revision 6); `until` left out while the alert is still going on |
| Where the clip has reached | `player.position` `{cameraId, at}` from the frame, about once a second (guide §6) |
| Back and Next in a joined alert | `player.seek` `{at, until}` to the frame (guide §6) |
| ⛶ Big | **Viewer frame**: `/embed/v1/modal?integration=ID&camera=C&tab=recordings&at=<start − 5 s>&alerts=0` (§5; `alerts=0` when your screen has its own 🔔) |
| Turn a camera's alerts on or off | `PUT` / `DELETE /cameras/{id}/alert` (§7.12) |
| Whether video is still kept | `GET /cameras/{id}/coverage` (§7.5): `oldest`. An alert before it has no video; say "Video no longer kept" and hide ▶ Play |

`GET /camera-events` reaches **at most an hour back**, so **your server
keeps the list.** Poll it for each user who wants alerts (every 5 to 10
seconds, §7.12, §10) and store what comes. This is also what lets you
notify users while your application is closed.

### 3.2 What to keep on your server

Farm Control keeps these for its own list. The integration gives you the
events, and you keep the rest.

```
alert         id, user, cameraId, cameraName, siteId, siteName,
              trigger (motion|sound|both), start, end (empty: going on),
              times (1, or more when joined), lastAt,
              firstEventId, eventIds[], picture (bytes or file),
              seenAt, dismissedAt, laterAt
paused        user, cameraId, what (the user's choice), pausedAt
```

- **Seen:** set when the user plays it, opens it, or uses Mark seen. The
  count is the alerts not seen and not dismissed.
- **Dismissed** (✕, Dismiss all): leaves the New tab. Keep it for history.
- **Watch later** (☆/★): kept until removed, even past your clean-up.
  Show when it was kept.
- **Clean-up:** Farm Control keeps 30 days (except watch later).

### 3.3 Joining back-to-back findings

The events you get are **not joined**. Each finding is its own
`CameraEvent`. Join them on your side, as Farm Control does:

1. A new event from a camera **joins** the user's newest new alert from
   that camera when that alert **ended at most 2 minutes before** the
   event's start (or is still going on), and the alert **started less
   than 30 minutes ago**.
2. Joining:
   - adds 1 to `times` and adds the event to `eventIds`;
   - sets `lastAt` and `end` to the event's;
   - widens `trigger` to `both` when the event's is different;
   - keeps the first picture.
3. Otherwise, the event starts a new alert, with its own picture.

Farm Control's farms may set the join time per site or camera. The
integration doesn't say what it is, so use **2 minutes**, or a setting of
your own.

**Back and Next** step through `eventIds` in time order:
- **To step:** send `{type: "player.seek", at: <that event's start − 5 s>,
  until: <the alert's end + 3 s>}` to the clip player.
- **For "n of m":** take the last event whose `start − 5 s` is at or
  before the `at` of the frame's latest `player.position`. Don't estimate
  it from a clock: a paused or waiting video would leave the count wrong.
- Disable ‹ Back on the first and Next › on the last.

### 3.4 Something going on, then kept

This follows §7.12's steps:

1. A camera appears in `goingOn` that was not there before: **make the
   alert at once**, with no end. Take its picture from
   `GET /cameras/{id}/picture`, notify, and play the card and chime.
2. Its event arrives in `events` (an `id` you haven't seen, starting a
   little after you saw it going on): **complete that alert** (start,
   end, event id). Replace the picture with the event's `pictureUrl`.
   **Don't notify again.**
3. An event you never saw going on: a new alert, or a join (§3.3).
4. Recognise events by `id`. The same one may come twice.

### 3.5 Pausing a camera (🔕)

In Farm Control, 🔕 pauses that user's alerts from the camera until they
resume. Their choice is kept, and the camera keeps recording and finding
things for everyone else. The integration shows a camera paused in Farm
Control as not alerting (§7.12). Through the integration you can do the
same in either of two ways:

- **Pause on your side (recommended):**
  - keep it in `paused` and drop that camera's events while it's there;
  - resume by deleting the row;
  - Farm Control's own alerts for the user are not affected.
- **Pause in Farm Control as well:**
  - `DELETE /cameras/{id}/alert`, keeping the user's `what` in `paused`;
  - on resume, `PUT /cameras/{id}/alert {what}`;
  - Farm Control then shows the camera as off for that user (not
    "paused").

Either way:
- after 🔕, show a line "Alerts from Parking Lot paused for you. **Undo**";
- list paused cameras in the 🔕 Paused tab, each with **Resume**;
- nothing found while paused comes later.

### 3.6 Filters

- **Find:** the camera or site name. A **time** in it ("1:38",
  "1:38 pm", "13:38", "gate 1 pm") finds alerts within **an hour either
  way** of it; with no am or pm, both the morning and the afternoon. A
  line under the filters says what it found ("12:38 AM – 2:38 AM and
  12:38 PM – 2:38 PM on Sun 22 Nov") with a way to clear it. A number
  alone ("Gate 2") is not a time.
- **Day:** a date picker (no later than today), with **‹ ›** for the day
  before and after (› stops at today). With no day, a time or an hour is
  today's.
- **Hour:** **Any hour**, or one of the day's 24. **Any time** clears the
  day and the hour together.
- **Site:** offered when the user has new alerts from more than one site,
  each with its new count.
- **Kind chips:** All, Movement (`motion` or `both`), Sound (`sound` or
  `both`), No picture.
- **"n new match · Clear the filters"** shows whenever a filter is on.
- With a filter on, the buttons read **Mark n seen** and **Dismiss n**,
  and take **every** alert that matches, not only those shown.
- The count, the card and the chime always follow every new alert,
  whatever is chosen.
- Forget the filters when the list closes.

### 3.7 The list's foot, and History

- **Mark all seen** and **Dismiss all**, which read **Mark n seen** and
  **Dismiss n** while a filter is on (§3.6).
- **🔊 Chime on / 🔇 Chime off:** whether this device plays the chime,
  kept on the device.
- **History →** opens a page of its own with the **last 30 days** of the
  user's camera alerts:
  - **States:** New (the default), All, Seen and Dismissed.
  - **The same filters:** find, site, kind chips, day and hour.
  - **Pages** from your server, larger pictures (160 × 90), and Mark seen
    and Dismiss on each row.
  - The list keeps to what's new; History is where anything older is
    found. "Nothing new. Earlier alerts are in History." in an empty
    list, and "and n more in History" under a long one.

---

## 4. Rules that keep it right

- **One frame playing in the list at a time.** Remove the frame on Stop,
  on another ▶ Play, on a tab change, and when the list closes. A frame
  that answers `state` `limit` (§9.2) means two are open: say "Close the
  other video first", not an error.
- **A frame address carries only the integration id, the camera and the
  options** (§5). Your server signs the user in, and the frame asks your
  page for an `assertion` (§4, §6).
- **Fetch pictures from your server only**, with the user's token. Never
  put a token in your page or in an image address.
- **Times:** show the user's local time. Store and compare in UTC (the
  `start`/`end` you get). Use `now` from `GET /camera-events` as the clock
  for `since`, not your own (§7.12).
- **Access can change:** a camera the user may no longer watch stops
  coming in `events`, and its frame says `denied` (§9.2). Say "You can no
  longer watch this camera" on its rows and hide ▶ Play.
- **Hidden pages:** frames pause after 10 seconds hidden (§9.2). Don't
  treat that as an error.

---

## 5. Checklist

- [ ] Picture on every row, centred vertically; name, what, ×n, short day
- [ ] ✕ before the time; buttons on one line
- [ ] ▶ Play in place, 5 s before; only one at a time; scrolled into view
- [ ] Joined alerts: ×n, from – to, ‹ Back · n of m · Next ›
- [ ] ⛶ Big in the viewer frame; the list folds to a bottom bar with ▲ ‹ › ✕
- [ ] Shade behind the open list; a new time reloads only the viewer frame
- [ ] Phone Back closes the list
- [ ] New / ★ Watch later / 🔕 Paused tabs
- [ ] Find (also by time), site, kind, day ‹ ›, hour; "n new match · Clear the filters"; Mark n seen / Dismiss n
- [ ] Chime on/off per device; History → with 30 days, New / All / Seen / Dismissed
- [ ] Corner card, chime, notification on arrival; none for a join
- [ ] Alerts and pictures kept on your server; 30 days; watch later kept
- [ ] "Video no longer kept" from the camera's coverage
