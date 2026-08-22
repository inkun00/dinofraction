# Padlet leaderboard configuration

The web game sends leaderboard requests to `/api/leaderboard`. The server route
holds the Padlet credential and calls the Padlet API, so the API key is never
included in the Godot web export.

Configure these Vercel environment variables for Production, Preview, and
Development:

- `PADLET_API_KEY`: API key generated from Padlet developer settings.
- `PADLET_BOARD_ID`: ID of a board administered by the API-key owner (16–22
  characters).
- `PADLET_SECTION_ID`: Optional section ID. Leave unset to use the board's
  default placement.

The board is read with `GET /v1/boards/{board_id}?include=posts`. Each completed
game is written with `POST /v1/boards/{board_id}/posts`. Only posts containing
the `DINO_FRACTION_LEADERBOARD_V1` marker and the active season ID are used for
rankings, so unrelated Padlet posts are ignored.
