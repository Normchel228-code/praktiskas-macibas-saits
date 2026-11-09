# Ceļojums uz Phenjanu

Mācību tīmekļvietne par Phenjanu un tās pieminekļiem. Vietnē ir fotogalerija, izmaksu kalkulators un atsauksmju forma. Formas datus pārbauda gan pārlūkā, gan serverī.

## Prasības

- Node.js 20. versija vai jaunāka.
- Mūsdienīgs tīmekļa pārlūks.

Pārbaudīt Node.js versiju:

```bash
node --version
```

Projektam nav jāinstalē papildu pakotnes.

## Palaišana

Atarhivē projektu un atver termināli mapē, kurā atrodas mape `phenjana`.

```bash
cd phenjana
node server.js
```

Atver pārlūkā [http://127.0.0.1:3000](http://127.0.0.1:3000).

Kamēr izmanto vietni, atstāj termināli atvērtu. Lai apturētu serveri, terminālī nospied **Ctrl+C**.

Ja ports 3000 jau ir aizņemts, norādi citu:

```bash
PORT=3001 node server.js
```

Šajā gadījumā atver [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Projekta struktūra

```text
phenjana/
├── README.md                  projekta apraksts un palaišana
├── package.json               projekta iestatījumi
├── package-lock.json          būvēšanas pakotņu versijas
├── server.js                  serveris un pieprasījumu apstrāde
└── public/
    ├── index.html             galvenā lapa
    ├── credits.html             informācijas un attēlu avoti
    ├── css/
    │   └── style.css          lapu stili
    ├── js/
    │   ├── app.js             galerija, kalkulators un forma
    │   ├── app.min.js        pārlūka JavaScript būvējums
    │   └── validation.js      kopīga formas datu pārbaude
    └── images/
        ├── phenjana.webp
        ├── cuche.webp
        ├── partijas-piemineklis.webp
        ├── triumfa-arka.webp
        ├── partijas-emblema.svg
        └── mark.svg
```

Serveris pieņem un pārbauda testa atsauksmes. Pastāvīga atsauksmju saglabāšana nav ieviesta.

## Veiktspēja un meklēšana

- Attēli izmanto WebP formātu.
- Galerijas attēli izmanto atlikto ielādi un asinhronu dekodēšanu. Attēlu izmēri ir norādīti HTML.
- JavaScript būvējums tiek ielādēts asinhroni lapas beigās. Google Closure Compiler apvieno un minificē pārlūka JavaScript. Serveris saspiež teksta failus ar gzip un norāda pārlūkam, cik ilgi attēlus glabāt kešatmiņā.
- Katrai lapai ir savs virsraksts un metaapraksts. Attēlu alternatīvais teksts apraksta attēlu saturu.

Avoti — [Lighthouse ieteikumi JavaScript optimizācijai](https://developer.chrome.com/docs/lighthouse/performance/bootup-time), [web.dev LCP ieteikumi](https://web.dev/articles/optimize-lcp), [Google Search Central SEO ceļvedis](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

Pēc izmaiņām `public/js/app.js` vai `public/js/validation.js` atjauno `public/js/app.min.js`:

```bash
npm ci
npm run build
```

Gatavais `app.min.js` ir iekļauts projektā. Iepriekš minētās komandas vajadzīgas JavaScript būvējuma atjaunošanai.
