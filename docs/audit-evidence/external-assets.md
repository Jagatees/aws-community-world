# External marker asset health check

Checked: **2026-09-03 00:58:36 Singapore time** / **2026-09-02T16:58:36.077Z**\
Method: bounded HTTP `GET` requests with redirects followed, a 30-second timeout, response body discarded after transfer. No in-app browser was used.\
Scope: the known flag-code failures, both remote category placeholders, one representative Builder Profile avatar from each dataset that supplies remote portraits, and both experimental unpkg Earth textures.

## Result

- **Confirmed broken:** `https://flagcdn.com/w80/fx.png` and `https://flagcdn.com/w80/uk.png` both return **404 text/html** with no redirect.
- **Confirmed working replacements:** `https://flagcdn.com/w80/fr.png` and `https://flagcdn.com/w80/gb.png` return **200 image/png** with `Access-Control-Allow-Origin: *`.
- Both remote category placeholder logos returned **200 image/png**.
- All four representative `avatars.builderprofile.aws.dev` URLs returned **200 image/jpeg**. The `.webp` URL suffix does not match the response media type, but the payload is a valid browser-decodable image response.
- Both unpkg Earth textures returned **200** after one redirect to `three-globe@2.45.2`, with permissive CORS and `Cross-Origin-Resource-Policy: cross-origin`.
- The unpkg texture bodies are byte-for-byte identical to the two local files already shipped in `public/textures/`. The experimental view can use the local assets with no visual change.

## HTTP results

`ACAO` is `Access-Control-Allow-Origin`; `CORP` is `Cross-Origin-Resource-Policy`. Blank means the final response did not expose that header.

| Purpose | Exact URL | Status | Final content type | Redirects | Bytes | ACAO | CORP | Cache-Control |
|---|---|---:|---|---:|---:|---|---|---|
| Broken France flag code | `https://flagcdn.com/w80/fx.png` | **404** | `text/html; charset=utf-8` | 0 | 548 | — | — | — |
| Broken United Kingdom flag code | `https://flagcdn.com/w80/uk.png` | **404** | `text/html; charset=utf-8` | 0 | 146 | — | — | — |
| Correct France flag | `https://flagcdn.com/w80/fr.png` | **200** | `image/png` | 0 | 123 | `*` | — | `public, max-age=2678400, s-maxage=2678400` |
| Correct United Kingdom flag | `https://flagcdn.com/w80/gb.png` | **200** | `image/png` | 0 | 395 | `*` | — | `public, max-age=2678400, s-maxage=2678400` |
| AWS Hero placeholder | `https://d1.awsstatic.com/getting-started-guides/new-heros-nov-2022/AWS-Heroes%20program-community-heroes_logo_dark.efe13e0d50fdf64d8a4524bf876d79a64dd82488.png` | **200** | `image/png` | 0 | 9,871 | — | — | `max-age=31536000` |
| Community Builder placeholder | `https://3sky.github.io/awscb-content-catalog/Logo.png` | **200** | `image/png` | 0 | 171,066 | `*` | — | `max-age=600` |
| Hero sample: Adam Bien | `https://avatars.builderprofile.aws.dev/2etUyZKADPoTd4MbUxaCup9Vbfy.webp` | **200** | `image/jpeg` | 0 | 23,846 | — | — | — |
| Full Builder sample: A.T.M Ruhul Amin | `https://avatars.builderprofile.aws.dev/2wIc2yhPMJDBLCdkfOQGoTzAqIu.webp` | **200** | `image/jpeg` | 0 | 35,154 | — | — | — |
| Builder summary preview: Ai Hayakawa | `https://avatars.builderprofile.aws.dev/2yRa2ShDQFMQFOOX3gLYWhBRFuU.webp` | **200** | `image/jpeg` | 0 | 13,354 | — | — | — |
| Student leader sample: Oumaima Fisaoui | `https://avatars.builderprofile.aws.dev/38UlWNdQMisgfHi330OzUlU9eMd.webp` | **200** | `image/jpeg` | 0 | 19,058 | — | — | — |
| Experimental Earth color texture | `https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg` | **200** | `image/jpeg` | 1 | 1,461,877 | `*` | `cross-origin` | `public, max-age=31536000` |
| Experimental Earth topology texture | `https://unpkg.com/three-globe/example/img/earth-topology.png` | **200** | `image/png` | 1 | 378,243 | `*` | `cross-origin` | `public, max-age=31536000` |

