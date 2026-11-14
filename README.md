# Study Catalogue

A personal catalogue of research studies: enter a study once, then find it again by search and filters and copy a
citation. See `CLAUDE.md` for the commands and the code's layout.

## Running at Home

By default the catalogue lives inside one browser's localStorage. The home server keeps it in a file instead, on the
PC, and serves the app, so any device on the home network opens the same catalogue.

**There is no password.** The server is meant for a home network behind the router's firewall; anyone who can reach
its port can read and replace the catalogue. Never forward the port to the internet.

### Build and run

```sh
npm run build:home          # typechecks and builds the app (dist/) and the server (dist-server/)
npm run home:serve          # runs the server in this terminal; Ctrl+C stops it
```

`npm run home` does both in one go. To run it in the background and at every login, use the systemd user unit:

```sh
mkdir -p ~/.config/systemd/user
cp infra/study-catalogue.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now study-catalogue
systemctl --user status study-catalogue          # is it running?
journalctl --user -u study-catalogue -f          # one line per request, never any catalogue content
```

The unit assumes the repository is at `~/repos/studyCatalogue`. To have it start at boot without logging in, run
`sudo loginctl enable-linger $USER`. After pulling changes, run `npm run build:home` and
`systemctl --user restart study-catalogue`.

### Opening it

On the PC: <http://localhost:5185>. From another device: `http://<the PC's address>:5185`, for example
`http://192.168.0.2:5185`. The app asks the address it was loaded from for `/api/catalogue`; when the home server
answers, Settings says the catalogue is stored in "This Home Server". Opened from the dev server (`npm run dev`) or
any other host, the app uses the browser's storage as before, so the two never mix.

Settings can be changed with flags or environment variables (flags win): `--data-dir` / `STUDY_CATALOGUE_DATA_DIR`
(default `~/.local/share/studyCatalogue`), `--port` / `STUDY_CATALOGUE_PORT` (5185), `--host` /
`STUDY_CATALOGUE_HOST` (0.0.0.0, every interface), `--dist-dir`, `--body-limit-bytes` (32 MiB). For the unit, put
`Environment=...` lines in it.

### Where the data is

- `~/.local/share/studyCatalogue/catalogue.json`: the catalogue and its revision number.
- `~/.local/share/studyCatalogue/versions/`: a copy of each save, named `<time>-r<revision>.json` (UTC). The server
  keeps the 20 newest saves and the last save of each of the past 60 days (UTC days), and deletes the rest.

Every save is written to a temporary file, flushed, and renamed over the old one, so a crash cannot leave a half
file. A data file the server cannot read stops it at startup with a message; it is never overwritten.

### Restoring an earlier version by hand

```sh
systemctl --user stop study-catalogue
cp ~/.local/share/studyCatalogue/catalogue.json ~/catalogue-before-restore.json    # keep what is there, just in case
cp ~/.local/share/studyCatalogue/versions/2026-11-14T08-30-00.123Z-r12.json ~/.local/share/studyCatalogue/catalogue.json
systemctl --user start study-catalogue
```

Then reload the app on every device. A device that still has the newer catalogue open and edits it will merge its
copy back in (a merge only adds), so reload before editing.

### Moving an existing browser catalogue to the home server

1. In the old browser (the one that holds the catalogue), open Settings and choose "Download a backup".
2. Open the home server's address (see above) in any browser and go to Settings.
3. Under "Add a backup to this catalogue", choose the downloaded file and confirm.

The home server's catalogue now holds everything. Keep the backup file, and leave the old browser's copy alone until
you have checked the studies and tags.

### How devices share it

Every change is saved to the server within a moment. Each save says which revision it was based on; if another device
saved first, the server refuses it, the app merges the server's copy into its own with the same rules as "Add a backup
to this catalogue" (the newer edit of a study wins, tags are matched), tells you, and saves the result. When a tab
becomes visible again it picks up the server's newer copy. If the server cannot be reached, the app keeps your
changes in the page, shows a warning, and retries until it works: keep the page open until the warning is gone.

One limit: a merge only adds, so a study or tag deleted on one device can come back when another device that still held
it saves.
