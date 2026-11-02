# 0018 — Picture of the invoice page for signing

- **Status:** Accepted by Chris, November 1, 2026
- **Spec:** SPEC §6 ("Re-share"), §7 ("Output files"), §8 ("Signatures"). Changes §7: the PDF is no longer the only file that can be signed.

## Decision

Every "Create invoice files" and every re-share adds a fourth file, `<SOURCE>_<INVOICE#>_invoice.png`: a picture of PDF page 1 (the invoice with the signature boxes) at 200 dpi, 1700 × 2200 pixels, on a white background.

- The CHW and the reviewer sign **either** the PDF **or** the picture, not both, and send the one they signed with both CSV files.
- The PDF and both CSVs stay byte-identical when re-shared (SPEC §6). The picture is drawn with the phone's own fonts, so its pixels can differ slightly between phones, but never its content; the fingerprint and QR code on it carry the content.
- In iPhone Mail, choose **Actual Size** when attaching, so the QR code stays readable.

## Why

On the first phone tests, some CHWs and reviewers found signing a PDF on their phones hard. Every phone can mark up a picture in its photo app (Photos Markup on iPhone; Google Photos or the gallery app on Android). PNG keeps text and the QR code sharp after markup; JPEG blurs them and gets worse with each save.

## Not chosen

Signing with a finger inside the app (SPEC §11 keeps it out of scope): it needs new stored data, a fingerprint version decision and a drawing screen, and still leaves the reviewer signing outside the app. Revisit after the pilot.
