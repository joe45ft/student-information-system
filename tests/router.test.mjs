import test from "node:test";import assert from "node:assert/strict";import {Router} from "../src/router.js";
test("parameter route",async()=>{const r=new Router();r.add("GET","/students/:id/edit",({params})=>new Response(params.id));const res=await r.handle(new Request("https://example.com/students/42/edit"));assert.equal(await res.text(),"42")});
test("wrong method does not match",async()=>{const r=new Router();r.add("POST","/login",()=>new Response("ok"));assert.equal(await r.handle(new Request("https://example.com/login")),null)});