The unpkg effective URLs were:

- `https://unpkg.com/three-globe@2.45.2/example/img/earth-blue-marble.jpg`
- `https://unpkg.com/three-globe@2.45.2/example/img/earth-topology.png`

No other tested URL redirected.

## Root cause of the broken flags

This is not a Flagcdn outage. The app generates the wrong country codes.

`countryFlags.js` enumerates every two-letter combination through `Intl.DisplayNames`, then writes the displayed name into a map without guarding against a later alias overwriting a canonical code (`src/utils/countryFlags.js:36-53`). In the current Node/browser locale data:

```text
France -> FX
United Kingdom -> UK
UK -> GB
French Guiana -> GF
```

`FX` is a legacy/reserved code and `UK` is a commonly used alias; Flagcdn serves the canonical image paths `fr.png` and `gb.png`. The existing explicit aliases cover the input string `UK -> GB`, but not the full country names `France` and `United Kingdom` (`src/utils/countryFlags.js:1-34`, `:77-80`).

Static impact in the current datasets:

| Dataset | `France` records | `United Kingdom` records |
|---|---:|---:|
| Heroes | 4 | 9 |
| Community Builders | 27 | 124 |
| Community Builder summary | 3 | 10 |
| User Groups | 12 | 18 |
| Student Builder Groups | 8 | 14 |

For the User Group Earth/Atlas markers specifically, this produces **29 broken flag-image marker clusters**: 12 France markers and 17 United Kingdom markers. Sleek's Unicode-flag labels use the same bad codes, so `FX`/`UK` can also render as unsupported regional-indicator letters instead of the intended flags.

**Fix implication:** add canonical aliases for at least `france: 'FR'` and `'united kingdom': 'GB'`, and make the generated map preserve the first canonical mapping or build from a vetted ISO-3166 list. Add unit tests for France, United Kingdom, and every dataset country before relying on generated flag URLs.

## CORS and embedding implications

- Flagcdn's valid images and the GitHub Pages Community Builder logo expose `Access-Control-Allow-Origin: *`.
- The unpkg textures expose both `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`, which is appropriate for cross-origin WebGL texture loading.
- The AWS static placeholder and sampled Builder Profile avatars did not return an ACAO header. They are used as ordinary DOM `<img>` elements, which can display cross-origin images without ACAO. They should not be drawn into a readable canvas or fetched from JavaScript unless their CORS policy changes.
- The sampled Builder Profile avatar responses exposed ETags but no `Cache-Control` header. **Inference:** repeat visits may require revalidation; exact browser/CDN caching behavior depends on other response headers and cache state.
- All four avatar URLs end in `.webp` but returned `image/jpeg`. This is not a current rendering failure because browsers follow the response type/content, but any image pipeline that assumes WebP from the suffix would be wrong.

## Remote placeholder implications

Both placeholders are live now, but neither should be a hard availability dependency for marker legibility:

- The AWS Hero placeholder is small (9.6 KiB), has a one-year cache lifetime, and currently works. It has no ACAO, which is fine for its current DOM-image use.
- The Community Builder placeholder is 171,066 bytes and cached for only 10 minutes. Reusing a 167 KiB remote asset for tiny 30–34 px markers is inefficient.
- Both marker paths lack a second-stage `onerror` fallback in the Earth/Atlas portrait implementations (`src/utils/portraitGroupMarker.js:59-100`, `:130-142`; `src/components/ClassicGlobeScene.jsx:95-147`, `:314-347`). A future host failure can therefore leave a broken image icon.

**Recommendation:** copy optimized, appropriately licensed versions into `public/`, size them for marker use, and retain an initials/category-badge fallback that does not depend on another network request.

## Experimental unpkg textures already exist locally

SHA-256 comparison:

| File | Local path | SHA-256 | Remote matches |
|---|---|---|---|
| Earth color | `public/textures/earth-blue-marble.jpg` | `228DEBA2E4B600146BDCB6CFA359B8EAD6AACC2B1C13550A29CD82824CFA1C01` | Yes |
| Earth topology | `public/textures/earth-topology.png` | `839B12DA2E4DD346B256CEBAE72E10C479A102C8980A22084C41275E4B9A0E12` | Yes |

