# Farm Control integration guide

**For third-party applications. Integration contract version 1 (complete).**

Status: **ready to build against, revision 6, 2026-11-23.** This is the
whole of version 1: every feature the integration offers. Farm Control
0.5.0-rc57 and later serve all of it except two-way audio (§1.2). It
becomes final once FarmNet's own end-to-end checks with a test host pass;
your FarmNet contact will tell you. A change after that becomes version 2,
and version 1 keeps working.

**New in revision 6** (additions only; nothing in revision 5 changed):
**the clip player**, for playing an alert in your own list. The player
frame with `mode=recordings&controls=0` now plays **only the recorded
video**, filling the frame, as §5 always said for `controls=0`: until
revision 6 it showed the recordings timeline. It plays 2 minutes at a time
with **▶ Play on**, starts muted, and pauses and resumes with a click; the
new `&until=` stops it at a time of yours. It sends `state` (with a new
`reason` on `paused`) and the new **`player.position`**, about once a
second, and takes the new **`player.seek`** to play from another time
without reloading (§5, §6, §9.2, §12, from rc206).

**New in revision 5** (additions only; nothing in revision 4 changed):
**camera alerts**, for your own notifications and sound when a camera
finds movement or a sound. With the new feature `cameraAlerts`, your user
chooses the cameras they want to be told about (`PUT /cameras/{id}/alert`,
or the 🔔 in the viewer frame), the same list as in Farm Control itself;
your server asks `GET /camera-events?since=` every few seconds and sends
its own notification, also while your application is closed; and while a
preview strip is open it sends your page `camera.alert`, and can play Farm
Control's chime (`alertSound`) and outline the camera (§5, §6, §7.12, §8,
§10, from rc182). A camera the user has **paused** in Farm Control counts
as not alerting (§7.12, from rc201).

**New in revision 4** (additions only; nothing in revision 3 changed):
**alerts**, for your own notifications. With the new feature `alerts`, `GET
/alerts` answers the alerts this user would see in Farm Control about their
cameras and sites, such as a camera with a problem, a site that cannot be
reached, or devices waiting for approval. `?changedSince=` gives what opened
or resolved since your last call (§7.11, the `Alert` object in §8, from
rc65). **Your look** in the frames: `&theme=light|dark|auto` and your own
colours (`&accent`, `&accentText`, `&bg`, `&panel`) in their addresses, and
a `theme` message that changes them while a frame is open (§5.3, §6, from
rc66).

**New in revision 3** (additions and corrections; nothing that worked
changes): `&capture=0` on the viewer and the player hides only the capture
buttons (§5); `&quality=small` puts a player without buttons on the small
stream (§5); the player with buttons is described (full quality, record,
take picture, camera control; §5, §7.7); **corrected:** viewers and
players, live or playing recordings, share one per-user limit, 2 at once
by default, not one viewer plus separate players (§10); origins may be any `https` host
name, a LAN name included, and how to register several servers of yours
(§3.1); the `Device` field `fingerprint` (§8). Device approvals refuse a
device without a usable network ID, a device seen on the camera network
and a camera, which are for a person on Farm Control's own Approvals
screen (§7.9, from rc59). **Made explicit:** the sign-in and the API calls
may come from your server or from your page, each naming one of your
registered origins in `Origin`; video plays only in the frames; Farm
Control is reached by name, not IP address; the farm sees why a sign-in
was refused (§2, §3.3, §4.4).

**New in revision 2** (additions only; nothing in revision 1 changed): the
preview strip can show **still pictures** instead of live video, chosen in
its address (`&mode=pictures`) or switched at any time with
`previews.options` `mode` (§5.2, §6); single cameras as still pictures on
your request (`previews.options` `stillCameras`, §5.2); a camera open in
the viewer or a live player frame shows its **still picture** in the strip
instead of a blank box, and frees its live place (§5); the window state
`still` (§9.2); how the farm sizes the live-session limit for your users
(§10).

Contents: 1 What the integration offers · 2 How it fits together · 3 Before
you start · 4 Signing in your users · 5 Frames · 6 Messages · 7 The API ·
8 Objects · 9 Errors and window states · 10 Limits · 11 Privacy, security,
audit · 12 Testing · 13 Quick reference

---

## 1. What the integration offers

Your users work with the farm's cameras inside your application, with the
permissions they have in Farm Control, at the farm sites your integration
is allowed. You decide what you build; everything below is supported.

