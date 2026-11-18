# Data files

* `airports.ts` — public airport reference data (name, city, country, IATA, timezone) for search
  autocomplete. Contains no lounge information. Extend freely.
* `lounges.json` — used only when `LOUNGE_PROVIDER=file`. Add lounges **copied from an authorized
  LoungeKey source** (e.g. the LoungeKey Pass Agent Web Portal). Never guess: omit any field the source
  does not provide and the site will show "Information unavailable". Commit + redeploy to publish.

```json
[
  {
    "id": "LK-REF-FROM-LOUNGEKEY",
    "airport": "CGK",
    "name": "Lounge name exactly as in LoungeKey",
    "terminal": "3",
    "location": "Airside — after immigration, near gate …",
    "openingHours": "24 hours",
    "description": "…",
    "facilities": ["Wi-Fi", "Food and beverages", "Showers"],
    "images": ["https://… (only images you are licensed to use)"],
    "conditions": "Max stay 3 hours. Boarding pass required.",
    "accessInfo": "Present voucher + boarding pass at reception."
  }
]
```
