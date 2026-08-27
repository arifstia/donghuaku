const $=id=>document.getElementById(id);
let catalog=[], current=null, epIndex=0, serverIndex=0, deferred=null;

async function api(path){const r=await fetch("/api"+path);if(!r.ok)throw new Error("API "+r.status);return r.json()}
function fmt(s){if(!isFinite(s))return"00:00";s=Math.floor(s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function card(a){return `<article class="card" data-id="${a.id}"><img loading="lazy" src="${a.poster||"/placeholder.svg"}" alt=""><div class="info"><div class="title">${a.title}</div><div class="meta">${a.status||""} ${a.year?"• "+a.year:""}</div></div></article>`}
function render(list){$("grid").innerHTML=list.length?list.map(card).join(""):`<div class="empty">Tidak ada hasil.</div>`;document.querySelectorAll(".card").forEach(x=>x.onclick=()=>openDetail(x.dataset.id))}
async function load(mode="latest"){try{let data=await api("/catalog?mode="+mode);catalog=data.items||[];render(catalog);$("sectionTitle").textContent={latest:"Latest Release",popular:"Popular",ongoing:"Ongoing",completed:"Completed",random:"Surprise Me"}[mode]||"Donghua"}catch(e){$("grid").innerHTML='<div class="empty">Backend belum terhubung atau sumber data sedang bermasalah.</div>'}}
async function openDetail(id){const d=await api("/detail/"+encodeURIComponent(id));$("detailBody").innerHTML=`<img class="cover" src="${d.poster||"/placeholder.svg"}"><h2>${d.title}</h2><p>${d.synopsis||"Tidak ada sinopsis."}</p><div>${(d.genres||[]).map(x=>`<span class="tag">${x}</span>`).join("")}</div><p>Status: ${d.status||"-"}<br>Tahun: ${d.year||"-"}<br>Studio: ${d.studio||"-"}</p><div class="clear"></div><h3>Episode</h3><div class="episodes">${(d.episodes||[]).map((e,i)=>`<button class="ep" data-i="${i}">EP ${e.number||i+1}</button>`).join("")}</div>`;$("detail").style.display="block";document.querySelectorAll("#detailBody .ep").forEach(b=>b.onclick=()=>openPlayer(d,Number(b.dataset.i)));current=d}
async function openPlayer(d,i){current=d;epIndex=i;serverIndex=0;$("detail").style.display="none";$("player").style.display="block";$("playerTitle").textContent=d.title;renderEpisodes();await loadSource()}
function renderEpisodes(){$("episodes").innerHTML=(current.episodes||[]).map((e,i)=>`<button class="ep ${i===epIndex?"active":""}" data-i="${i}">EP ${e.number||i+1}</button>`).join("");document.querySelectorAll("#episodes .ep").forEach(b=>b.onclick=async()=>{epIndex=+b.dataset.i;serverIndex=0;renderEpisodes();await loadSource()})}
async function loadSource(){const e=current.episodes[epIndex];$("episodeName").textContent=e.title||"Episode "+(e.number||epIndex+1);const s=e.servers||[];$("servers").innerHTML=s.map((x,i)=>`<button class="server ${i===serverIndex?"active":""}" data-i="${i}">${x.name||"Server "+(i+1)}</button>`).join("");document.querySelectorAll(".server").forEach(b=>b.onclick=async()=>{serverIndex=+b.dataset.i;await loadSource()});if(!s[serverIndex]?.url){$("video").removeAttribute("src");$("video").load();return}$("video").src=s[serverIndex].url;$("video").playbackRate=Number(localStorage.speed||1);$("video").load();if(localStorage.autoplay!=="false")$("video").play().catch(()=>{})}
$("search").oninput=async e=>{let q=e.target.value.trim();if(!q)return load();try{const d=await api("/search?q="+encodeURIComponent(q));render(d.items||[])}catch{}};
document.querySelectorAll(".filters button").forEach(b=>b.onclick=async()=>{document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");let m=b.dataset.mode;if(m==="random"){if(!catalog.length)await load();if(catalog.length)openDetail(catalog[Math.floor(Math.random()*catalog.length)].id)}else load(m)});
$("detailClose").onclick=()=>$("detail").style.display="none";
$("playerClose").onclick=()=>{$("video").pause();$("player").style.display="none"};
$("play").onclick=()=>$("video").paused?$("video").play():$("video").pause();
$("back10").onclick=()=>$("video").currentTime=Math.max(0,$("video").currentTime-10);
$("forward10").onclick=()=>$("video").currentTime=Math.min($("video").duration||Infinity,$("video").currentTime+10);
$("prev").onclick=async()=>{if(epIndex>0){epIndex--;renderEpisodes();await loadSource()}};
$("next").onclick=async()=>{if(epIndex<current.episodes.length-1){epIndex++;renderEpisodes();await loadSource()}};
$("randomEp").onclick=async()=>{if(current.episodes.length>1){let n=Math.floor(Math.random()*current.episodes.length);if(n===epIndex)n=(n+1)%current.episodes.length;epIndex=n;renderEpisodes();await loadSource()}};
$("seek").oninput=e=>{if($("video").duration)$("video").currentTime=$("video").duration*e.target.value/100};
$("video").ontimeupdate=()=>{$("seek").value=$("video").duration?100*$("video").currentTime/$("video").duration:0;$("time").textContent=fmt($("video").currentTime)+" / "+fmt($("video").duration)};
$("video").onplay=()=>$("play").textContent="Ⅱ";$("video").onpause=()=>$("play").textContent="▶";
$("video").onended=()=>{if(localStorage.autoplay!=="false")$("next").click()};
$("mute").onclick=()=>{$("video").muted=!$("video").muted;$("mute").textContent=$("video").muted?"🔇":"🔊"};
$("full").onclick=async()=>{try{if(!document.fullscreenElement)await $("videoWrap").requestFullscreen();else await document.exitFullscreen()}catch{}};
$("settingsBtn").onclick=()=>$("settings").style.display="block";$("settingsClose").onclick=()=>$("settings").style.display="none";
$("autoplay").onchange=e=>localStorage.autoplay=e.target.checked;$("speed").onchange=e=>{localStorage.speed=e.target.value;$("video").playbackRate=+e.target.value};
$("autoplay").checked=localStorage.autoplay!=="false";$("speed").value=localStorage.speed||"1";
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("install").style.display="inline-block"});$("install").onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;$("install").style.display="none"}};
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js");
load();