| Area | What you can do | Feature (§1.1) |
|---|---|---|
| Cameras and sites | List the user's sites and cameras; search, filter and page through them; read each camera's details and state; a still picture of each, for your own search screens | `viewing` |
| Live video | A **preview strip** of up to 4 live pictures, **the cameras chosen by your user**; a **viewer** for any camera; a **single player** to place anywhere in your pages | `viewing` |
| Recordings | Timeline (recorded, no motion, recording off, gaps), coverage figures, motion events (all cameras or one), playback in the viewer and the player from any time | `recordings` |
| Camera control | Pan, tilt, zoom and presets, from your own buttons through the API or in the viewer | `controls` |
| Capture | Download clips; record live and take pictures in the viewer; protect footage from deletion | `capture` |
| Configuration | Recording on or off; recording mode (continuous, motion) and schedule; how long recordings are kept; motion sensitivity and ignored areas (a camera follows its site's motion settings for each value it does not set itself, added 2026-11-21); the camera's display name and notes | `configuration` |
| Device approvals | The network devices waiting for approval at the user's sites: approve, block, revoke, reopen; by API or in the approvals panel | `deviceApprovals` |
| Alerts | What Farm Control sees wrong for this user, such as a camera with a problem, a site that cannot be reached, or devices waiting for approval, opened and resolved by Farm Control, for your own notifications | `alerts` |
| Camera alerts | The user chooses cameras to be told about when they find movement, a sound, or either; you are told what they found, for your own notifications and sound (revision 5) | `cameraAlerts` |
| Two-way audio | Talking through a camera's speaker, in the viewer | `twoWayAudio` (§1.2) |

**What a user can do is never more than they can do in Farm Control.** Each
action needs the matching permission in Farm Control on that camera or
site; the farm's administrators set those. **Never through an integration:**
camera addresses, passwords and stream addresses; adding or removing
cameras; access rules, users and groups; the server's own settings.

### 1.1 Features

The farm's administrators switch each feature on or off **for your
integration**. `viewing` is always on; the others start **off** until the
farm turns them on. `GET /features` (§7.2) tells you, at any time, which are
on for you and which this user may use, so your screens can show only what
works. A switched-off feature is refused (403 `feature-off`) and its
buttons are not shown in the frames.

### 1.2 Two-way audio

In the contract and in `/features`, but **not available in the first Farm
Control release**: it is built when the farm has a camera with a speaker.
Until then `/features` reports it as `unavailable` and its calls answer 409.
Design for it if you want it; it will start working without a change on
your side.

## 2. How it fits together

```
 your user's browser
 ┌──────────────── your page (https://app.example.com) ──────────────────┐
 │ your own screens ── call the Farm Control API (§7) with a token ──┐   │
 │ ┌── frame: preview strip (cameras you choose) ──┐                 │   │
 │ ┌── frame: viewer / player / approvals panel ───┐                 │   │
 └─▲───────────────────────────────────────────────────────────────┼───┘
   │ postMessage (§6)                       video and calls, over   │
 your server: signs a one-minute            the farm's private      ▼
 "assertion" for the signed-in user (§4)    network ─────► Farm Control server
 with your private key; it may call the
 API itself too (§4.4)
```

- **Your server** says who the user is, with a short signed assertion.
- **Your server or your page** exchanges an assertion for a session token
  and calls the API (§7) for data and actions. Either is supported; most
  applications call it from their server (§4.4).
- **Your page** shows Farm Control's **frames** (§5) where video is
  wanted. The frames sign themselves in from the user's browser.
- **Video plays only in Farm Control's frames**; the frames play it, check
  every permission and show every state. Your application never receives
  video, camera addresses or passwords.

## 3. Before you start

### 3.1 You send to your FarmNet contact

| What | Notes |
|---|---|
| Your application's name | Shown to the farm's administrators and in the audit |
| **The origins** your pages are served from | Exact `https://` origins (scheme, host, port), up to 10: only these may show the frames and call the API. Any host name your users' browsers trust the certificate of: a public name, a LAN name such as `https://mbm-site1.local:8080`, or a tailnet name. No wildcards, no `http://` |
| **Your public key** and a key id | Ed25519, PEM (§4.1). Never the private key. Up to two at once, for changing keys (not one per server) |
| The users to link | For each of your users who should have farm cameras: **your stable id** for them (it goes into `sub`; not an e-mail address or a name), and who they are, so the farm can link them to the right Farm Control account |
| The features you want | §1.1; the farm decides |
| A technical contact | |

Please show each user's stable id in your user administration.

**Several servers of yours** (for example one per business site), each with
its own users: register **one integration per server**. Each has its own
key, origins, sites, linked users and limits, and is switched on or off on
its own. Only if all your servers share **one user directory** (the same
stable ids everywhere) may they share one integration: list every server's
origin, and every server signs with the same private key.

The frames always load from the Farm Control address (§3.3), whatever your
origins are: your users' devices must reach it.

### 3.2 Your FarmNet contact sends you

| What | Use |
|---|---|
| The **Farm Control address**, for example `https://farm-server.tail1234.ts.net:8443` | The base of every frame and API address; the only origin your page talks to |
| Your **integration id** | `iss` in assertions, `integration` in frame addresses |
| Your **audience** value | `aud` in assertions |
| The features on and the limits | §1.1, §10 |

### 3.3 Reaching Farm Control

Farm Control is not on the public internet; it is on the farm's private
network (a Tailscale tailnet). **Your users' browsers must reach the Farm
Control address**: in version 1 each user's device is invited to the farm's
tailnet and allowed to reach Farm Control only. Your FarmNet contact
arranges it. The address has a certificate browsers trust. **If your server
calls the API** (§4.4), it reaches Farm Control the same way: your server is
on the farm's tailnet too, and connects by the Farm Control address's
name, so the certificate matches.

## 4. Signing in your users

### 4.1 Keys

```sh
openssl genpkey -algorithm ed25519 -out farm-control-key.pem
openssl pkey -in farm-control-key.pem -pubout -out farm-control-key.pub.pem
```

Keep the private key on your server. Send the `.pub.pem` file and a key id
(for example `2026-10`). To change keys: register the new public key with a
new id, sign with it, then ask for the old one to be removed.

### 4.2 The assertion

A compact JWS (JWT), algorithm **EdDSA** (Ed25519). Header: `alg` `EdDSA`,
`typ` `JWT`, `kid` your key id. Claims:

| Claim | Value |
|---|---|
| `iss` | Your integration id, as text |
| `aud` | Your audience value |
| `sub` | Your stable id for the user |
| `perm` | An array including `"camera-integration"`; add `"device-approvals"` for the approvals features |
| `iat` | Now, seconds since 1970 UTC |
| `exp` | At most 60 seconds after `iat` |
| `jti` | A new random id for each assertion; each is accepted **once** |
| `name` | Optional display name, for the farm's audit only |

Clock difference allowed: 30 seconds.

**Issue one only** for a request from the user's signed-in session, when the
user holds your permission for farm cameras and their account is active.
Withdraw the permission and Farm Control stops the user at the next renewal
(§4.4). Never cache, reuse or log assertions.

### 4.3 Signing examples

Node.js 18 or later, no library:

```js
import { createPrivateKey, randomUUID, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const key = createPrivateKey(readFileSync("farm-control-key.pem"));
const b64u = (b) => Buffer.from(b).toString("base64url");

export function farmControlAssertion(user, { approvals = false } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "EdDSA", typ: "JWT", kid: process.env.FARM_KEY_ID };
  const claims = {
    iss: process.env.FARM_INTEGRATION_ID, aud: process.env.FARM_AUDIENCE, sub: user.stableId,
    perm: approvals ? ["camera-integration", "device-approvals"] : ["camera-integration"],
    iat: now, exp: now + 60, jti: randomUUID(), name: user.displayName,
  };
  const input = b64u(JSON.stringify(header)) + "." + b64u(JSON.stringify(claims));
  return input + "." + b64u(sign(null, Buffer.from(input), key));
}
// Route for signed-in users only, answering text/plain with Cache-Control: no-store.
```

Python 3.9 or later, `cryptography` package:

```python
import base64, json, time, uuid
from cryptography.hazmat.primitives.serialization import load_pem_private_key

KEY = load_pem_private_key(open("farm-control-key.pem", "rb").read(), password=None)
def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def farm_control_assertion(user, integration_id, audience, key_id, approvals=False):
    now = int(time.time())
    header = {"alg": "EdDSA", "typ": "JWT", "kid": key_id}
    claims = {"iss": str(integration_id), "aud": audience, "sub": user.stable_id,
              "perm": ["camera-integration"] + (["device-approvals"] if approvals else []),
              "iat": now, "exp": now + 60, "jti": str(uuid.uuid4()), "name": user.display_name}
    s = b64u(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        b64u(json.dumps(claims, separators=(",", ":")).encode())
    return s + "." + b64u(KEY.sign(s.encode()))
```

### 4.4 Sessions

- **Frames** sign themselves in: each asks your page for an assertion
  (`ready`, §6) and renews (`assertion.needed`).
- **Your server or your page**, to call the API, exchanges an assertion
  itself: `POST /session` (§7.1) answers a **token** and when it expires
  (15 minutes; the farm may set up to 60). Keep the token **in memory
  only** (in a page: not in cookies or local storage) and send it as
  `Authorization: Bearer <token>`. Renew about 2 minutes before expiry with
  a fresh assertion (`POST /session/renew`). On sign-out call
  `DELETE /session` and send `close` to the frames.
- A 401 means the session ended (expired, user unlinked or deactivated,
  integration turned off): get a new assertion and sign in again once; if
  refused again, stop and show that farm cameras are not available.
- **From your server or from your page.** Every API call names one of your
  registered origins in its `Origin` header. A browser adds it by itself;
  **your server sets it** to the origin of the application the call is
  for, for example `Origin: https://app.example.com`. The sign-in, its
  renewals and the calls of one session send the same origin. A sign-in or
  call that names no origin is refused with 401. Video is the exception:
  it plays only in the frames (§5), which sign themselves in from the
  user's browser.
- **Use the Farm Control address by name**, exactly as your FarmNet contact
  sends it, never by IP address. Otherwise the certificate does not match
  and the connection fails before anything is sent.
- Farm Control does not tell your application why a sign-in was refused.
  The farm's administrator sees the reason and what to do in the
  integration's **Refusals** list, from rc60. Ask your FarmNet contact.

## 5. Frames

Shown in an `iframe` on your registered origins only, with
`allow="autoplay; fullscreen"`, no `sandbox`. Only the integration id,
camera ids and the options below go in a frame address; never tokens,
assertions or user ids.

| Frame | Address | Shows |
|---|---|---|
| **Preview strip** | `/embed/v1/previews?integration=ID&cameras=12,7,31,4` (and optionally `&names=0`, `&mode=pictures`) | Up to 4 live pictures (small streams, no sound), the cameras **you name**, in that order. Without `cameras`: the user's pinned cameras, then the ones they opened recently. Change them at any time with `previews.set` (§6). With `names=0`, no names on the pictures (§5.1); with `mode=pictures`, still pictures instead of live video (§5.2). A click sends `camera.open` |
| **Viewer** | `/embed/v1/modal?integration=ID&camera=12` (and optionally `&tab=live` or `recordings`, `&at=<ISO time>`, `&capture=0`) | One camera, large: live with full quality and sound on request; recordings with timeline, events and playback; controls, capture and two-way audio where the features and the user's permissions allow. With `capture=0`, no capture buttons (below). Counts against the per-user limit of viewers and players (§10) |
| **Player** | `/embed/v1/player?integration=ID&camera=12&mode=live` or `&mode=recordings&at=<ISO time>` (optionally `&controls=0`, `&capture=0`, `&quality=small`) | One camera, for placing beside your own content (for example next to an event in your list). Live or recordings from a time. **With buttons** (the default), live is the same as the viewer's live tab: it starts on the small stream with **Full quality, with sound**, and has **Record** and **Take picture** (`capture`) and camera control (`controls`) where allowed; recordings have the timeline, and download and protect (`capture`) where allowed. **With `controls=0`**, the video only, no buttons: live on the full-quality stream, or with `quality=small` on the small stream (no sound; full quality if the camera has no small stream); recordings as **the clip player** (below, revision 6). With `capture=0`, no capture buttons. Counts against the per-user limit of viewers and players (§10) |

**Camera alerts in the frames** (`cameraAlerts`, revision 5). The
**viewer** shows a 🔕/🔔 by the camera's name: the user turns their alert
from that camera on (movement, sound, or either) or off, as in Farm
Control; `&alerts=0` in its address hides it, for an application with a
screen of its own (§7.12). While a **preview strip** is open it watches the
user's alerting cameras and sends your page `camera.alert` (§6) for each
thing found, for any of them, shown in the strip or not; a camera in the
strip is outlined in what set it off (amber movement, blue sound, purple
both) until it is clicked. With `&alertSound=1` in its address, or
`previews.options {alertSound: true}`, the strip also plays Farm Control's
short chime (off by default, so your page can play its own sound); a
browser may keep it silent until the user has clicked in your page once.

**The clip player** (revision 6, from rc206): `/embed/v1/player?integration=ID&camera=12&mode=recordings&controls=0&at=<ISO time>` and optionally `&until=<ISO time>`. For an alert in your own list, played where its picture was.
- **The recorded video only**, filling the frame: no timeline, day picker
  or buttons, in your look (§5.3). Without `at`, the last minute.
- **2 minutes at a time**, or up to `until` when sooner (for an alert: its
  end plus a few seconds). Then it stops (`state` `ended`) and shows a
  small **▶ Play on** that plays the next 2 minutes. It doesn't go past
  the recording: where the recording ends, it ends, with no Play on.
- **Starts muted**, with a small 🔇/🔊 at the bottom right and a small
  ❚❚/▶ at the bottom left. A **click on the video** also pauses and
  resumes it.
- **`player.position`** (§6) about once a second while it plays, and once
  soon after each start or seek: the time the video has reached. Use it
  for your own "2 of 3" and ‹ Back · Next ›.
- **`player.seek`** (§6) plays from another time (and to another
  `until`), in the same frame without reloading it.
- The recordings permission is checked as for any player. A refusal shows
  its reason in the frame and is sent as `state` `denied`.
- It is **one player** for the limit (§10) while open, also across seeks,
  and its place is free as soon as it is closed (`close`) or removed. When
  the place is taken, it waits for about 30 seconds for one to free, then
  sends `state` `limit`.
- Hidden (`visibility` false), it stops and sends `state` `paused` with
  `reason` `hidden`. Shown again, it goes on from where it was.

**`capture=0`** on a viewer or a player hides only the capture buttons
(Record, Take picture, Download clip, Protect), for example for a user your
application does not let capture, while full quality and camera control
stay. It only takes away: a user without capture in Farm Control, or with
the `capture` feature off, never gets those buttons anyway.
| **Approvals panel** | `/embed/v1/approvals?integration=ID` (and optionally `&site=3`) | The devices waiting for approval at the user's sites, with approve, block, revoke and reopen (`deviceApprovals`) |

While a camera is open in a larger view (the **viewer**, or a **player**
frame showing it live) in the same browser, the strip shows that camera's
**still picture** instead of its live video, refreshed every 10 seconds,
shown **dimmed with an outline and an "enlarged" mark** in the middle (no
words; pointing at it says "Open in a larger view"), so it stands apart
from the cameras playing; its live place is free meanwhile (§10).
When the larger view closes or is removed, the strip plays it live again.
For a larger view of your own that Farm Control cannot see, ask for the
still yourself with `stillCameras` (§5.2). Every frame pauses when hidden
for 10 seconds.

**The strip's size is yours.** Give its frame the width and height your
page has room for; the strip fills it with one row of up to four pictures,
each as tall as the frame (never taller than 16:9), cropped to fit, the
camera name small over the bottom. A thin strip in a header works: four
cameras fit in about **460 × 64 px** (two in about 240 × 64). Change the
cameras with `previews.set` rather than reloading the frame. Removing or
reloading a frame ends its live pictures at once, so their places (the
limit of previews per person) are free again straight away.

### 5.1 Camera names in the strip

You choose how the strip's cameras are named, and can change it at any
time while the strip plays, without reloading it:

- **On the pictures (the default):** Farm Control's name for each camera,
  small over the bottom of its picture; the name scales with the strip's
  height, and in a strip 44 px or thinner shows only while the user points
  at that picture.
- **None on the pictures:** load the strip with `&names=0`, or send
  `{type: "previews.options", showNames: false}`; `showNames: true` puts
  them back. Show the names elsewhere in your page if you want: every
  `previews` message from the strip lists its cameras with their names and
  sites (§6), in the order shown.
- **Your own names:** send `{type: "previews.options", labels: {"12":
  "Front gate", "7": "Barn"}}`. A label replaces Farm Control's name on that
  camera's picture (when names are shown); an empty label (`"12": ""`) gives
  it back. Labels are plain text, at most 40 characters, and are added to
  the ones already sent. They live in that frame only: Farm Control never
  stores them, the farm's own screens and audit keep its names, and a
  reloaded strip starts without them (send them again after its
  `previews` message).

A problem on a picture (for example "Too many cameras are open") is shown
on the picture even when names are off.

```js
const strip = document.getElementById("farm-strip").contentWindow;
strip.postMessage({ type: "previews.options", showNames: false }, FARM);            // names off
strip.postMessage({ type: "previews.options", showNames: true,
                    labels: { 12: "Front gate" } }, FARM);                          // on, one renamed
strip.postMessage({ type: "previews.options", labels: { 12: "" } }, FARM);          // Farm Control's name again
```

### 5.2 Live video or still pictures

The strip plays **live video** unless you choose otherwise. It can show a
**still picture** of each camera instead, fetched again every 10 seconds,
with the picture's time on it so it is never taken for live video:

- **Choose it when loading:** `&mode=pictures` in the strip's address.
- **Switch at any time,** without reloading: `{type: "previews.options",
  mode: "pictures"}` or `mode: "live"`. The cameras, names and your labels
  stay as they are.
- **Some cameras only:** `{type: "previews.options", stillCameras: [12]}`
  shows those cameras as still pictures whatever the mode, for example
  while you show camera 12 larger in your own way; `stillCameras: []` puts
  them back. Each message replaces the list.

| | Live video (default) | Still pictures |
|---|---|---|
| What the user sees | Moving video, about 1 to 2 seconds behind | A picture of the last 10 seconds, with its time |
| The farm's connection, per camera shown | About 0.35 Mbit/s | About 0.02 Mbit/s |
| Counts against the live limits (§10) | Yes | **No** |
| A click on a picture | `camera.open` | `camera.open` (open the viewer for live video) |
| `state` messages (§9.2) | `loading`, `playing`, … | `still` each time a picture arrives; `reconnecting` when the camera gives none; `denied` |

Still pictures suit a strip that stays open all day where nobody watches
it all the time (a till, a dashboard); live video suits a strip people look
at. Nothing is fetched while the page is hidden, in either mode.

```js
strip.postMessage({ type: "previews.options", mode: "pictures" }, FARM);   // stills
strip.postMessage({ type: "previews.options", mode: "live" }, FARM);       // live video again
strip.postMessage({ type: "previews.options", stillCameras: [12] }, FARM); // camera 12 as a still
strip.postMessage({ type: "previews.options", stillCameras: [] }, FARM);   // all as the mode says
```

### 5.3 Your look (from revision 4)

The frames are drawn by Farm Control, so your stylesheet cannot reach
into them. Tell them your look instead, in every frame's address: the
strip, the viewer, the player and the approvals panel.

| Option | Values | Default |
|---|---|---|
| `&theme=` | `light`, `dark` or `auto`: auto follows the operating system's light or dark setting | `auto` |
| `&accent=` | Buttons, selected items and the recorded stretches of the time bar | Farm Control's green |
| `&accentText=` | Text on accent-coloured buttons | white in light, dark in dark |
| `&bg=` | The frame's background | Farm Control's, for the theme |
| `&panel=` | Cards, lists and boxes inside the frame | Farm Control's, for the theme |

- **Colours:** six hex digits **without `#`**, for example `2563eb`.
  Anything else is ignored, so one wrong value never breaks a frame. A
  colour left out keeps Farm Control's.
- **Text colour:** set by the theme, so with `bg` and `panel` choose the
  matching `theme` (a dark background with `theme=dark`).
- **Unchanged:** the colours that carry a meaning stay Farm Control's: a
  problem in red, motion events in yellow, protected footage in purple.

**When your user switches theme while a frame is open**, send the frame
`{type: "theme", theme, accent, accentText, bg, panel}`. It changes at
once, without a reload.
- Fields you leave out keep their value.
- An empty string (`accent: ""`) gives Farm Control's colour back.
- Send the same look to every open frame.

```js
// MBM dark, in the address:
`${FARM}/embed/v1/previews?integration=${INTEGRATION}&theme=dark&accent=2563eb&accentText=ffffff&bg=111827&panel=1f2937`
// The user switches to light; the frames follow at once:
for (const f of document.querySelectorAll("iframe.farm"))
  f.contentWindow.postMessage({ type: "theme", theme: "light", bg: "", panel: "" }, FARM);
```

## 6. Messages between your page and the frames

JSON objects `{type, ...}` by `postMessage`. Accept a message only when
`event.origin` is exactly the Farm Control address; send only to that
origin, never `"*"`.

From the frames:

| `type` | Fields | Meaning |
|---|---|---|
| `ready` | `page`: previews, modal, player, approvals | Send an `assertion` |
| `assertion.needed` | | Send a fresh `assertion` |
| `camera.open` | `cameraId`, `name`, `site` | The user clicked a preview: show the viewer for it (or do what your design wants) |
| `modal.closed` | `cameraId` | The user closed the viewer inside the frame: remove the frame |
| `state` | `cameraId`, `code` (§9.2) | A window's state changed |
| `previews` | `cameraIds`, `cameras: [StripCamera]` (§8) | The cameras the strip now shows, in order, with their names and sites (after loading, after `previews.set`, or the user's pins) |
| `session.ended` | `reason`: signed-out, expired, access-changed, integration-disabled | The frame stopped |
| `resize` | `height` | Preferred height in pixels, a suggestion (useful for the approvals panel; the strip fills whatever size you give it) |
| `device.changed` | `deviceId`, `state` | An approval action was done in the approvals panel |
| `camera.alert` | `cameraId`, `name`, `site`, `trigger` (motion, sound, both), `at`, `start` (null while going on) | From the strip, with `cameraAlerts` (revision 5): one of the user's alerting cameras found something. Show your own banner, badge or sound. Once per thing found |
| `player.position` | `cameraId`, `at` (ISO time) | From the clip player (§5, revision 6): the time the video has reached. About once a second while it plays, and once soon after each start or seek |

To the frames:

| `type` | Fields | Meaning |
|---|---|---|
| `assertion` | `assertion` | After `ready` and `assertion.needed` |
| `previews.set` | `cameraIds` (at most 4) | Show these cameras in the strip, in this order. Cameras the user may not watch live are left out and reported in the `previews` reply |
| `previews.options` | `showNames` (true or false), `labels` (`{cameraId: text}`), `mode` (`live` or `pictures`), `stillCameras` (camera ids), `alertSound` (true or false, revision 5); any of them | Names on the strip's pictures on or off, your own names for cameras (§5.1), live video or still pictures, and single cameras as still pictures (§5.2), Farm Control's chime for camera alerts (§5); at once, without reloading |
| `visibility` | `visible` | Your area with the frame is shown or hidden |
| `player.seek` | `at` (ISO time), `until` (ISO time, optional) | To the clip player (§5, revision 6): play from `at`, up to `until` (or 2 minutes), without reloading. A `until` not after `at` is left out; without a usable `at`, and to any other frame, it is ignored |
| `theme` | `theme` (`light`, `dark`, `auto`), `accent`, `accentText`, `bg`, `panel` (six hex digits); any of them | Your look changed: the frame follows at once (§5.3, from revision 4) |
| `close` | | End the frame's sessions at once (before removing it, and on sign-out) |

A host page sketch:

```html
<iframe id="farm-strip" allow="autoplay; fullscreen" title="Farm cameras"
        style="width:100%;height:180px;border:0"></iframe>
<div id="farm-viewer-holder"></div>
<script>
  const FARM = "https://FARM_CONTROL", INTEGRATION = "INTEGRATION_ID";
  const assertion = async () => (await fetch("/farm-control/assertion", { cache: "no-store" })).text();
  // The user's own choice of up to four cameras, from your settings:
  document.getElementById("farm-strip").src =
    `${FARM}/embed/v1/previews?integration=${INTEGRATION}&cameras=${myChosenCameraIds.join(",")}`;

  function openViewer(cameraId) {
    closeViewer();
    const f = Object.assign(document.createElement("iframe"), {
      id: "farm-viewer", allow: "autoplay; fullscreen", title: "Farm camera",
      src: `${FARM}/embed/v1/modal?integration=${INTEGRATION}&camera=${encodeURIComponent(cameraId)}`,
    });
    f.style.cssText = "width:100%;height:70vh;border:0";
    document.getElementById("farm-viewer-holder").append(f);
  }
  function closeViewer() {
    const f = document.getElementById("farm-viewer");
    if (f) { f.contentWindow.postMessage({ type: "close" }, FARM); f.remove(); }
  }
  window.addEventListener("message", async (e) => {
    if (e.origin !== FARM || typeof e.data !== "object") return;
    const m = e.data;
    if (m.type === "ready" || m.type === "assertion.needed")
      e.source.postMessage({ type: "assertion", assertion: await assertion() }, FARM);
    else if (m.type === "camera.open") openViewer(m.cameraId);
    else if (m.type === "modal.closed") document.getElementById("farm-viewer")?.remove();
  });
  // Later, when the user picks other cameras in your screens:
  // document.getElementById("farm-strip").contentWindow.postMessage({ type: "previews.set", cameraIds: [3, 9] }, FARM);
</script>
```

## 7. The API

Base: `https://FARM_CONTROL/api/integration/v1`. JSON in and out, UTF-8.
Every call except `POST /session` carries `Authorization: Bearer <token>`.
Called from your page in the user's browser: Farm Control answers
cross-origin requests only from your registered origins. Times are RFC 3339
in UTC. Lists page with `limit` (default 50, at most 200) and `offset`, and
answer `total`.

Every camera call is checked: your integration is on and the feature is on;
the user is linked and active; the camera is at one of your integration's
sites; the user has the permission on it. A camera that fails the site or
any-permission check is **404**, never "forbidden": you cannot tell it from
one that does not exist.

### 7.1 Session

| Call | Body | Answer |
|---|---|---|
| `POST /session` | `{assertion}` | `{token, expiresAt, user {name}, integration {name}, features}` |
| `POST /session/renew` | `{assertion}` | `{expiresAt, features}`: the same token, a new `expiresAt` |
| `DELETE /session` | | 204; this session and what was opened through it end. Each frame has its own session: send the frames `close` too (§6) |

### 7.2 Features

`GET /features` → `{features {viewing, recordings, controls, capture,
configuration, deviceApprovals, alerts, cameraAlerts, twoWayAudio}}`, each `on`, `off` (the farm
has not switched it on for your integration) or `unavailable` (not in this
Farm Control release). What this user may do on each camera is in the
camera's `may` (§8).

### 7.3 Sites and cameras

| Call | Answer |
|---|---|
| `GET /sites` | `{sites: [Site]}`: the user's sites within your integration's |
| `GET /cameras?q=&site=&state=&may=&limit=&offset=` | `{cameras: [Camera], total, offset, limit}`. `q` part of a name; `site` a site id; `state` receiving, connecting, offline, off; `may` one of live, recordings, control, configure (only cameras the user may do that on); `alerting=true` only the user's alerting cameras (revision 5, §7.12). Sorted by site, then name |
| `GET /cameras/{id}` | `Camera` |
| `GET /cameras/{id}/picture` | A still JPEG of the camera now (about 640 pixels wide; at most one new picture per camera every 10 s, otherwise the last one). Needs live or recordings. For your search screens and lists, not for video |

### 7.4 Previews

| Call | Answer |
|---|---|
| `GET /previews` | `{cameraIds}`: the user's default strip (pinned, then recent) |
| `PUT /previews/pins/{cameraId}` / `DELETE` | Pin or unpin a camera for the user's default strip |

### 7.5 Recordings (`recordings`)

| Call | Answer |
|---|---|
| `GET /cameras/{id}/timeline?from=&to=` | `{known, periods: [{from, to, kind}], events: [{id, start, end}]}`; kind recorded, no-motion, recording-off, not-scheduled, gap; default the last 24 hours, at most 7 days, cut to how far back the user may look; `known: false` with a `reason` when it cannot be said |
| `GET /cameras/{id}/coverage` | The last 24 hours: `{known, coverage {oldest, newest, from, to, percent, gaps: [{from, to}]}}` |
| `GET /events?from=&to=&site=&camera=&limit=&offset=` | `{from, to, events: [MotionEvent], total, offset, limit, more, notes}`, newest first, across the cameras the user may view recordings of; default today, at most 7 days; `notes` say which cameras were left out and why (for example outside the user's hours). Optional (added 2026-11-06): `&trigger=motion` (events with movement) or `&trigger=sound` (with sound) |

Play recordings in the viewer or the player frame (`mode=recordings&at=`).

### 7.6 Camera control (`controls`)

| Call | Body | Answer |
|---|---|---|
| `POST /cameras/{id}/control-session` | | `{id, expiresAt, pan, tilt, zoom, presets: [{token, name}]}`; 409 when the camera cannot move |
| `POST /control-sessions/{id}/commands` | `{action: "move", pan, tilt, zoom}` (each -1 to 1, 0 still), `{action: "stop"}` or `{action: "preset", preset}` | 204; 409 for an axis or preset the camera does not have |
| `POST /control-sessions/{id}/renew` | | `{id, expiresAt}`; every 20 s while your controls are open |
| `DELETE /control-sessions/{id}` | | 204; the camera is told to stop |

A move lasts one second: send it again every 600 ms while your button is
held, and `stop` when it is let go. The camera stops by itself if your page
goes away.

### 7.7 Capture (`capture`)

| Call | Body | Answer |
|---|---|---|
| `POST /cameras/{id}/downloads` | `{from, to}` | `{id, state: preparing}`; checked against the user's longest clip and daily allowance at the site (403 with why) |
| `GET /downloads/{id}` | | `{state: preparing, ready or failed, bytes, url}`; `url` (when ready) is a one-time link for this user, valid 5 minutes: open it in the browser to save the MP4 |
| `GET /cameras/{id}/protected` | | `{protected: [{id, from, to, reason, state, bytes}]}` |
| `POST /cameras/{id}/protected` | `{from, to, reason}` | Keeps that stretch out of the reach of deletion (the user's protect permission) |
| `DELETE /cameras/{id}/protected/{protectedId}` | | 204 |

Recording live video (at most 5 minutes, or the user's own longest clip if
shorter) and taking pictures are in the viewer and in a player with
buttons (§5; not with `capture=0`) (they are
made in the user's browser and saved as downloads; each counts like a
download).

### 7.8 Configuration (`configuration`)

Each call needs the user's permission in Farm Control (manage recording for
the first five, manage cameras for the last) and is audited.

| Call | Body |
|---|---|
| `PUT /cameras/{id}/recording` | `{recording: true or false}` |
| `PUT /cameras/{id}/recording-mode` | `{mode: "continuous", "motion" or "" (follow the site)}` |
| `PUT /cameras/{id}/recording-schedule` | `{ranges: [{days [0-6, Sunday 0], from "HH:MM", to "HH:MM"}], clear}`: site time; empty ranges record always; `clear` follows the site's schedule again |
| `PUT /cameras/{id}/keep` | `{hours, confirm}`: how long recordings are kept. A shorter time that would delete recordings answers 409 `{wouldDelete {from, to, bytes}}` until sent again with `confirm: true` |
| `PUT /cameras/{id}/motion` | `{detect, sensitivity (above 0 to 1), minEventMs, endAfterMs, beforeS, afterS, masks: [{x, y, w, h} as fractions of the picture]}`. Optional (added 2026-11-06): `sound`: `off`, `quiet`, `normal` or `loud` (listen for sound too); left out, it stays as it is. Optional (added 2026-11-21): `follow: [names]` returns those values to the camera's site (the others sent become the camera's own, as before); `GET` adds `settings.from` per value (`camera`, `site` or `system`) |
| `PATCH /cameras/{id}` | `{name, notes}` only |

Answer: the `Camera` (§8). `GET /cameras/{id}/settings` answers the current
values of all of these: `{recording {keepHours, from (camera, site or
system), own, site, system, recordingEnabled, modes, mayChange}, motion
{detect, sensitivity, minEventMs, endAfterMs, beforeS, afterS, masks, sound}}`.

### 7.9 Device approvals (`deviceApprovals`)

The assertion must hold `device-approvals` in `perm`, and the user needs
the matching site permissions in Farm Control.

| Call | Body | Answer |
|---|---|---|
| `GET /devices?site=&state=&q=&limit=&before=` | | `{devices: [Device], next}`, newest first; `state` pending (the approvals queue), approved, blocked, revoked, expired; for the next page pass `next` as `before` (0: no more) |
| `GET /sites/{id}/profiles` | | `{profiles: [{id, name}]}`: what an approved device may reach |
| `POST /devices/{id}/approve` | `{profileId, until, notCamera: true, reason}` | `Device`. `notCamera` must be true: the person confirms it is not a camera (cameras are registered in Farm Control, not approved) |
| `POST /devices/{id}/block` | `{reason}` | `Device` |
| `POST /devices/{id}/revoke` | `{reason}` | `Device` |
| `POST /devices/{id}/reopen` | `{reason}` | `Device`: discovery window open again |

Only devices on the Farm-Devices Wi-Fi that are not cameras are listed and
changed through the integration. These are for a person on Farm Control's
own Approvals screen, and are refused with `403 not-allowed`:

- a device that has not sent a usable network ID (`fingerprint` false,
  §8);
- a device seen on the camera network;
- a camera.

The approvals frame shows "approve it on Farm Control's Approvals screen"
next to such a device.

### 7.10 Two-way audio (`twoWayAudio`, §1.2)

In the viewer frame only (the microphone is asked for there). No API call.

### 7.11 Alerts (`alerts`, from revision 4)

Farm Control opens an alert when it sees something wrong and resolves it
by itself once it is right again; it looks every 30 seconds. These are the
alerts **this user** would see on Farm Control's Alerts page, at your
integration's sites only, so you can pass them on in your own notifications.
The server's own alerts (its disk, its certificate, its recorder) are never
given.

| Call | Answer |
|---|---|
| `GET /alerts` | `{alerts: [Alert], next, now}`: the open alerts, newest first |
| `GET /alerts?changedSince=2026-11-01T10:00:00Z` | Every alert that opened, came back or resolved at or after that time, open or resolved |
| `GET /alerts?state=resolved&before=&limit=` | The resolved ones, newest first; for the next page pass `next` as `before` (0: no more) |

**Keeping your notifications up to date**, from your server:
1. Sign the user in (§4.4) and call `GET /alerts` once. Keep `now` from the
   answer: it is Farm Control's own clock, so yours may differ.
2. About once a minute, call `GET /alerts?changedSince=<the now you kept>`
   and keep the new `now`.
   - `state` **open**, not seen before: notify.
   - `state` **resolved**: clear or update your notification.
3. The time you pass is included, so an alert may come twice. Recognise it
   by `id` and `changedAt`. None is missed.

Your server may sign in any linked user at any time to do this (§4.4),
also while that user is not using your application. Each alert has an `id`
that stays the same when it comes back soon after it resolved (`times`
counts how often).

### 7.12 Camera alerts (`cameraAlerts`, from revision 5)

Each user chooses **their own** cameras to be told about when that camera's
detector finds **movement**, a **sound**, or **either**. It is the same list
as in Farm Control itself: chosen in your application, it shows there with
the 🔔, and the other way round, so a person is never alerted twice. Only a
camera the user may watch live or see the recordings of (`may.alert`), and
only while motion detection is on for it at the farm. Each choice made
through your integration is audited (§11).

| Call | Body | Answer |
|---|---|---|
| `PUT /cameras/{id}/alert` | `{what}`: `motion`, `sound` or `any` | The `Camera` (§8), with `alert` |
| `DELETE /cameras/{id}/alert` | | The `Camera`, without `alert` |
| `GET /cameras?alerting=true` | | The user's alerting cameras (§7.3) |
| `GET /camera-events?since=<now kept>` | | `{now, goingOn: [CameraFinding], events: [CameraEvent]}` |
| `GET /camera-events/{id}/picture` | | The event's picture (JPEG, about 320 wide), as its `pictureUrl` says; 404 when there is none |

`goingOn` is what the alerting cameras are finding **at this moment**;
`events` are those **kept since** `since` (at most an hour back; without
`since`, the last minute), which need **recordings** on the camera (with
live only, a user is told only from `goingOn`). Only what each alert is
for: a camera chosen for sound gives no movement.

**Telling your user**, from your server, for each user who wants it:
1. Sign the user in (§4.4) and call `GET /camera-events` once. Keep `now`:
   it is Farm Control's own clock. Treat what is in this first answer's
   `events` as already known.
2. Every **5 to 10 seconds**, call `GET /camera-events?since=<the now you
   kept>` and keep the new `now`.
   - A camera in `goingOn` that was not there in your last answer: notify
     ("Movement at Gate now"). Not again while it stays there.
   - An event in `events` with an `id` you have not seen: if you notified
     that camera from `goingOn` a little before its `start`, it is the same
     thing (update your notification with its time); otherwise notify.
3. An event may come twice (the time you pass is included): recognise it
   by `id`. None is missed.

Your notification can carry the picture Farm Control took when the
camera started finding it (the event's `pictureUrl`; for something still
going on, the camera's picture now, `GET /cameras/{id}/picture`, §7.3)
and, when tapped, open the viewer at the
moment: `/embed/v1/modal?integration=&camera=&tab=recordings&at=<start
minus 5 s>`. Your server may do this while the user is not using your
application, so they are told also with your application closed.

While a preview strip is open in your page, it tells your page too
(`camera.alert`, §6), with no polling of your own.

**Paused in Farm Control** (from rc201). In Farm Control's own alert list a
user can pause their alerts from a camera for a while (🔕), and resume
them later. While paused, that camera is **as if not alerting** for your
integration too: its `Camera` has no `alert`, `GET /cameras?alerting=true`
leaves it out, and `GET /camera-events` and `camera.alert` say nothing
about it; nothing found while paused comes later. `PUT /cameras/{id}/alert`
on it resumes it with the `what` you send, and `DELETE` turns it off as for
any camera. Nothing changes in the calls or objects.

## 8. Objects

**Site:** `{id, name, timeZone}`.

**Camera:**

```json
{
  "id": 12, "name": "Yard east", "notes": "",
  "site": { "id": 3, "name": "Home farm" },
  "state": "receiving",
  "recording": { "on": true },
  "capabilities": { "pan": true, "tilt": true, "zoom": true, "presets": 4, "twoWayAudio": false },
  "may": { "live": true, "recordings": true, "export": false, "protect": false,
           "control": true, "talk": false, "configure": false, "rename": false },
  "pinned": false
}
```

With `cameraAlerts` on (revision 5), `may` has `alert` (the user may
choose this camera for alerts) and the camera has `alert` (`motion`,
`sound` or `any`) when the user gets alerts from it, absent when not.

`state`: receiving (video arriving), connecting, offline (the camera does
not answer), off (turned off in Farm Control), unknown. `may` already takes
the features into account: an action whose feature is off is `false`.
Never present: the camera's address, stream paths, user name or password.

**MotionEvent:** `{id, cameraId, cameraName, siteId, siteName, start,
end}`. Added 2026-11-06 (DEVIATION 48; v1 is unchanged, ignore what you do
not use): `trigger` (what set it off: `motion`, `sound`, or `both` at
once; events from before then are `motion`) and `loudness` (the loudest
sound in it, dBFS, only when sound was part of it).

**CameraFinding** (§7.12, revision 5): `{cameraId, name, site {id,
name}, trigger}`: `trigger` is what it is finding, `motion`, `sound` or
`both`. **CameraEvent**: `{id, cameraId, name, site {id, name}, trigger,
start, end, pictureUrl}`; `pictureUrl` (absent when there is none) is the
picture Farm Control took when the camera started finding it, about 320
pixels wide: `GET` it with the user's token (§7.12).

**StripCamera** (in the strip's `previews` message): `{cameraId, name,
site}`: Farm Control's name for the camera and its site's name, never your
labels.

**Device:** `{id, mac, siteId, name, hostname, ips, authorization (pending,
approved, blocked, revoked, expired), verification, connection, lastSeenAt,
discoveryUntil, onFarmDevices, vendorClass, stateReason, fingerprint}`.
`fingerprint` is true when the device sent a usable network ID. When it is
false, the device is approved only on Farm Control's Approvals screen
(§7.9).

**Alert** (§7.11, revision 4):

```json
{
  "id": 41, "kind": "camera.problem", "level": "bad", "state": "open",
  "message": "Yard east (Home farm): The camera refused the login.",
  "siteId": 3, "siteName": "Home farm",
  "subject": { "kind": "camera", "id": 12 },
  "openedAt": "2026-11-01T10:02:30Z", "lastSeenAt": "2026-11-01T10:20:00Z",
  "changedAt": "2026-11-01T10:02:30Z", "resolvedAt": null,
  "times": 1, "parentId": null
}
```

- **`kind`:**
  - `camera.problem`: a camera with a problem, or not heard from;
  - `site.unreachable`: nothing arrives from the site; its cameras may be
    fine;
  - `site.node-silent`: the site's gateway node is silent, but video still
    arrives;
  - `node.failing`;
  - `site.approvals`: devices waiting for approval;
  - `site.fingerprints`: approved devices held back by the network ID check.

  More kinds may be added: show the `message` of a kind you do not know.
- **`level`:** `bad` means something is broken; `warn` means it needs a
  look.
- **`state`:** `open` or `resolved`.
- **`subject`:** what it is about, a `camera`, `site` or `node`, with its
  id.
- **`message`:** a sentence for people, never an address or a password.
- **`parentId`:** a camera at a site that cannot be reached is grouped
  under the site's alert, so you can notify about the site once rather
  than about each camera.
- Each user sees only what they may see in Farm Control: a camera's
  alerts if they may see the camera, devices waiting if they may approve
  devices.

## 9. Errors and window states

### 9.1 API answers

`{error, code, reason?, retryAfter?}`.

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `bad-request` | A field is wrong; `reason` says which |
| 401 | `session-ended` | Sign in again with a new assertion (once) |
| 403 | `feature-off` | The farm has not switched the feature on for you |
| 403 | `not-allowed` | The user may see the camera but not do this; or a limit at the site (`reason`) |
| 404 | `not-found` | No such camera or device for this user through your integration |
| 410 | `not-found` | A download link already used, or older than 5 minutes |
| 409 | `not-supported` | The camera cannot do it (an axis, a preset), or a confirmation is needed (`wouldDelete`) |
| 429 | `limit` | Too many sessions; `retryAfter` seconds |
| 502 | `camera-not-answering` | The camera did not answer a control |
| 503 | `unavailable` | Farm Control's video service is not available now |

### 9.2 Window states in the frames (`state` messages)

`{type: "state", cameraId, code}`, `code` one of: `loading`, `playing`,
`paused` (the page hidden for 10 seconds; in the strip also a camera open
in the viewer or a live player, showing its still picture; from the clip
player, revision 6, with `reason`: `user` when the user clicked the video,
`hidden` when your page hid it), `reconnecting` (no picture for
the moment; retried for about 2 minutes, the reason shown on the picture),
`denied` (the user may no longer watch it), `limit` (too many cameras open,
§10), `ended` (stopped; the reason shown on the picture; from the clip
player also at `until`, at each 2 minutes, and where the recording ends), `still` (a still
picture arrived, in a strip showing still pictures, §5.2). A frame never
shows a still picture as if it were live: each one carries its time.

## 10. Limits

| Limit | Default |
|---|---|
| Live pictures in preview strips per user | 4 |
| Viewers and players per user, together (live or recordings) | 2 at once by default (1, plus 1 so a viewer can switch streams without a gap); the farm can set 3. One more gets `limit` |
| Live sessions for your integration, all users | set by the farm (starts at 16) |
| API calls | No fixed rate in version 1: call for what your screens show, not in a tight loop (a later version may answer too many with 429 `limit` and `retryAfter`) |
| `GET /camera-events` | Once every 5 seconds per user (revision 5): asked sooner, 429 `limit` with `retryAfter` (seconds) and a `Retry-After` header |
| Session length | 15 minutes, renewed with a fresh assertion |
| Assertion | 60 seconds, once |

A preview uses about 0.35 Mbit/s of the farm's connection, full quality
about 5 Mbit/s (a player with `quality=small` uses about 0.35 Mbit/s).
A viewer or player playing recordings counts like a live one (it plays
from the recorder); still pictures (§5.2) count against none of these
limits. A strip of **still pictures** (§5.2) uses about 0.02 Mbit/s
per camera and counts against none of these limits.

**The live-session limit for your integration** counts every live picture
open through it at once: each strip preview and each open viewer or player
(live or playing recordings). Pictures
on a hidden page pause after 10 seconds and free their places, and so does
a strip you hide with `visibility` (§6). The farm sizes it at about **5 per
user watching at the same time** (4 previews and a viewer); tell your
FarmNet contact how many of your users will watch at once. When it is
reached, the extra picture says "Waiting for a free place…", then "Too many
cameras are open" (`state` `limit`, §9.2).

## 11. Privacy, security and audit

- Farm Control's audit records every sign-in, view (with how long), playback,
  control, capture, configuration change and approval through your
  integration: your integration, the Farm Control user, your user id, the
  camera or device, what and when. Refusals too. Never assertions, tokens or
  passwords.
- The farm can turn your integration or any feature off, remove a site,
  unlink a user, or remove a key or origin at any time; it takes effect
  within seconds (frames show `ended` or `denied`, the API answers 401, 403
  or 404).
- Farm Control system administrators cannot be linked to an integration.
- Keep tokens in memory; send them only to the Farm Control address.

## 12. Testing your side

With a test integration for your staging origin and one or two linked test
users:

1. The preview strip plays your chosen cameras; `previews.set` changes them;
   `previews.options` turns the names off and on and shows your own names,
   and the `previews` message lists the cameras' names; `mode=pictures` and
   `previews.options` `mode` switch between live video and still pictures
   (each picture with its time, `state` `still`); `stillCameras` turns
   single cameras to stills; a camera opened in the viewer shows its still
   in the strip until the viewer closes.2. A click opens the viewer; closing it removes it; the preview resumes.
3. `GET /cameras` lists the test user's cameras; a search narrows it; a
   camera id the user cannot see answers 404.
4. A feature still off answers 403 `feature-off`, and its buttons are not in
   the frames.
5. A user you have not asked to be linked: `POST /session` answers 401.
6. Withdraw a test user's permission in your application: their session ends
   at the next renewal; sign-out (`close`, `DELETE /session`) ends it at
   once.
7. An assertion reused, expired, or signed with the wrong key: refused.
8. A page on an origin you did not register: no frames, API calls refused.
9. Each feature the farm switched on for you: the calls in §7 you use.
10. A viewer or player with `capture=0` has no Record, Take picture,
    Download clip or Protect, but keeps full quality and camera control; a
    player with `controls=0&quality=small` plays the small stream.
11. The clip player (`mode=recordings&controls=0&at=&until=`): only the
    video; it stops at `until` with `ended`; `player.position` comes about
    once a second and follows a click to pause (`paused`, `reason` `user`);
    `player.seek` plays another time without a reload and without a second
    place (§10); a user without recordings gets `denied`.

Farm Control has a reference host page for its administrators that shows
the frames and calls the API with a test user, so a problem can be placed
on the farm's side or yours.

## 13. Quick reference

| | |
|---|---|
| Frames | `/embed/v1/previews?integration=&cameras=&names=&mode=&alertSound=`, `/embed/v1/modal?integration=&camera=&capture=&alerts=`, `/embed/v1/player?integration=&camera=&mode=&controls=&capture=&quality=&at=&until=`, `/embed/v1/approvals?integration=` |
| API base | `/api/integration/v1`, `Authorization: Bearer <token>` |
| Assertion | JWT EdDSA, `kid`; `iss`, `aud`, `sub`, `perm`, `iat`, `exp` (≤ 60 s), `jti`, `name` |
| Features | viewing, recordings, controls, capture, configuration, deviceApprovals, alerts, cameraAlerts, twoWayAudio |
| Alerts | `GET /alerts`, `?changedSince=` with the last answer's `now`, `?state=resolved` (§7.11) |
| Camera alerts | `PUT`/`DELETE /cameras/{id}/alert`, `GET /camera-events?since=` with the last answer's `now`, at most every 5 s; `GET /camera-events/{id}/picture` (§7.12) |
| Look (every frame) | `&theme=light\|dark\|auto&accent=&accentText=&bg=&panel=` (six hex digits, no #); the `theme` message (§5.3) |
| Messages in | `assertion`, `previews.set`, `previews.options`, `visibility`, `theme`, `close`, `player.seek` |
| Messages out | `ready`, `assertion.needed`, `camera.open`, `modal.closed`, `state`, `previews`, `session.ended`, `resize`, `device.changed`, `camera.alert`, `player.position` |
| Never | camera addresses, passwords, stream addresses; adding or removing cameras; access rules; users |