The primary desktop globe already uses `/textures/earth-blue-marble.jpg` and `/textures/earth-topology.png` (`src/components/ClassicGlobeScene.jsx:501-510`). Experimental Event Reveal instead requests the unversioned unpkg URLs (`src/components/ExperimentalEventReveal.jsx:122-146`).

**Recommendation:** point the experiment at the local files. This removes two third-party requests, about 1.84 MB of duplicate transfer on an uncached visit, an unversioned redirect, and future package-version drift without changing a byte of the texture content.

## Priority summary

1. **P1:** fix canonical France/United Kingdom mapping; the current URLs are confirmed 404 and affect 29 User Group image markers plus Unicode flags in other globe labels.
2. **P2:** use the already-shipped local Earth textures in Experimental Event Reveal.
3. **P2:** make every remote portrait/placeholder failure end in a local badge or initials, not another remote-only image.
4. **P3:** optimize and localize the 171 kB Community Builder placeholder.
5. **Monitor:** the sampled Builder Profile avatar service is healthy, but this four-URL sample is not an exhaustive validation of thousands of records.

## Reproduction commands

Run from `D:\Github-Local\aws-community-world` in PowerShell.

### HTTP status, redirect, media type, size, cache, and CORS headers

```powershell
$urls = @(
  'https://flagcdn.com/w80/fx.png',
  'https://flagcdn.com/w80/uk.png',
  'https://flagcdn.com/w80/fr.png',
  'https://flagcdn.com/w80/gb.png',
  'https://d1.awsstatic.com/getting-started-guides/new-heros-nov-2022/AWS-Heroes%20program-community-heroes_logo_dark.efe13e0d50fdf64d8a4524bf876d79a64dd82488.png',
  'https://3sky.github.io/awscb-content-catalog/Logo.png',
  'https://avatars.builderprofile.aws.dev/2etUyZKADPoTd4MbUxaCup9Vbfy.webp',
  'https://avatars.builderprofile.aws.dev/2wIc2yhPMJDBLCdkfOQGoTzAqIu.webp',
  'https://avatars.builderprofile.aws.dev/2yRa2ShDQFMQFOOX3gLYWhBRFuU.webp',
  'https://avatars.builderprofile.aws.dev/38UlWNdQMisgfHi330OzUlU9eMd.webp',
  'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  'https://unpkg.com/three-globe/example/img/earth-topology.png'
)

$format = 'status=%{http_code};effective=%{url_effective};type=%{content_type};redirects=%{num_redirects};bytes=%{size_download};acao=%header{access-control-allow-origin};corp=%header{cross-origin-resource-policy};cache=%header{cache-control}'
foreach ($url in $urls) {
  Write-Output $url
  curl.exe --silent --show-error --location --max-time 30 --output NUL --write-out $format $url
  Write-Output ''
}
```

### Country-code reproduction

```powershell
node --input-type=module -e 'import {getCountryCode} from "./src/utils/countryFlags.js"; for(const name of ["France","United Kingdom","UK","French Guiana"]){console.log(`${name} -> ${getCountryCode(name)}`)}'
```

### Local/remote texture hash comparison

```powershell
$auditTemp = Join-Path ([System.IO.Path]::GetTempPath()) ('aws-globe-asset-audit-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $auditTemp | Out-Null

$checks = @(
  @{ Name = 'earth-blue-marble.jpg'; Url = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg' },
  @{ Name = 'earth-topology.png'; Url = 'https://unpkg.com/three-globe/example/img/earth-topology.png' }
)

foreach ($check in $checks) {
  $remote = Join-Path $auditTemp $check.Name
  curl.exe --silent --show-error --location --max-time 30 --output $remote $check.Url
  $localHash = (Get-FileHash (Join-Path 'public\textures' $check.Name) -Algorithm SHA256).Hash
  $remoteHash = (Get-FileHash $remote -Algorithm SHA256).Hash
  [PSCustomObject]@{ Name = $check.Name; LocalHash = $localHash; RemoteHash = $remoteHash; Match = ($localHash -eq $remoteHash) }
  Remove-Item -LiteralPath $remote
}

Remove-Item -LiteralPath $auditTemp
```

## Limits

- This was a bounded sample, not a crawl of all 3,000+ avatar URLs.
- A 200 response proves current HTTP availability and media type, not that the portrait depicts the correct person.
- Header observations are from this request location and timestamp; CDN behavior can vary by region, request headers, and time.
