import test from "node:test";
import assert from "node:assert/strict";
import { Router } from "../src/router.js";

test("parameter route",async()=>{
  const router=new Router();
  router.add("GET","/students/:id/edit",({params})=>new Response(params.id));
  const response=await router.handle(new Request("https://example.com/students/42/edit"));
  assert.equal(await response.text(),"42");
});

test("wrong method does not match but supported methods are discoverable",async()=>{
  const router=new Router();
  router.add("POST","/login",()=>new Response("ok"));
  assert.equal(await router.handle(new Request("https://example.com/login")),null);
  assert.deepEqual(router.methodsFor("/login"),["POST"]);
});

test("malformed encoded path parameter is handled safely",async()=>{
  const router=new Router();
  router.add("GET","/students/:id/edit",()=>new Response("ok"));
  assert.equal(await router.handle(new Request("https://example.com/students/%E0%A4%A/edit")),null);
});
