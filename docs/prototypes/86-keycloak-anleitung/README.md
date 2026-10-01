# Prototype: Keycloak guide and live check (ECCdigital/tickets#86)

Throwaway branch. It answers "how do the Keycloak form, the guide with values
to copy, „Als Text kopieren“ and the live check fit together in the tab
„Authentifizierung“?" and is kept as the primary source for that decision; it
is never merged.

## Run it

`npm run serve`, then either

- `/instance?tab=sso&variant=A|B|C` with a backend (the real tab, real form), or
- `/prototype/86-keycloak?variant=A|B|C` without a backend (stub instance).

Switch variants with the pink bar at the bottom or ←/→. The pink
„Szenario“ panel bottom left flips the stub inputs: mode (BFF/direct), values
(example, empty = SSO not set up, from the form), role mapping, login (SSO or
local), Portal-URL, BFF allowlist hints, the result the check returns,
unsaved changes, just saved.

- **A „Abschnitte“**: form, guide and check stacked as three sections. The
  guide is ordered by Keycloak object (Web-Client, Audience-Mapper,
  API-Client, Client-Rollen, Hinweise); the check is its own result table.
- **B „Checkliste“**: guide and check are one numbered checklist. A status
  card on top carries „Realm prüfen“ and „Als Text“; the form folds away
  under „Verbindung zu Keycloak“ (open while SSO is not set up). Each step
  says what to set and carries its check result; failing steps open.
- **C „Assistent“**: the tab stays the form plus a teaser card. Guide and
  check open as a full-screen step-by-step assistant; failed results jump
  back to their step.

Stubbed: the addresses (example domains, paths after #83), the check results
(`scenario.js`), clipboard copy shows the text in a dialog. The scenario
„leer“ empties only the guide, not the form.

## Verdict

Marvin-Anders picked **B „Checkliste“**, with one change: the tab
„Authentifizierung“ splits into two tabs, „Single Sign-On“ (Keycloak form,
guide, check) and „Karten“ (the card authentication, unchanged). The branch
shows that split in dev builds; B is the default variant.

## Screenshots

`A-abschnitte.png`, `B-checkliste-fehler.png`, `B-checkliste-leer-direct.png`,
`C-assistent-pruefen.png`.
