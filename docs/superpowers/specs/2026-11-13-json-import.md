# JSON-only OpenInventory fork

User request: a separate project based on OpenInventory with JSON import in place of Steam sign-in.

Approach: keep the existing React dashboard and marketplace pricing. Replace the server account manager with persisted, named imports and normalized item rows. Remove runtime Steam login implementations/dependencies; block all Steam actions at the API. A synthetic local portfolio ID adapts to the upstream account-shaped UI; it is not a verified Steam identity.

Raw Steam app 730 context 2/16 response pages are supported, including arrays of ordered pages. Validate declared asset counts, pagination, duplicates, descriptions and quantities before replacing a portfolio. Maximum 100 pages, 20 MiB request, 20,000 expanded item units. Float, pattern and storage-unit contents are unavailable unless exported; do not invent them. Normalize and persist item rows only, never raw credential material.

Named imports survive restart, can be replaced or removed, and use existing local pricing/history. Partial price coverage must not create a history dip. Standard exports cannot verify ownership or export age. Existing Steam-data folders are not read: default data directory is ~/.openinventory-json. Bind Docker to loopback, preserve Host/Origin/JSON guards, fix malformed URL crash, disable upstream desktop auto-updates, and retain the upstream noncommercial license and attribution.
