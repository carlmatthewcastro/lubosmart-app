# Philippine postal suggestions

`phlpost-postal-codes.json` contains 959 nonempty postal records retrieved from
https://phlpost.gov.ph/zip-code-locator/ on 2026-10-13. The public table contains
blank entries and does not provide a complete PSGC city/barangay mapping.

Only an exact normalized locality and province match with one distinct ZIP code
is suggested. Suggestions remain editable: a city can contain multiple postal
districts. Missing and ambiguous matches never generate a guessed code.

Refresh from downloaded official HTML with
`node scripts/import-phlpost-postal-codes.cjs <downloaded-file.html>`.
Check the source date and coverage before replacing the snapshot.
