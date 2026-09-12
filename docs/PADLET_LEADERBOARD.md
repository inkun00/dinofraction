# Padlet leaderboard configuration

The web game sends leaderboard requests to `/api/leaderboard`. The server route
holds the Padlet credential and calls the Padlet API, so the API key is never
included in the Godot web export.

Configure these Vercel environment variables for Production, Preview, and
Development:

- `PADLET_API_KEY`: API key generated from Padlet developer settings.
- `PADLET_BOARD_ID`: ID of a board administered by the API-key owner (16–22
  characters). A full Padlet board URL is also accepted.
- `PADLET_LEGACY_BOARD_IDS`: Comma-separated IDs or URLs of earlier leaderboard
  boards. These boards are read only; no new posts are written to them.
- `PADLET_SECTION_ID`: Optional section ID. Leave unset to use the board's
  default placement.

All three boards are read with `GET /v1/boards/{board_id}?include=posts`. Each
completed game is written only to the current board with
`POST /v1/boards/{board_id}/posts`. Only posts containing the
`DINO_FRACTION_LEADERBOARD_V1` marker and the expected board-specific season ID
are used for rankings, so unrelated Padlet posts are ignored. A player's latest
snapshot from each season is merged: the highest score is kept, and correct-answer
XP from both seasons is added without double-counting the high-score bonus.

The write board is `https://padlet.com/inkun02/3-s023i9sy71hjijvegv2q`
(`PADLET_BOARD_ID=s023i9sy71hjijvegv2q`). The two read-only earlier boards are
`https://padlet.com/inkun02/padlet-7pv4dzymsdgcg867` and
`https://padlet.com/inkun02/2-s0237u2egsga2p3e4l7c`
(`PADLET_LEGACY_BOARD_IDS=7pv4dzymsdgcg867,s0237u2egsga2p3e4l7c`).
Earlier records remain visible in the combined ranking; they are not copied or
deleted. New game posts use `padlet_v2_20260912`. Older game builds cannot write
their previous-season totals to the current board.
