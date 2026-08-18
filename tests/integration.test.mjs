import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { ensureSchema } from "../src/db.js";
import { createSession } from "../src/security.js";

class D1StatementMock {
  constructor(owner, sql){ this.owner=owner; this.sql=sql; this.args=[]; }
  bind(...args){ this.args=args.map(value=>value===undefined?null:value); return this; }
  _isQuery(){ return /^\s*(SELECT|PRAGMA|WITH)\b/i.test(this.sql); }
  _execute(){
    const statement=this.owner.sqlite.prepare(this.sql);
    if(this._isQuery()) return {results:statement.all(...this.args)};
    const result=statement.run(...this.args);
    return {meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};
  }
  async all(){ return this._execute(); }
  async first(){
    const statement=this.owner.sqlite.prepare(this.sql);
    return statement.get(...this.args)??null;
  }
  async run(){ return this._execute(); }
}

class D1Mock {
  constructor(){
    this.sqlite=new DatabaseSync(":memory:");
    this.sqlite.exec("PRAGMA foreign_keys = ON");
  }
  prepare(sql){ return new D1StatementMock(this,sql); }
  async batch(statements){
    const results=[];
    this.sqlite.exec("BEGIN");
    try{
      for(const statement of statements)results.push(statement._execute());
      this.sqlite.exec("COMMIT");
      return results;
    }catch(error){
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function csrfFromHtml(html){
  const match=html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match,"Expected a CSRF field");
  return match[1];
}

function cookiePair(response){
  const value=response.headers.get("set-cookie");
  assert.ok(value,"Expected Set-Cookie");
  return value.split(";",1)[0];
}

function postRequest(path, fields, cookie=""){
  return new Request(`https://ims.example${path}`,{
    method:"POST",
    headers:{origin:"https://ims.example","sec-fetch-site":"same-origin",...(cookie?{cookie}:{})},
    body:new URLSearchParams(fields)
  });
}

test("first-run setup, login, protected dashboard, student CRUD entry and 405 flow",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};

  const health=await worker.fetch(new Request("https://ims.example/health"),env);
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{ok:true,version:"1.2.1"});

  const setupGet=await worker.fetch(new Request("https://ims.example/setup"),env);
  assert.equal(setupGet.status,200);
  const setupHtml=await setupGet.text(),setupCsrf=csrfFromHtml(setupHtml),setupCookie=cookiePair(setupGet);

  const setupPost=await worker.fetch(postRequest("/setup",{
    _csrf:setupCsrf,
    full_name:"Owner User",
    phone:"01000000000",
    email:"owner@example.com",
    password:"StrongPass123!",
    confirm_password:"StrongPass123!"
  },setupCookie),env);
  assert.equal(setupPost.status,303);
  assert.equal(setupPost.headers.get("location"),"/login?msg=Owner+created+successfully.+Sign+in+now");

  const loginGet=await worker.fetch(new Request("https://ims.example/login"),env);
  const loginHtml=await loginGet.text(),loginCsrf=csrfFromHtml(loginHtml),loginCsrfCookie=cookiePair(loginGet);
  const loginPost=await worker.fetch(postRequest("/login",{
    _csrf:loginCsrf,
    email:"owner@example.com",
    password:"StrongPass123!",
    remember:"1"
  },loginCsrfCookie),env);
  assert.equal(loginPost.status,303);
  assert.equal(loginPost.headers.get("location"),"/dashboard");
  const sidCookie=cookiePair(loginPost);

  const dashboard=await worker.fetch(new Request("https://ims.example/dashboard",{headers:{cookie:sidCookie}}),env);
  assert.equal(dashboard.status,200);
  assert.match(await dashboard.text(),/Dashboard/);

  const studentGet=await worker.fetch(new Request("https://ims.example/students/new",{headers:{cookie:sidCookie}}),env);
  const studentHtml=await studentGet.text(),studentCsrf=csrfFromHtml(studentHtml),studentCsrfCookie=cookiePair(studentGet);
  const combinedCookie=`${sidCookie}; ${studentCsrfCookie}`;
  const studentPost=await worker.fetch(postRequest("/students/new",{
    _csrf:studentCsrf,
    student_code:"S-001",
    full_name:"Test Student",
    email:"student@example.com",
    phone:"01234567890",
    gender:"Male",
    birth_date:"2000-01-01",
    status:"ACTIVE",
    notes:"Integration test"
  },combinedCookie),env);
  assert.equal(studentPost.status,303);
  assert.equal(studentPost.headers.get("location"),"/students?msg=Student+created");

  const students=await worker.fetch(new Request("https://ims.example/students",{headers:{cookie:sidCookie}}),env);
  assert.equal(students.status,200);
  assert.match(await students.text(),/Test Student/);

  const reportExport=await worker.fetch(new Request("https://ims.example/reports/export.csv",{headers:{cookie:sidCookie}}),env);
  assert.equal(reportExport.status,200);
  assert.match(reportExport.headers.get("content-type"),/text\/csv/);
  assert.match(await reportExport.text(),/report_type,label,count/);

  const logoutGet=await worker.fetch(new Request("https://ims.example/logout",{headers:{cookie:sidCookie}}),env);
  assert.equal(logoutGet.status,200);
  assert.match(await logoutGet.text(),/Sign out\?/i);

  const schemaVersion=await DB.prepare("SELECT value FROM app_meta WHERE key='schema_version'").first();
  assert.equal(schemaVersion.value,"2");

  const wrongMethod=await worker.fetch(new Request("https://ims.example/login",{method:"PUT"}),env);
  assert.equal(wrongMethod.status,405);
  assert.match(wrongMethod.headers.get("allow"),/GET/);
  assert.match(wrongMethod.headers.get("allow"),/POST/);
});


test("explicit permissions protect sessions and report export is independent from student export",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const created=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
    .bind("Viewer User","viewer@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const userId=Number(created.meta.last_row_id);
  await DB.batch([
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"sessions.manage",0),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"reports.export",1),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"students.export",0)
  ]);
  const session=await createSession(DB,userId,new Request("https://ims.example/login"),false);
  const cookie=`sid=${session.token}`;

  const sessions=await worker.fetch(new Request("https://ims.example/sessions",{headers:{cookie}}),env);
  assert.equal(sessions.status,403);

  const reportExport=await worker.fetch(new Request("https://ims.example/reports/export.csv",{headers:{cookie}}),env);
  assert.equal(reportExport.status,200);

  const studentExport=await worker.fetch(new Request("https://ims.example/students/export.csv",{headers:{cookie}}),env);
  assert.equal(studentExport.status,403);
});

test("authenticated page smoke test covers all primary UI modules",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const created=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
    .bind("Owner Smoke","smoke@example.com","","not-used","OWNER","ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(created.meta.last_row_id),new Request("https://ims.example/login"),false);
  const cookie=`sid=${session.token}`;
  const paths=[
    "/dashboard","/students","/students/new","/students/import","/batches","/lecturers","/subjects","/groups",
    "/users","/users/new","/profile","/sessions","/reports","/activity","/settings","/logout"
  ];
  for(const path of paths){
    const response=await worker.fetch(new Request(`https://ims.example${path}`,{headers:{cookie}}),env);
    assert.equal(response.status,200,`${path} should render successfully`);
    assert.match(response.headers.get("content-type")||"",/text\/html/,`${path} should be HTML`);
  }
  const notFound=await worker.fetch(new Request("https://ims.example/not-a-real-page",{headers:{cookie}}),env);
  assert.equal(notFound.status,404);
});
