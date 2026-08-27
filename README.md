# DonghuaKu V3

PWA + backend API/cache.

## Jalankan
1. Install Node.js 18+.
2. `npm install`
3. Set `PROVIDER_URL` ke backend metadata yang kamu miliki/berizin.
4. `npm start`
5. Buka `http://localhost:3000`.

## Provider contract
- `GET /catalog?mode=latest|popular|ongoing|completed`
- `GET /search?q=...`
- `GET /detail/:id`

Detail harus mengembalikan:
`id,title,poster,synopsis,genres,status,year,studio,episodes`.
Setiap episode dapat memiliki `servers:[{name,url}]`.

Backend memakai cache TTL default 10 menit sehingga katalog tidak perlu dimasukkan manual ke frontend.

## Catatan
Paket ini sengaja memisahkan katalog dari player. Jangan gunakan URL video atau metadata yang melanggar hak cipta/ketentuan sumber. Backend tidak mengunduh atau mem-proxy video.
