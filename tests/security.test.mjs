import test from "node:test";
import assert from "node:assert/strict";
import {
  PASSWORD_ITERATIONS,
  checkCsrf,
  csrfFor,
  hashPassword,
  needsPasswordRehash,
  parseCookies,
  verifyPassword
} from "../src/security.js";

const enc = new TextEncoder();
function b64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")}
async function legacyHash(password, pepper=""){
  const salt=Uint8Array.from({length:16},(_,i)=>i+1),material=pepper?`${password}\u0000${pepper}`:password;
  const key=await crypto.subtle.importKey("raw",enc.encode(material),"PBKDF2",false,["deriveBits"]);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:10000,hash:"SHA-256"},key,256));
  return `${pepper?"pbkdf2p":"pbkdf2"}$10000$${b64(salt)}$${b64(bits)}`;
}

test("PBKDF2 iteration target stays within Cloudflare Workers runtime limit",()=>{
  assert.equal(PASSWORD_ITERATIONS,100000);
});

test("new password hashes use the hardened iteration count",async()=>{
  const hash=await hashPassword("StrongPass123!");
  assert.match(hash,new RegExp(`^pbkdf2\\$${PASSWORD_ITERATIONS}\\$`));
  assert.equal(await verifyPassword("StrongPass123!",hash),true);
  assert.equal(await verifyPassword("wrong",hash),false);
  assert.equal(needsPasswordRehash(hash),false);
});

test("peppered password hashes verify correctly",async()=>{
  const hash=await hashPassword("StrongPass123!","pepper-test");
  assert.match(hash,new RegExp(`^pbkdf2p\\$${PASSWORD_ITERATIONS}\\$`));
  assert.equal(await verifyPassword("StrongPass123!",hash,"pepper-test"),true);
  assert.equal(await verifyPassword("StrongPass123!",hash,"wrong"),false);
});

test("legacy 10k hashes remain compatible and are marked for upgrade",async()=>{
  const hash=await legacyHash("StrongPass123!");
  assert.equal(await verifyPassword("StrongPass123!",hash),true);
  assert.equal(needsPasswordRehash(hash),true);
});

test("CSRF rejects cross-site requests",()=>{
  const getRequest=new Request("https://example.com/form");
  const csrf=csrfFor(getRequest);
  const cookie=csrf.setCookie.split(";",1)[0];
  const sameOrigin=new Request("https://example.com/form",{method:"POST",headers:{cookie,origin:"https://example.com","sec-fetch-site":"same-origin"}});
  const crossSite=new Request("https://example.com/form",{method:"POST",headers:{cookie,origin:"https://evil.example","sec-fetch-site":"cross-site"}});
  assert.equal(checkCsrf(sameOrigin,{_csrf:csrf.token}),true);
  assert.equal(checkCsrf(crossSite,{_csrf:csrf.token}),false);
});

test("malformed cookie encoding does not throw",()=>{
  const request=new Request("https://example.com",{headers:{cookie:"sid=%E0%A4%A; theme=dark"}});
  assert.equal(parseCookies(request).theme,"dark");
  assert.equal(parseCookies(request).sid,"%E0%A4%A");
});
