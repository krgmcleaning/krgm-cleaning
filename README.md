# K.R.&G.M. Cleaning – weboldal

A krandgmcleaning.com új oldala (Shopify helyett): statikus HTML/CSS/JS, egy Vercel függvény az űrlapokhoz, és Supabase adatbázis.

## Felépítés
| Fájl | Mi ez |
|---|---|
| `index.html` | A főoldal (szolgáltatások, kalkulátor, kapcsolat, hírlevél) |
| `privacy.html` | Adatvédelmi oldal (`/privacy`) |
| `styles.css` | Kinézet |
| `app.js` | Kalkulátor és űrlapok. **Az árak a fájl tetején, a `PRICING` részben vannak.** |
| `api/submit.js` | Elmenti az ajánlatkéréseket és a feliratkozókat a Supabase-be, és emailt küld (Resend) |
| `supabase/migrations/` | Az adatbázistáblák |
| `vercel.json` | A régi Shopify linkek átirányítása és a cache-beállítások |

## Árak módosítása
Az `app.js` tetején a `PRICING` részben átírod a számot, commitolod, és a Vercel pár másodperc alatt kiteszi.

## Hol látod az ajánlatkéréseket?
- Supabase → `krgm-cleaning` projekt → Table Editor → `quote_requests` (a hírlevél-feliratkozók a `newsletter_subscribers` táblában vannak)
- Emailben is, ha be van állítva a `RESEND_API_KEY` és a `NOTIFY_EMAIL`

## Környezeti változók (Vercel → Settings → Environment Variables)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` – már be vannak állítva
- `RESEND_API_KEY` – a resend.com-ról (ingyenes csomag)
- `NOTIFY_EMAIL` – erre a címre jönnek az értesítők
- `NOTIFY_FROM` – miután a domaint hitelesítetted a Resendben, például `KR&GM Website <quotes@krandgmcleaning.com>`
