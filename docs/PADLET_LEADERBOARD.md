# Padlet leaderboard configuration

The web game sends leaderboard requests to `/api/leaderboard`. The server route
holds the Padlet credential and calls the Padlet API, so the API key is never
included in the Godot web export.

Configure these Vercel environment variables for Production, Preview, and
Development:

- `PADLET_API_KEY`: API key generated from Padlet developer settings.
- `PADLET_BOARD_ID`: ID of a board administered by the API-key owner (16–22
  characters). A full Padlet board URL is also accepted.
- `PADLET_SECTION_ID`: Optional section ID. Leave unset to use the board's
  default placement.

Only the current board is read with `GET /v1/boards/{board_id}?include=posts`
on a ranking request. Each completed game is written only to that board with
`POST /v1/boards/{board_id}/posts`. Only posts containing the
`DINO_FRACTION_LEADERBOARD_V1` marker and the expected board-specific season ID
are used for rankings, so unrelated Padlet posts are ignored. Historical records
from the first two boards were frozen into
`src/lib/leaderboard-legacy-archive.json` on 2026-09-12: 13,009 game posts were
reduced to the latest snapshot for each of 1,695 players. The archive contains
hashed player IDs (not the original IDs), nickname, school, score, XP, and time.
The live board player IDs are hashed the same way to merge matching players.
The highest score is kept, and correct-answer XP from both seasons is added
without double-counting the high-score bonus.

The write board is `https://padlet.com/inkun02/3-s023i9sy71hjijvegv2q`
(`PADLET_BOARD_ID=s023i9sy71hjijvegv2q`). The two read-only earlier boards are
`https://padlet.com/inkun02/padlet-7pv4dzymsdgcg867` and
`https://padlet.com/inkun02/2-s0237u2egsga2p3e4l7c`. Their Padlet posts are
untouched. `PADLET_LEGACY_BOARD_IDS` is no longer used by the application and
can be removed from Vercel. New game posts use `padlet_v2_20260912`. Older game
builds cannot write their previous-season totals to the current board.

To rebuild the historical archive after an intentional change to either old
board, obtain a one-time server export of both boards and run
`node scripts/build_legacy_leaderboard_archive.mjs <export-file.json>`.
Never commit the raw export: it contains un-hashed player IDs and duplicate
posts. The generated archive is the only historical dataset needed at runtime.
