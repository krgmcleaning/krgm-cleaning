# K.R.&G.M. Cleaning – weboldal

A krandgmcleaning.com új oldala (Shopify helyett): statikus HTML/CSS/JS, egy Vercel függvény az űrlapokhoz, és Supabase adatbázis.

## Felépítés (automatikus telepítés: a main ágra küldött minden módosítás magától kikerül)
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
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` – beállítva
- `RESEND_API_KEY` – beállítva (resend.com)
- `NOTIFY_EMAIL` – beállítva: krgm.cleaning@gmail.com
- `NOTIFY_FROM` – miután a domaint hitelesítetted a Resendben, például `KR&GM Website <quotes@krandgmcleaning.com>`

## Kedvezménykódok
Az `app.js` tetején, a `PRICING.discountCodes` részben vannak. Jelenleg: `WELCOME20` (20%, ezt kapja, aki a felugró ablakban vagy az oldal alján feliratkozik).
Új kód felvétele: `MYCODE: { percent: 15, label: 'Leírás' },`
