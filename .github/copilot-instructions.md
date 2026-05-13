Do not read, open, summarize, print, grep, search, edit, or reference any environment files other than `.env.local.agent`.

Forbidden files patterns include:

- `.env`
- any file matching `.env.*` except `.env.local.agent`

Never try to read live environment vars without permission.

Use `laenv; ./scripts/test-local.sh` for Docker backend testing. The first command is a bash alias that loads the agent env vars from .env.local.agent, the second brings the backend up.
