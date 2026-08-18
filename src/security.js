import { nowIso } from "./utils.js";

const enc = new TextEncoder();
const ITER = 10000;
const SID = "sid";
const CSRF = "csrf";

function b64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")}
function unb64(v){let s=String(v).replaceAll("-","+").replaceAll("_","/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
export function randomToken(n=32){const b=new Uint8Array(n);crypto.getRandomValues(b);return b64(b)}
export async function sha256(v){return b64(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(String(v)))))}
async function derive(password,salt,pepper=""){const material=pepper?`${password}\u0000${pepper}`:password;const key=await crypto.subtle.importKey("raw",enc.encode(material),"PBKDF2",false,["deriveBits"]);return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:ITER,hash:"SHA-256"},key,256))}
export async function hashPassword(password,pepper=""){const salt=new Uint8Array(16);crypto.getRandomValues(salt);const out=await derive(password,salt,pepper);return `${pepper?"pbkdf2p":"pbkdf2"}$${ITER}$${b64(salt)}$${b64(out)}`}
export async function verifyPassword(password,stored,pepper=""){try{const[mode,it,s,h]=String(stored).split("$");if(!["pbkdf2","pbkdf2p"].includes(mode)||Number(it)!==ITER)return false;if(mode==="pbkdf2p"&&!pepper)return false;const exp=unb64(h),act=await derive(password,unb64(s),mode==="pbkdf2p"?pepper:"");if(exp.length!==act.length)return false;let d=0;for(let i=0;i<exp.length;i++)d|=exp[i]^act[i];return d===0}catch{return false}}
export function parseCookies(request){const o={};for(const part of (request.headers.get("cookie")||"").split(";")){const i=part.indexOf("=");if(i<0)continue;o[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return o}
export function makeCookie(name,value,{maxAge,httpOnly=true}={}){let s=`${name}=${encodeURIComponent(value)}; Path=/; Secure; SameSite=Lax`;if(httpOnly)s+="; HttpOnly";if(typeof maxAge==="number")s+=`; Max-Age=${Math.max(0,Math.floor(maxAge))}`;return s}
export const clearSidCookie=()=>makeCookie(SID,"",{maxAge:0});
export function csrfFor(request){const old=parseCookies(request)[CSRF];if(old&&old.length>=20)return{token:old,setCookie:null};const token=randomToken(24);return{token,setCookie:makeCookie(CSRF,token,{maxAge:86400,httpOnly:false})}}
export function checkCsrf(request,form){const a=parseCookies(request)[CSRF]||"",b=String(form._csrf||"");if(!a||!b||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export async function createSession(db,userId,request,remember=false){const token=randomToken(32),hash=await sha256(token),start=new Date(),end=new Date(start.getTime()+(remember?30:0.5)*86400000),ua=(request.headers.get("user-agent")||"").slice(0,300);await db.prepare("INSERT INTO sessions(user_id,token_hash,created_at,expires_at,last_seen_at,user_agent) VALUES(?,?,?,?,?,?)").bind(userId,hash,start.toISOString(),end.toISOString(),start.toISOString(),ua).run();return{token,maxAge:Math.floor((end-start)/1000)}}
export async function loadSession(db,request){const token=parseCookies(request)[SID];if(!token)return null;const hash=await sha256(token);const row=await db.prepare(`SELECT s.id session_id,s.expires_at,s.last_seen_at,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND u.status='ACTIVE'`).bind(hash).first();if(!row||Date.parse(row.expires_at)<=Date.now())return null;if(Date.now()-Date.parse(row.last_seen_at||0)>300000)await db.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(nowIso(),row.session_id).run();return row}
export async function revokeCurrentSession(db,request){const token=parseCookies(request)[SID];if(token)await db.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(nowIso(),await sha256(token)).run()}
export async function fingerprint(request,pepper=""){return sha256(`${request.headers.get("cf-connecting-ip")||"unknown"}\u0000${pepper}`)}
