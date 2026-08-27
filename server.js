const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const ANILIST_API = "https://graphql.anilist.co";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function anilist(query, variables = {}) {
  const response = await fetch(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const json = await response.json();

  if (!response.ok || json.errors) {
    throw new Error(
      json.errors?.[0]?.message || `AniList HTTP ${response.status}`
    );
  }

  return json.data;
}

const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
    native
  }
  type
  format
  status
  episodes
  duration
  season
  seasonYear
  averageScore
  popularity
  description(asHtml: false)
  genres
  countryOfOrigin

  coverImage {
    extraLarge
    large
    medium
  }

  bannerImage

  siteUrl

  studios(isMain: true) {
    nodes {
      name
    }
  }

  streamingEpisodes {
    title
    thumbnail
    url
    site
  }
`;

const CATALOG_QUERY = `
query (
  $page: Int,
  $perPage: Int,
  $sort: [MediaSort],
  $status: MediaStatus
) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME
      countryOfOrigin: CN
      sort: $sort
      status: $status
    ) {
      ${MEDIA_FIELDS}
    }
  }
}
`;

const SEARCH_QUERY = `
query (
  $search: String,
  $page: Int,
  $perPage: Int
) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME
      countryOfOrigin: CN
      search: $search
      sort: SEARCH_MATCH
    ) {
      ${MEDIA_FIELDS}
    }
  }
}
`;

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    ${MEDIA_FIELDS}

    relations {
      edges {
        relationType
        node {
          id
          type
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          format
          status
        }
      }
    }
  }
}
`;

function titleOf(title) {
  return (
    title?.english ||
    title?.romaji ||
    title?.native ||
    "Unknown"
  );
}

function mapStreamingEpisodes(list = []) {
  return list.map((episode, index) => ({
    number: index + 1,
    title: episode.title || `Episode ${index + 1}`,
    thumbnail: episode.thumbnail || "",
    servers: [
      {
        name: episode.site || "Official",
        url: episode.url
      }
    ]
  }));
}

function mapAnime(a) {
  return {
    id: String(a.id),

    title: titleOf(a.title),

    nativeTitle: a.title?.native || "",

    poster:
      a.coverImage?.extraLarge ||
      a.coverImage?.large ||
      a.coverImage?.medium ||
      "",

    banner: a.bannerImage || "",

    synopsis: a.description || "",

    status: a.status || "",

    format: a.format || "",

    episodes: a.episodes || 0,

    duration: a.duration || 0,

    year: a.seasonYear || null,

    season: a.season || null,

    score: a.averageScore || 0,

    popularity: a.popularity || 0,

    genres: a.genres || [],

    studio:
      a.studios?.nodes?.[0]?.name || "",

    siteUrl: a.siteUrl || "",

    country: a.countryOfOrigin || "",

    streamingEpisodes:
      mapStreamingEpisodes(a.streamingEpisodes)
  };
}


/* =========================
   KATALOG
========================= */

app.get("/api/catalog", async (req, res) => {
  try {
    const mode = req.query.mode || "latest";

    let sort = ["START_DATE_DESC"];
    let status = null;

    if (mode === "popular") {
      sort = ["POPULARITY_DESC"];
    }

    if (mode === "ongoing") {
      sort = ["POPULARITY_DESC"];
      status = "RELEASING";
    }

    if (mode === "completed") {
      sort = ["END_DATE_DESC"];
      status = "FINISHED";
    }

    const variables = {
      page: 1,
      perPage: 30,
      sort
    };

    if (status) {
      variables.status = status;
    }

    const data = await anilist(
      CATALOG_QUERY,
      variables
    );

    res.json({
      mode,
      items: data.Page.media.map(mapAnime)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Gagal mengambil katalog.",
      message: error.message
    });
  }
});


/* =========================
   SEARCH
========================= */

app.get("/api/search", async (req, res) => {
  try {

    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        query: "",
        items: []
      });
    }

    const data = await anilist(
      SEARCH_QUERY,
      {
        search: q,
        page: 1,
        perPage: 30
      }
    );

    res.json({
      query: q,
      items: data.Page.media.map(mapAnime)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Pencarian gagal.",
      message: error.message
    });
  }
});


/* =========================
   DETAIL
========================= */

app.get("/api/detail/:id", async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "ID tidak valid."
      });
    }

    const data = await anilist(
      DETAIL_QUERY,
      { id }
    );

    if (!data.Media) {
      return res.status(404).json({
        error: "Donghua tidak ditemukan."
      });
    }

    const anime = mapAnime(data.Media);

    /*
      Hanya episode yang memiliki
      link streaming resmi yang ditampilkan.
    */

    anime.episodes =
      anime.streamingEpisodes.length;

    res.json(anime);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Gagal mengambil detail.",
      message: error.message
    });
  }
});


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {

  res.json({
    ok: true,
    app: "DonghuaKu V4",
    time: new Date().toISOString()
  });

});


/* =========================
   PWA FALLBACK
========================= */

app.get("/{*splat}", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


app.listen(PORT, () => {

  console.log(
    `DonghuaKu V4 running on port ${PORT}`
  );

});