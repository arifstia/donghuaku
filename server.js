const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;
const PROVIDER_URL=process.env.PROVIDER_URL||"";
const CACHE_TTL=Number(process.env.CACHE_TTL||600);
const cache=new Map();

app.use(express.static(path.join(__dirname,"public")));

async function provider(endpoint){
  if(!PROVIDER_URL) throw new Error("Set PROVIDER_URL to your authorized metadata provider.");
  const now=Date.now(), hit=cache.get(endpoint);
  if(hit && now-hit.time<CACHE_TTL*1000)return hit.data;
  const r=await fetch(PROVIDER_URL.replace(/\/$/,"")+endpoint,{headers:{"User-Agent":"DonghuaKu/3.0"}});
  if(!r.ok)throw new Error("Provider "+r.status);
  const data=await r.json();cache.set(endpoint,{time:now,data});return data;
}

/*
 Provider contract:
 GET /catalog?mode=latest|popular|ongoing|completed -> {items:[...]}
 GET /search?q=... -> {items:[...]}
 GET /detail/:id -> {id,title,poster,synopsis,genres,status,year,studio,episodes:[{number,title,servers:[{name,url}]}]}
 The server deliberately does not scrape or proxy video files itself.
*/
app.get("/api/catalog",async(req,res)=>{try{res.json(await provider("/catalog?mode="+encodeURIComponent(req.query.mode||"latest")))}catch(e){res.status(503).json({error:e.message})}});
app.get("/api/search",async(req,res)=>{try{res.json(await provider("/search?q="+encodeURIComponent(req.query.q||"")))}catch(e){res.status(503).json({error:e.message})}});
app.get("/api/detail/:id",async(req,res)=>{try{res.json(await provider("/detail/"+encodeURIComponent(req.params.id)))}catch(e){res.status(503).json({error:e.message})}});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
app.listen(PORT,()=>console.log("DonghuaKu V3 running on http://localhost:"+PORT));
