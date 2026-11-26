// S2H inquiry API. Deploy separately from GitHub Pages. Do not enable without production configuration.
const allowedKinds={
 contact:{required:["name","email","type","message","consent"],optional:["company","phone"],limits:{name:100,email:200,type:30,message:3000,company:100,phone:40}},
 seller:{required:["sellerName","instagram","phone","email","message","consent"],optional:["categories"],limits:{sellerName:200,instagram:200,phone:200,email:200,message:2000,categories:30}},
 brand:{required:["brandName","manager","phone","email","productName","message","consent"],optional:["productUrl"],limits:{brandName:200,manager:200,phone:200,email:200,productName:200,productUrl:200,message:2000}},
 product_request:{required:["seller","instagram","message","productId","productName","category","consent"],optional:[],limits:{seller:100,instagram:100,message:2000,productId:12,productName:200,category:30}}
};
function own(obj,k){return Object.prototype.hasOwnProperty.call(obj,k)}
function origins(env){return String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean)}
function headers(origin,env){const h={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Origin"};if(origin&&origins(env).includes(origin))h["Access-Control-Allow-Origin"]=origin;return h}
function reply(status,body,origin,env){return new Response(JSON.stringify(body),{status,headers:headers(origin,env)})}
async function safeEqual(a,b){const encoder=new TextEncoder();const [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",encoder.encode(a)),crypto.subtle.digest("SHA-256",encoder.encode(b))]);let diff=0;const ax=new Uint8Array(x),ay=new Uint8Array(y);for(let i=0;i<ax.length;i++)diff|=ax[i]^ay[i];return diff===0}
async function readLimited(request){const reader=request.body?.getReader();if(!reader)throw new Error("empty");let len=0;const chunks=[];try{while(true){const part=await reader.read();if(part.done)break;len+=part.value.length;if(len>24000){await reader.cancel();throw new Error("large")}chunks.push(part.value)}}finally{reader.releaseLock()}const data=new Uint8Array(len);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}return JSON.parse(new TextDecoder().decode(data))}
function validate(kind,fields){
 if(!own(allowedKinds,kind)||!fields||typeof fields!=="object"||Array.isArray(fields))return null;
 const schema=allowedKinds[kind],out={};
 for(const k of [...schema.required,...schema.optional]){let v=fields[k];if(v==null||v===""){if(schema.required.includes(k))return null;continue}if(k==="productId"&&typeof v==="number"&&Number.isSafeInteger(v))v=String(v);if(typeof v!=="string")return null;v=v.trim();if((schema.required.includes(k)&&!v)||v.length>(schema.limits[k]||30))return null;out[k]=v}
 if(out.consent!=="confirmed")return null;
 if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))return null;
 if(out.type&&!["브랜드 제휴","셀러 협업","상품 문의","기타 문의"].includes(out.type))return null;
 if(out.productId&&!/^\d+$/.test(out.productId))return null;
 if(out.productUrl){try{const u=new URL(out.productUrl);if(!["https:","http:"].includes(u.protocol))return null}catch{return null}}
 return out
}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get("Origin")||"";
 if(!env.DB||!env.PUBLIC_LIMITER||!env.ADMIN_LIMITER||!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!origins(env).length)return reply(503,{error:"not_configured"},origin,env);
 if(origin&&!origins(env).includes(origin))return reply(403,{error:"origin"},origin,env);
 if(request.method==="OPTIONS"){if(!origin)return reply(403,{error:"origin"},origin,env);return new Response(null,{status:204,headers:{...headers(origin,env),"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Max-Age":"600"}})}
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 try{
 if(url.pathname==="/inquiries"&&request.method==="POST"){
  if(!origin)return reply(403,{error:"origin"},origin,env);
  const limit=await env.PUBLIC_LIMITER.limit({key:ip});if(!limit.success)return reply(429,{error:"rate_limit"},origin,env);
  if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))return reply(415,{error:"content_type"},origin,env);
  let payload;try{payload=await readLimited(request)}catch{return reply(400,{error:"invalid_body"},origin,env)}
  if(!payload||typeof payload.kind!=="string")return reply(400,{error:"invalid_kind"},origin,env);
  const fields=validate(payload.kind,payload.fields);if(!fields)return reply(400,{error:"invalid_fields"},origin,env);
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  await env.DB.prepare("INSERT INTO inquiries(id,kind,fields,created_at,status) VALUES(?,?,?,?,?)").bind(id,payload.kind,JSON.stringify(fields),createdAt,"접수").run();
  return reply(201,{ok:true,id},origin,env)
 }
 if(url.pathname==="/admin/inquiries"&&request.method==="GET"){
  const limit=await env.ADMIN_LIMITER.limit({key:ip});if(!limit.success)return reply(429,{error:"rate_limit"},origin,env);
  const token=request.headers.get("Authorization")||"";
  if(!token.startsWith("Bearer ")||!(await safeEqual(token.slice(7),env.ADMIN_TOKEN)))return reply(401,{error:"unauthorized"},origin,env);
  const kind=url.searchParams.get("kind");if(!kind||!own(allowedKinds,kind))return reply(400,{error:"invalid_kind"},origin,env);
  const [count,rows]=await Promise.all([env.DB.prepare("SELECT COUNT(*) AS total FROM inquiries WHERE kind=?").bind(kind).first(),env.DB.prepare("SELECT id,fields,created_at,status FROM inquiries WHERE kind=? ORDER BY created_at DESC LIMIT 200").bind(kind).all()]);
  return reply(200,{total:Number(count?.total||0),items:(rows.results||[]).map(row=>({id:row.id,fields:JSON.parse(row.fields),createdAt:row.created_at,status:row.status}))},origin,env)
 }
 return reply(404,{error:"not_found"},origin,env)
 }catch{return reply(500,{error:"server_error"},origin,env)}
}};