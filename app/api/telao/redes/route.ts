import {NextRequest,NextResponse} from "next/server";
import {XMLParser} from "fast-xml-parser";
import {getSnapshotUF,isUF,isPleitoId} from "@/lib/telao/tse-apuracao";
export const dynamic="force-dynamic";
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const array=(x:any):any[]=>!x?[]:Array.isArray(x)?x:[x];
const parser=new XMLParser({ignoreAttributes:false});
async function xml(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(10000),next:{revalidate:300}});if(!r.ok)throw new Error("source unavailable");return parser.parse(await r.text());}
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams,uf=q.get("uf")??"",pleito=q.get("pleito")??"",num=q.get("num")??"";
 if(!isUF(uf)||!isPleitoId(pleito)||!/^\d{2,5}$/.test(num))return NextResponse.json({error:"Candidato inválido."},{status:400});
 const snapshots=await getSnapshotUF(uf),candidate=snapshots.find(p=>p.id===pleito)?.candidatos.find(c=>String(c.num)===num);
 if(!candidate)return NextResponse.json({error:"Candidato não encontrado neste pleito."},{status:404});
 const name=normalize(candidate.n);
 const channel=pleito==="presidente"&&num==="13"&&candidate.p==="PT"&&name.includes("lula")?"UCvO2BExvkAbGMsTGnEnI_Ng":uf==="sp"&&pleito==="governador-sp"&&num==="10"&&name.includes("tarcisio")?"UC9KMn-rfwWXb7JXepLWnx-w":null;
 const [trendResult,youtubeResult]=await Promise.allSettled([xml("https://trends.google.com/trending/rss?geo=BR"),channel?xml(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`):Promise.resolve(null)]);
 let trends:any={available:false};if(trendResult.status==="fulfilled"){const all=array(trendResult.value.rss?.channel?.item);trends={available:true,coverage:all.length,items:all.filter(e=>name.length>=3&&(` ${normalize(String(e.title??""))} `).includes(` ${name} `)).map(e=>({title:String(e.title??""),traffic:String(e["ht:approx_traffic"]??"Indisponível"),publishedAt:String(e.pubDate??""),url:`https://trends.google.com/trends/explore?geo=BR&date=now%207-d&q=${encodeURIComponent(String(e.title??""))}`}))};}
 let youtube:any=null;if(channel&&youtubeResult.status==="fulfilled"&&[channel,channel.slice(2)].includes(String(youtubeResult.value?.feed?.["yt:channelId"]??""))){const feed=youtubeResult.value.feed;const posts=array(feed.entry).slice(0,15).flatMap(e=>{const id=String(e["yt:videoId"]??""),publishedAt=String(e.published??"");if(!/^[A-Za-z0-9_-]{11}$/.test(id)||!Number.isFinite(Date.parse(publishedAt)))return [];const rawViews=e["media:group"]?.["media:community"]?.["media:statistics"]?.["@_views"];return [{title:String(e.title??""),publishedAt,url:`https://www.youtube.com/watch?v=${id}`,views:rawViews!==undefined&&Number.isFinite(Number(rawViews))?Number(rawViews):null}];});youtube={title:String(feed.title??""),source:`https://www.youtube.com/channel/${channel}`,posts,postsLast7Days:posts.filter(p=>Date.parse(p.publishedAt)>=Date.now()-7*86400000).length};}
 return NextResponse.json({candidate:candidate.n,checkedAt:new Date().toISOString(),trends,youtube},{headers:{"Cache-Control":"private, no-store"}});
}
