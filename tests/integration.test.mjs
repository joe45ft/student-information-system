import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { ensureSchema } from "../src/db.js";
import { createSession,hashPassword,sha256 } from "../src/security.js";

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

  const preSchemaHealth=await worker.fetch(new Request("https://ims.example/health"),env);
  assert.equal(preSchemaHealth.status,503);
  const preSchemaBody=await preSchemaHealth.json();
  assert.equal(preSchemaBody.version,"1.4.9");
  assert.equal(preSchemaBody.expected_schema,4);
  assert.equal(preSchemaBody.migration_required,true);

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

  const health=await worker.fetch(new Request("https://ims.example/health"),env);
  assert.equal(health.status,200);
  const healthBody=await health.json();
  assert.equal(healthBody.ok,true);
  assert.equal(healthBody.version,"1.4.9");
  assert.equal(healthBody.schema_version,4);

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
  const dashboardHtml=await dashboard.text();
  assert.match(dashboardHtml,/Dashboard/);
  assert.match(dashboardHtml,/data-auto-refresh="1"/);
  assert.match(dashboardHtml,/data-auto-refresh-toggle/);
  assert.match(dashboardHtml,/Academic Placement/);
  assert.match(dashboardHtml,/Students by Gender/);
  assert.match(dashboardHtml,/Data Quality/);
  assert.match(dashboardHtml,/data-nav-section="academic"/);
  assert.match(dashboardHtml,/Academic Network/);
  assert.match(dashboardHtml,/Course Offerings/);
  assert.match(dashboardHtml,/Terms \/ Semesters/);
  assert.match(dashboardHtml,/Enrollments/);
  assert.match(dashboardHtml,/Student Management/);
  assert.match(dashboardHtml,/Administration/);
  assert.match(dashboardHtml,/class="nav-section nav-account"/);

  const settingsNoRefresh=await worker.fetch(new Request("https://ims.example/settings",{headers:{cookie:sidCookie}}),env);
  const settingsNoRefreshHtml=await settingsNoRefresh.text();
  assert.match(settingsNoRefreshHtml,/data-auto-refresh="0"/);
  assert.doesNotMatch(settingsNoRefreshHtml,/data-auto-refresh-toggle/);

  const tsAcademic=new Date().toISOString();
  const batchCreated=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Batch A","BA","ACTIVE",tsAcademic,tsAcademic).run();
  const groupCreated=await DB.prepare("INSERT INTO groups_tbl(name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Group A",Number(batchCreated.meta.last_row_id),"ACTIVE",tsAcademic,tsAcademic).run();
  const lecturerCreated=await DB.prepare("INSERT INTO lecturers(full_name,email,phone,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind("Dr Test Lecturer","lecturer@example.com","01011112222","ACTIVE",tsAcademic,tsAcademic).run();
  const subjectCreated=await DB.prepare("INSERT INTO subjects(name,code,lecturer_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind("Security Fundamentals","SEC101",Number(lecturerCreated.meta.last_row_id),"ACTIVE",tsAcademic,tsAcademic).run();
  assert.ok(Number(subjectCreated.meta.last_row_id)>0);

  const lecturersPage=await worker.fetch(new Request("https://ims.example/lecturers",{headers:{cookie:sidCookie}}),env);
  assert.equal(lecturersPage.status,200);
  const lecturersHtml=await lecturersPage.text();
  assert.match(lecturersHtml,/Dr Test Lecturer/);
  assert.match(lecturersHtml,/1 subject/);
  assert.match(lecturersHtml,/01011112222/);

  const lecturerProfile=await worker.fetch(new Request(`https://ims.example/lecturers/${Number(lecturerCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(lecturerProfile.status,200);
  const lecturerProfileHtml=await lecturerProfile.text();
  assert.match(lecturerProfileHtml,/Lecturer Profile/);
  assert.match(lecturerProfileHtml,/Academic Network/);
  assert.match(lecturerProfileHtml,/Course Offerings/);
  assert.match(lecturerProfileHtml,/Via enrollment/);

  const filteredSubjects=await worker.fetch(new Request(`https://ims.example/subjects?lecturer=${Number(lecturerCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(filteredSubjects.status,200);
  const filteredSubjectsHtml=await filteredSubjects.text();
  assert.match(filteredSubjectsHtml,/Showing subjects assigned to/);
  assert.match(filteredSubjectsHtml,/Dr Test Lecturer/);
  assert.match(filteredSubjectsHtml,/\/lecturers\//);

  const batchProfile=await worker.fetch(new Request(`https://ims.example/batches/${Number(batchCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(batchProfile.status,200);
  const batchProfileHtml=await batchProfile.text();
  assert.match(batchProfileHtml,/Batch Profile/);
  assert.match(batchProfileHtml,/Course Offerings/);
  assert.match(batchProfileHtml,/Group A/);

  const groupProfile=await worker.fetch(new Request(`https://ims.example/groups/${Number(groupCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(groupProfile.status,200);
  const groupProfileHtml=await groupProfile.text();
  assert.match(groupProfileHtml,/Group Profile/);
  assert.match(groupProfileHtml,/Batch A/);
  assert.match(groupProfileHtml,/students\?group=/);

  const subjectProfile=await worker.fetch(new Request(`https://ims.example/subjects/${Number(subjectCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(subjectProfile.status,200);
  const subjectProfileHtml=await subjectProfile.text();
  assert.match(subjectProfileHtml,/Subject Profile/);
  assert.match(subjectProfileHtml,/Dr Test Lecturer/);
  assert.match(subjectProfileHtml,/Course Offerings/);
  assert.match(subjectProfileHtml,/Default lecturer|Default Lecturer/);

  const filteredGroups=await worker.fetch(new Request(`https://ims.example/groups?batch=${Number(batchCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(filteredGroups.status,200);
  assert.match(await filteredGroups.text(),/Showing groups connected to/);

  const studentGet=await worker.fetch(new Request("https://ims.example/students/new",{headers:{cookie:sidCookie}}),env);
  const studentHtml=await studentGet.text(),studentCsrf=csrfFromHtml(studentHtml),studentCsrfCookie=cookiePair(studentGet);
  assert.match(studentHtml,/Automatic: STU-000001/);
  const combinedCookie=`${sidCookie}; ${studentCsrfCookie}`;
  const studentPost=await worker.fetch(postRequest("/students/new",{
    _csrf:studentCsrf,
    student_code:"S-001",
    full_name:"Test Student",
    email:"student@example.com",
    phone:"01234567890",
    gender:"Male",
    birth_date:"2000-01-01",
    batch_id:String(batchCreated.meta.last_row_id),
    group_id:String(groupCreated.meta.last_row_id),
    status:"ACTIVE",
    notes:"Integration test"
  },combinedCookie),env);
  assert.equal(studentPost.status,303);
  assert.equal(studentPost.headers.get("location"),"/students?msg=Student+created");

  const students=await worker.fetch(new Request("https://ims.example/students",{headers:{cookie:sidCookie}}),env);
  assert.equal(students.status,200);
  const studentsHtml=await students.text();
  assert.match(studentsHtml,/Test Student/);
  assert.match(studentsHtml,/Advanced Search & Filters/);
  assert.match(studentsHtml,/name="gender"/);
  assert.match(studentsHtml,/name="batch"/);

  const filteredStudents=await worker.fetch(new Request(`https://ims.example/students?q=Test&status=ACTIVE&gender=Male&batch=${Number(batchCreated.meta.last_row_id)}&group=${Number(groupCreated.meta.last_row_id)}&sort=name_asc`,{headers:{cookie:sidCookie}}),env);
  assert.equal(filteredStudents.status,200);
  const filteredHtml=await filteredStudents.text();
  assert.match(filteredHtml,/Filters active/);
  assert.match(filteredHtml,/<strong>1<\/strong> student found/);
  assert.match(filteredHtml,/Batch A/);
  assert.match(filteredHtml,/Group A/);

  const invalidDateFilter=await worker.fetch(new Request("https://ims.example/students?to=2026-99-99",{headers:{cookie:sidCookie}}),env);
  assert.equal(invalidDateFilter.status,200);

  // CSV import supports academic placement by existing Batch/Group names.
  const importGet=await worker.fetch(new Request("https://ims.example/students/import",{headers:{cookie:sidCookie}}),env);
  const importHtml=await importGet.text(),importCsrf=csrfFromHtml(importHtml),importCookie=cookiePair(importGet);
  assert.match(importHtml,/batch, batch_code, group/);
  const form=new FormData();form.set("_csrf",importCsrf);form.set("file",new Blob([`student_code,full_name,email,gender,batch,group,status\nS-CSV,CSV Student,csv@example.com,Female,Batch A,Group A,ACTIVE`],{type:"text/csv"}),"students.csv");
  const imported=await worker.fetch(new Request("https://ims.example/students/import",{method:"POST",headers:{origin:"https://ims.example","sec-fetch-site":"same-origin",cookie:`${sidCookie}; ${importCookie}`},body:form}),env);
  assert.equal(imported.status,303);
  const importedRow=await DB.prepare("SELECT batch_id,group_id FROM students WHERE student_code='S-CSV'").first();
  assert.equal(Number(importedRow.batch_id),Number(batchCreated.meta.last_row_id));
  assert.equal(Number(importedRow.group_id),Number(groupCreated.meta.last_row_id));

  const studentRow=await DB.prepare("SELECT id FROM students WHERE student_code=?").bind("S-001").first();
  const studentProfile=await worker.fetch(new Request(`https://ims.example/students/${studentRow.id}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(studentProfile.status,200);
  const studentProfileHtml=await studentProfile.text();
  assert.match(studentProfileHtml,/Student Profile/);
  assert.match(studentProfileHtml,/Personal Information/);
  assert.match(studentProfileHtml,/Academic Placement/);
  assert.match(studentProfileHtml,/Integration test/);
  assert.match(studentProfileHtml,/Academic Network/);
  assert.match(studentProfileHtml,/Enrollments/);
  assert.match(studentProfileHtml,new RegExp(`/batches/${Number(batchCreated.meta.last_row_id)}`));
  assert.match(studentProfileHtml,new RegExp(`/groups/${Number(groupCreated.meta.last_row_id)}`));

  // V1.4.0 academic network: Term -> Course Offering -> Enrollment.
  const termsGet=await worker.fetch(new Request("https://ims.example/terms",{headers:{cookie:sidCookie}}),env);
  assert.equal(termsGet.status,200);
  const termsHtml=await termsGet.text(),termsCsrf=csrfFromHtml(termsHtml),termsCookie=cookiePair(termsGet);
  const termsPost=await worker.fetch(postRequest("/terms",{
    _csrf:termsCsrf,name:"Semester 1 · 2026",code:"2026-S1",start_date:"2026-09-01",end_date:"2027-01-31",status:"ACTIVE"
  },`${sidCookie}; ${termsCookie}`),env);
  assert.equal(termsPost.status,303);
  const termRow=await DB.prepare("SELECT id FROM academic_terms WHERE code=?").bind("2026-S1").first();
  assert.ok(termRow?.id);

  const offeringsGet=await worker.fetch(new Request("https://ims.example/offerings",{headers:{cookie:sidCookie}}),env);
  assert.equal(offeringsGet.status,200);
  const offeringsHtml=await offeringsGet.text(),offeringsCsrf=csrfFromHtml(offeringsHtml),offeringsCookie=cookiePair(offeringsGet);
  const offeringsPost=await worker.fetch(postRequest("/offerings",{
    _csrf:offeringsCsrf,subject_id:String(subjectCreated.meta.last_row_id),term_id:String(termRow.id),lecturer_id:String(lecturerCreated.meta.last_row_id),batch_id:String(batchCreated.meta.last_row_id),group_id:String(groupCreated.meta.last_row_id),code:"SEC101-S1-GA",status:"ACTIVE"
  },`${sidCookie}; ${offeringsCookie}`),env);
  assert.equal(offeringsPost.status,303);
  const offeringRow=await DB.prepare("SELECT id FROM course_offerings WHERE code=?").bind("SEC101-S1-GA").first();
  assert.ok(offeringRow?.id);

  const offeringGet=await worker.fetch(new Request(`https://ims.example/offerings/${offeringRow.id}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(offeringGet.status,200);
  const offeringHtml=await offeringGet.text(),enrollCsrf=csrfFromHtml(offeringHtml),enrollCookie=cookiePair(offeringGet);
  assert.match(offeringHtml,/Academic Network/);
  assert.match(offeringHtml,/Security Fundamentals/);
  assert.match(offeringHtml,/Semester 1 · 2026/);
  assert.match(offeringHtml,/Test Student/);
  const enrollPost=await worker.fetch(postRequest(`/offerings/${offeringRow.id}/enroll`,{
    _csrf:enrollCsrf,student_id:String(studentRow.id)
  },`${sidCookie}; ${enrollCookie}`),env);
  assert.equal(enrollPost.status,303);
  const enrollmentRow=await DB.prepare("SELECT id,status FROM enrollments WHERE student_id=? AND offering_id=?").bind(studentRow.id,offeringRow.id).first();
  assert.equal(enrollmentRow?.status,"ACTIVE");

  const connectedStudent=await worker.fetch(new Request(`https://ims.example/students/${studentRow.id}`,{headers:{cookie:sidCookie}}),env);
  const connectedStudentHtml=await connectedStudent.text();
  assert.match(connectedStudentHtml,/Security Fundamentals/);
  assert.match(connectedStudentHtml,/Semester 1 · 2026/);
  assert.match(connectedStudentHtml,/Dr Test Lecturer/);

  const connectedLecturer=await worker.fetch(new Request(`https://ims.example/lecturers/${Number(lecturerCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.match(await connectedLecturer.text(),/SEC101-S1-GA/);
  const connectedSubject=await worker.fetch(new Request(`https://ims.example/subjects/${Number(subjectCreated.meta.last_row_id)}`,{headers:{cookie:sidCookie}}),env);
  assert.match(await connectedSubject.text(),/Semester 1 · 2026/);
  const termProfile=await worker.fetch(new Request(`https://ims.example/terms/${termRow.id}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(termProfile.status,200);
  assert.match(await termProfile.text(),/Security Fundamentals/);
  const enrollmentList=await worker.fetch(new Request(`https://ims.example/enrollments?offering=${offeringRow.id}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(enrollmentList.status,200);
  assert.match(await enrollmentList.text(),/Test Student/);

  // Central enrollment screen is discoverable and can link another eligible student.
  const secondStudent=await DB.prepare("INSERT INTO students(student_code,full_name,batch_id,group_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind("S-002","Second Student",Number(batchCreated.meta.last_row_id),Number(groupCreated.meta.last_row_id),"ACTIVE",tsAcademic,tsAcademic).run();
  const enrollNewGet=await worker.fetch(new Request(`https://ims.example/enrollments/new?student=${Number(secondStudent.meta.last_row_id)}&offering=${offeringRow.id}`,{headers:{cookie:sidCookie}}),env);
  assert.equal(enrollNewGet.status,200);
  const enrollNewHtml=await enrollNewGet.text(),enrollNewCsrf=csrfFromHtml(enrollNewHtml),enrollNewCookie=cookiePair(enrollNewGet);
  assert.match(enrollNewHtml,/Link Student to Course/);
  assert.match(enrollNewHtml,/data-enrollment-offering/);
  assert.match(enrollNewHtml,/data-enrollment-student/);
  assert.match(enrollNewHtml,/Choose the class first/);
  const enrollNewPost=await worker.fetch(postRequest("/enrollments/new",{_csrf:enrollNewCsrf,student_id:String(secondStudent.meta.last_row_id),offering_id:String(offeringRow.id)},`${sidCookie}; ${enrollNewCookie}`),env);
  assert.equal(enrollNewPost.status,303);
  assert.ok(await DB.prepare("SELECT id FROM enrollments WHERE student_id=? AND offering_id=?").bind(Number(secondStudent.meta.last_row_id),offeringRow.id).first());

  // Student academic history is preserved: permanent deletion is blocked once enrollment history exists.
  const deleteGet=await worker.fetch(new Request(`https://ims.example/students/${studentRow.id}/delete`,{headers:{cookie:sidCookie}}),env);
  const deleteHtml=await deleteGet.text();
  assert.match(deleteHtml,/Permanent delete is blocked/);
  assert.match(deleteHtml,/academic history|enrollment record/i);
  assert.doesNotMatch(deleteHtml,/Delete Permanently/);
  assert.ok(await DB.prepare("SELECT id FROM students WHERE id=?").bind(studentRow.id).first());

  // Session management supports revoking a specific secondary device without ending the current session.
  const extraSession=await createSession(DB,1,new Request("https://ims.example/login",{headers:{"user-agent":"Secondary Test Device"}}),false);
  assert.ok(extraSession.token);
  const sessionsGet=await worker.fetch(new Request("https://ims.example/sessions",{headers:{cookie:sidCookie}}),env);
  const sessionsHtml=await sessionsGet.text(),sessionsCsrf=csrfFromHtml(sessionsHtml),sessionsCookie=cookiePair(sessionsGet);
  assert.match(sessionsHtml,/Current session/);
  assert.match(sessionsHtml,/Secondary Test Device/);
  const secondaryRow=await DB.prepare("SELECT id FROM sessions WHERE user_id=1 AND user_agent='Secondary Test Device' AND revoked_at IS NULL").first();
  const revokeOne=await worker.fetch(postRequest(`/sessions/${secondaryRow.id}/revoke`,{_csrf:sessionsCsrf},`${sidCookie}; ${sessionsCookie}`),env);
  assert.equal(revokeOne.status,303);
  const revoked=await DB.prepare("SELECT revoked_at FROM sessions WHERE id=?").bind(secondaryRow.id).first();
  assert.ok(revoked.revoked_at);

  const settingsPage=await worker.fetch(new Request("https://ims.example/settings",{headers:{cookie:sidCookie}}),env);
  assert.match(await settingsPage.text(),/Production Diagnostics/);

  const reportExport=await worker.fetch(new Request("https://ims.example/reports/export.csv",{headers:{cookie:sidCookie}}),env);
  assert.equal(reportExport.status,200);
  assert.match(reportExport.headers.get("content-type"),/text\/csv/);
  assert.match(await reportExport.text(),/report_type,label,count/);

  const logoutGet=await worker.fetch(new Request("https://ims.example/logout",{headers:{cookie:sidCookie}}),env);
  assert.equal(logoutGet.status,200);
  assert.match(await logoutGet.text(),/Sign out\?/i);

  const schemaVersion=await DB.prepare("SELECT value FROM app_meta WHERE key='schema_version'").first();
  assert.equal(schemaVersion.value,"4");

  const wrongMethod=await worker.fetch(new Request("https://ims.example/login",{method:"PUT"}),env);
  assert.equal(wrongMethod.status,405);
  assert.match(wrongMethod.headers.get("allow"),/GET/);
  assert.match(wrongMethod.headers.get("allow"),/POST/);
});


test("course offering infers group batch and rejects out-of-cohort enrollment",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Academic Owner","academic-owner@example.com","","not-used","OWNER","ACTIVE",ts,ts).run();
  const batchA=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Batch Eligible","BE","ACTIVE",ts,ts).run();
  const batchB=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Batch Other","BO","ACTIVE",ts,ts).run();
  const groupA=await DB.prepare("INSERT INTO groups_tbl(name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Eligible Group",Number(batchA.meta.last_row_id),"ACTIVE",ts,ts).run();
  const groupB=await DB.prepare("INSERT INTO groups_tbl(name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Other Group",Number(batchB.meta.last_row_id),"ACTIVE",ts,ts).run();
  const subject=await DB.prepare("INSERT INTO subjects(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Cohort Security","COH101","ACTIVE",ts,ts).run();
  const term=await DB.prepare("INSERT INTO academic_terms(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Cohort Term","CT1","ACTIVE",ts,ts).run();
  const outsider=await DB.prepare("INSERT INTO students(student_code,full_name,batch_id,group_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind("OUT-1","Outside Student",Number(batchB.meta.last_row_id),Number(groupB.meta.last_row_id),"ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(owner.meta.last_row_id),new Request("https://ims.example/login"),false),sid=`sid=${session.token}`;

  const offeringsGet=await worker.fetch(new Request("https://ims.example/offerings",{headers:{cookie:sid}}),env);
  const offeringsHtml=await offeringsGet.text(),csrf=csrfFromHtml(offeringsHtml),csrfCookie=cookiePair(offeringsGet);
  const created=await worker.fetch(postRequest("/offerings",{
    _csrf:csrf,subject_id:String(subject.meta.last_row_id),term_id:String(term.meta.last_row_id),lecturer_id:"",batch_id:"",group_id:String(groupA.meta.last_row_id),code:"COH101-G",status:"ACTIVE"
  },`${sid}; ${csrfCookie}`),env);
  assert.equal(created.status,303);
  const offering=await DB.prepare("SELECT id,batch_id,group_id FROM course_offerings WHERE code=?").bind("COH101-G").first();
  assert.equal(Number(offering.batch_id),Number(batchA.meta.last_row_id));
  assert.equal(Number(offering.group_id),Number(groupA.meta.last_row_id));

  const offeringGet=await worker.fetch(new Request(`https://ims.example/offerings/${offering.id}`,{headers:{cookie:sid}}),env);
  const offeringHtml=await offeringGet.text();
  assert.doesNotMatch(offeringHtml,/Outside Student/);
  // Tamper with a valid CSRF token from the offering-management page; the server must still reject an ineligible student.
  const rejected=await worker.fetch(postRequest(`/offerings/${offering.id}/enroll`,{_csrf:csrf,student_id:String(outsider.meta.last_row_id)},`${sid}; ${csrfCookie}`),env);
  assert.equal(rejected.status,303);
  const rejectedLocation=decodeURIComponent(rejected.headers.get("location")||"").replaceAll("+"," ");
  assert.match(rejectedLocation,/Outside Student|Other Group|course offering is for Eligible Group/i);
  const count=await DB.prepare("SELECT COUNT(*) n FROM enrollments WHERE offering_id=?").bind(offering.id).first();
  assert.equal(Number(count.n),0);
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
    "/dashboard","/students","/students/new","/students/import","/batches","/lecturers","/subjects","/groups","/terms","/offerings","/enrollments",
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


test("student profile respects view permission and hides write actions for viewer",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const userCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Read Only","readonly@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const studentCreated=await DB.prepare("INSERT INTO students(student_code,full_name,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("VIEW-1","View Only Student","ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(userCreated.meta.last_row_id),new Request("https://ims.example/login"),false);
  const cookie=`sid=${session.token}`;
  const response=await worker.fetch(new Request(`https://ims.example/students/${Number(studentCreated.meta.last_row_id)}`,{headers:{cookie}}),env);
  assert.equal(response.status,200);
  const body=await response.text();
  assert.match(body,/View Only Student/);
  assert.doesNotMatch(body,/Edit Student/);
  assert.doesNotMatch(body,/>Delete<\/a>/);
});


test("users and permissions upgrade renders profiles, filters, grouped permissions and audit tabs",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const ownerCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Owner Admin","owner-users@example.com","0100","not-used","OWNER","ACTIVE",ts,ts).run();
  const targetCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at,last_login_at) VALUES(?,?,?,?,?,?,?,?,?)").bind("Target Viewer","target@example.com","0111","not-used","VIEWER","ACTIVE",ts,ts,ts).run();
  const targetId=Number(targetCreated.meta.last_row_id);
  await DB.batch([
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(targetId,"students.delete",1),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(targetId,"reports.view",0),
    DB.prepare("INSERT INTO activity_logs(user_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,?)").bind(targetId,"PROFILE_UPDATE","user",targetId,"Updated profile",ts),
    DB.prepare("INSERT INTO password_reset_requests(user_id,requested_email,requested_at) VALUES(?,?,?)").bind(targetId,"target@example.com",ts)
  ]);
  await createSession(DB,targetId,new Request("https://ims.example/login"),false);
  const ownerSession=await createSession(DB,Number(ownerCreated.meta.last_row_id),new Request("https://ims.example/login"),false);
  const cookie=`sid=${ownerSession.token}`;

  const list=await worker.fetch(new Request("https://ims.example/users?q=Target&role=VIEWER&status=ACTIVE",{headers:{cookie}}),env);
  assert.equal(list.status,200);
  const listHtml=await list.text();
  assert.match(listHtml,/Search &amp; Filters|Search & Filters/);
  assert.match(listHtml,/Target Viewer/);
  assert.match(listHtml,/Permissions/);
  assert.match(listHtml,/Last Activity/);
  assert.match(listHtml,/1 pending/);

  const detail=await worker.fetch(new Request(`https://ims.example/users/${targetId}`,{headers:{cookie}}),env);
  assert.equal(detail.status,200);
  const detailHtml=await detail.text();
  assert.match(detailHtml,/User Details/);
  assert.match(detailHtml,/Security &amp; Activity|Security & Activity/);
  assert.match(detailHtml,/Effective Permissions/);
  assert.match(detailHtml,/Active Sessions/);

  const permissions=await worker.fetch(new Request(`https://ims.example/users/${targetId}?tab=permissions`,{headers:{cookie}}),env);
  assert.equal(permissions.status,200);
  const permissionHtml=await permissions.text();
  assert.match(permissionHtml,/Students/);
  assert.match(permissionHtml,/Users &amp; Security|Users & Security/);
  assert.match(permissionHtml,/User allow/);
  assert.match(permissionHtml,/User deny/);

  const activity=await worker.fetch(new Request(`https://ims.example/users/${targetId}?tab=activity`,{headers:{cookie}}),env);
  assert.equal(activity.status,200);
  assert.match(await activity.text(),/PROFILE_UPDATE/);

  const edit=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{headers:{cookie}}),env);
  assert.equal(edit.status,200);
  const editHtml=await edit.text();
  assert.match(editHtml,/data-reset-role-defaults/);
  assert.match(editHtml,/data-permission-action="all"/);
  assert.match(editHtml,/Role defaults are inherited/);
});

test("user management enforces role hierarchy and blocks permission escalation",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const actorCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Limited Manager","limited@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const actorId=Number(actorCreated.meta.last_row_id);
  await DB.batch([
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(actorId,"users.view",1),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(actorId,"users.manage",1)
  ]);
  const targetCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Peer Viewer","peer@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const targetId=Number(targetCreated.meta.last_row_id);
  const session=await createSession(DB,actorId,new Request("https://ims.example/login"),false),sid=`sid=${session.token}`;

  const editGet=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{headers:{cookie:sid}}),env);
  assert.equal(editGet.status,200);
  const html=await editGet.text(),csrf=csrfFromHtml(html),csrfCookie=cookiePair(editGet),cookie=`${sid}; ${csrfCookie}`;

  const promote=new URLSearchParams({_csrf:csrf,full_name:"Peer Viewer",email:"peer@example.com",phone:"",role:"ADMIN",status:"ACTIVE"});
  promote.append("permissions","users.view");promote.append("permissions","users.manage");
  const promoteResponse=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{method:"POST",headers:{origin:"https://ims.example","sec-fetch-site":"same-origin",cookie},body:promote}),env);
  assert.equal(promoteResponse.status,403);
  assert.equal((await DB.prepare("SELECT role FROM users WHERE id=?").bind(targetId).first()).role,"VIEWER");

  const tamper=new URLSearchParams({_csrf:csrf,full_name:"Peer Viewer",email:"peer@example.com",phone:"",role:"VIEWER",status:"ACTIVE"});
  tamper.append("permissions","users.view");tamper.append("permissions","users.manage");tamper.append("permissions","settings.manage");
  const tamperResponse=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{method:"POST",headers:{origin:"https://ims.example","sec-fetch-site":"same-origin",cookie},body:tamper}),env);
  assert.equal(tamperResponse.status,403);
});

test("disabling a user revokes sessions and writes security audit entries",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const ownerCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Owner Security","owner-sec@example.com","","not-used","OWNER","ACTIVE",ts,ts).run();
  const targetCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Disable Me","disable@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const ownerId=Number(ownerCreated.meta.last_row_id),targetId=Number(targetCreated.meta.last_row_id);
  const targetSession=await createSession(DB,targetId,new Request("https://ims.example/login"),false);
  const ownerSession=await createSession(DB,ownerId,new Request("https://ims.example/login"),false),sid=`sid=${ownerSession.token}`;
  const editGet=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{headers:{cookie:sid}}),env);
  const editHtml=await editGet.text(),csrf=csrfFromHtml(editHtml),csrfCookie=cookiePair(editGet),cookie=`${sid}; ${csrfCookie}`;
  const form=new URLSearchParams({_csrf:csrf,full_name:"Disable Me",email:"disable@example.com",phone:"",role:"VIEWER",status:"DISABLED"});
  for(const permission of ["dashboard.view","students.view","batches.view","lecturers.view","subjects.view","groups.view","reports.view","sessions.manage"])form.append("permissions",permission);
  const response=await worker.fetch(new Request(`https://ims.example/users/${targetId}/edit`,{method:"POST",headers:{origin:"https://ims.example","sec-fetch-site":"same-origin",cookie},body:form}),env);
  assert.equal(response.status,303);
  assert.equal(response.headers.get("location"),`/users/${targetId}?msg=User+updated`);
  assert.equal((await DB.prepare("SELECT status FROM users WHERE id=?").bind(targetId).first()).status,"DISABLED");
  const revoked=await DB.prepare("SELECT revoked_at FROM sessions WHERE token_hash=?").bind(await (await import("../src/security.js")).sha256(targetSession.token)).first();
  assert.ok(revoked.revoked_at);
  const audits=(await DB.prepare("SELECT action FROM activity_logs WHERE entity_type='user' AND entity_id=? ORDER BY id").bind(String(targetId)).all()).results||[];
  assert.ok(audits.some(row=>row.action==="USER_STATUS_CHANGE"));
});

test("connected academic profiles respect related-module view permissions",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const userCreated=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
    .bind("Restricted Viewer","restricted@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const userId=Number(userCreated.meta.last_row_id);
  await DB.batch([
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"groups.view",0),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"students.view",0),
    DB.prepare("INSERT INTO user_permissions(user_id,permission,allowed) VALUES(?,?,?)").bind(userId,"offerings.view",0)
  ]);
  const batch=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Private Batch","PB","ACTIVE",ts,ts).run();
  const batchId=Number(batch.meta.last_row_id);
  const group=await DB.prepare("INSERT INTO groups_tbl(name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Hidden Group",batchId,"ACTIVE",ts,ts).run();
  await DB.prepare("INSERT INTO students(student_code,full_name,batch_id,group_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
    .bind("H-001","Hidden Student",batchId,Number(group.meta.last_row_id),"ACTIVE",ts,ts).run();
  const session=await createSession(DB,userId,new Request("https://ims.example/login"),false),cookie=`sid=${session.token}`;

  const batchProfile=await worker.fetch(new Request(`https://ims.example/batches/${batchId}`,{headers:{cookie}}),env);
  assert.equal(batchProfile.status,200);
  const html=await batchProfile.text();
  assert.match(html,/groups\.view required/);
  assert.match(html,/students\.view required/);
  assert.match(html,/offerings\.view required/);
  assert.doesNotMatch(html,/Hidden Group/);
  assert.doesNotMatch(html,/Hidden Student/);

  const groupProfile=await worker.fetch(new Request(`https://ims.example/groups/${Number(group.meta.last_row_id)}`,{headers:{cookie}}),env);
  assert.equal(groupProfile.status,403);
});

test("V1.4.3 safe actions block destructive changes and expose missing lifecycle controls",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"integration-pepper"};
  await ensureSchema(DB);
  const ts=new Date().toISOString();
  const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Actions Owner","actions-owner@example.com","","not-used","OWNER","ACTIVE",ts,ts).run();
  const ownerId=Number(owner.meta.last_row_id),session=await createSession(DB,ownerId,new Request("https://ims.example/login"),false),sid=`sid=${session.token}`,currentSessionHash=await sha256(session.token);

  const emptyBatch=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Empty Archived Batch","EAB","INACTIVE",ts,ts).run();
  const activeBatch=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Live Batch","LB","ACTIVE",ts,ts).run();
  await DB.prepare("INSERT INTO groups_tbl(name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Live Group",Number(activeBatch.meta.last_row_id),"ACTIVE",ts,ts).run();

  const batchesGet=await worker.fetch(new Request("https://ims.example/batches",{headers:{cookie:sid}}),env);
  const batchesHtml=await batchesGet.text(),csrf=csrfFromHtml(batchesHtml),csrfCookie=cookiePair(batchesGet),cookie=`${sid}; ${csrfCookie}`;
  assert.match(batchesHtml,/Deactivate/);
  assert.match(batchesHtml,/Activate/);
  assert.match(batchesHtml,/Delete/);
  assert.match(batchesHtml,/Bulk actions/);
  assert.match(batchesHtml,/action="\/batches\/bulk"/);
  assert.match(batchesHtml,/data-bulk-toggle="bulk-batches"/);

  const blockedDeactivate=await worker.fetch(postRequest(`/batches/${Number(activeBatch.meta.last_row_id)}/status`,{_csrf:csrf,status:"INACTIVE"},cookie),env);
  assert.equal(blockedDeactivate.status,303);
  assert.match(blockedDeactivate.headers.get("location")||"",/Deactivate%20blocked|Deactivate\+blocked/);
  assert.equal((await DB.prepare("SELECT status FROM batches WHERE id=?").bind(Number(activeBatch.meta.last_row_id)).first()).status,"ACTIVE");

  const bulkActivate=await worker.fetch(postRequest("/batches/bulk",{_csrf:csrf,action:"ACTIVATE",ids:String(Number(emptyBatch.meta.last_row_id))},cookie),env);
  assert.equal(bulkActivate.status,303);
  assert.equal((await DB.prepare("SELECT status FROM batches WHERE id=?").bind(Number(emptyBatch.meta.last_row_id)).first()).status,"ACTIVE");
  const bulkDeactivate=await worker.fetch(postRequest("/batches/bulk",{_csrf:csrf,action:"DEACTIVATE",ids:String(Number(emptyBatch.meta.last_row_id))},cookie),env);
  assert.equal(bulkDeactivate.status,303);
  assert.equal((await DB.prepare("SELECT status FROM batches WHERE id=?").bind(Number(emptyBatch.meta.last_row_id)).first()).status,"INACTIVE");

  const safeDelete=await worker.fetch(postRequest(`/batches/${Number(emptyBatch.meta.last_row_id)}/delete`,{_csrf:csrf},cookie),env);
  assert.equal(safeDelete.status,303);
  assert.equal(await DB.prepare("SELECT id FROM batches WHERE id=?").bind(Number(emptyBatch.meta.last_row_id)).first(),null);

  const subject=await DB.prepare("INSERT INTO subjects(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Actions Subject","ACT101","ACTIVE",ts,ts).run();
  const term=await DB.prepare("INSERT INTO academic_terms(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Actions Term","AT1","ACTIVE",ts,ts).run();
  const sourceOffering=await DB.prepare("INSERT INTO course_offerings(subject_id,term_id,code,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(Number(subject.meta.last_row_id),Number(term.meta.last_row_id),"ACT101-SOURCE","INACTIVE",ts,ts).run();

  const copyGet=await worker.fetch(new Request(`https://ims.example/offerings?copy=${Number(sourceOffering.meta.last_row_id)}`,{headers:{cookie:sid}}),env);
  const copyHtml=await copyGet.text();
  assert.match(copyHtml,/Duplicate Course Offering/);
  assert.match(copyHtml,/name="code" maxlength="100" value=""/);
  assert.match(copyHtml,/name="status"><option[^>]*>ACTIVE<\/option><option selected>INACTIVE<\/option>/);

  const offeringsGet=await worker.fetch(new Request("https://ims.example/offerings",{headers:{cookie:sid}}),env);
  const offeringsHtml=await offeringsGet.text(),offCsrf=csrfFromHtml(offeringsHtml),offCookie=cookiePair(offeringsGet);
  assert.match(offeringsHtml,/Duplicate/);
  const offeringDelete=await worker.fetch(postRequest(`/offerings/${Number(sourceOffering.meta.last_row_id)}/delete`,{_csrf:offCsrf},`${sid}; ${offCookie}`),env);
  assert.equal(offeringDelete.status,303);
  assert.equal(await DB.prepare("SELECT id FROM course_offerings WHERE id=?").bind(Number(sourceOffering.meta.last_row_id)).first(),null);

  const liveOffering=await DB.prepare("INSERT INTO course_offerings(subject_id,term_id,code,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(Number(subject.meta.last_row_id),Number(term.meta.last_row_id),"ACT101-LIVE","ACTIVE",ts,ts).run();
  const student=await DB.prepare("INSERT INTO students(student_code,full_name,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("ACT-STU","Action Student","ACTIVE",ts,ts).run();
  const enrollment=await DB.prepare("INSERT INTO enrollments(student_id,offering_id,status,enrolled_at,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(Number(student.meta.last_row_id),Number(liveOffering.meta.last_row_id),"ACTIVE",ts,ts,ts).run();
  const enrollmentId=Number(enrollment.meta.last_row_id);

  const studentsGet=await worker.fetch(new Request("https://ims.example/students",{headers:{cookie:sid}}),env);
  const studentsHtml=await studentsGet.text(),studentCsrf=csrfFromHtml(studentsHtml),studentCookie=cookiePair(studentsGet);
  assert.match(studentsHtml,/action="\/students\/bulk"/);
  const blockedStudentBulk=await worker.fetch(postRequest("/students/bulk",{_csrf:studentCsrf,action:"DEACTIVATE",ids:String(Number(student.meta.last_row_id))},`${sid}; ${studentCookie}`),env);
  assert.equal(blockedStudentBulk.status,303);
  assert.equal((await DB.prepare("SELECT status FROM students WHERE id=?").bind(Number(student.meta.last_row_id)).first()).status,"ACTIVE");

  const enrollmentsGet=await worker.fetch(new Request("https://ims.example/enrollments",{headers:{cookie:sid}}),env);
  const enrollmentHtml=await enrollmentsGet.text(),enCsrf=csrfFromHtml(enrollmentHtml),enCookie=cookiePair(enrollmentsGet),enCookieAll=`${sid}; ${enCookie}`;
  const activeRemove=await worker.fetch(postRequest(`/enrollments/${enrollmentId}/delete`,{_csrf:enCsrf},enCookieAll),env);
  assert.equal(activeRemove.status,303);
  assert.ok(await DB.prepare("SELECT id FROM enrollments WHERE id=?").bind(enrollmentId).first());
  const drop=await worker.fetch(postRequest(`/enrollments/${enrollmentId}/status`,{_csrf:enCsrf,status:"DROPPED"},enCookieAll),env);
  assert.equal(drop.status,303);
  const droppedPage=await worker.fetch(new Request("https://ims.example/enrollments?status=DROPPED",{headers:{cookie:sid}}),env);
  const droppedHtml=await droppedPage.text(),dropCsrf=csrfFromHtml(droppedHtml),dropCookie=cookiePair(droppedPage);
  assert.match(droppedHtml,/Remove/);
  const remove=await worker.fetch(postRequest(`/enrollments/${enrollmentId}/delete`,{_csrf:dropCsrf},`${sid}; ${dropCookie}`),env);
  assert.equal(remove.status,303);
  assert.equal(await DB.prepare("SELECT id FROM enrollments WHERE id=?").bind(enrollmentId).first(),null);

  const target=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Action User","action-user@example.com","","not-used","VIEWER","ACTIVE",ts,ts).run();
  const targetId=Number(target.meta.last_row_id);
  await DB.prepare("INSERT INTO password_reset_requests(user_id,requested_email,requested_at) VALUES(?,?,?)").bind(targetId,"action-user@example.com",ts).run();
  await createSession(DB,targetId,new Request("https://ims.example/login"),false);
  const userGet=await worker.fetch(new Request(`https://ims.example/users/${targetId}`,{headers:{cookie:sid}}),env);
  const userHtml=await userGet.text(),userCsrf=csrfFromHtml(userHtml),userCookie=cookiePair(userGet),userCookieAll=`${sid}; ${userCookie}`;
  assert.match(userHtml,/Disable User/);
  assert.match(userHtml,/Dismiss Reset Request/);
  const dismiss=await worker.fetch(postRequest(`/users/${targetId}/reset-requests/resolve`,{_csrf:userCsrf},userCookieAll),env);
  assert.equal(dismiss.status,303);
  assert.ok((await DB.prepare("SELECT resolved_at FROM password_reset_requests WHERE user_id=? ORDER BY id DESC LIMIT 1").bind(targetId).first()).resolved_at);
  const disable=await worker.fetch(postRequest(`/users/${targetId}/status`,{_csrf:userCsrf,status:"DISABLED"},userCookieAll),env);
  assert.equal(disable.status,303);
  assert.equal((await DB.prepare("SELECT status FROM users WHERE id=?").bind(targetId).first()).status,"DISABLED");
  const activeSessions=await DB.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id=? AND revoked_at IS NULL").bind(targetId).first();
  assert.equal(Number(activeSessions.n),0);
});


test("V1.4.3 generates automatic codes for blank code fields while preserving manual overrides",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"auto-code-pepper"};await ensureSchema(DB);
  const ts=new Date().toISOString();const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Auto Owner","auto@example.com","","x","OWNER","ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(owner.meta.last_row_id),new Request("https://ims.example/login",{headers:{"user-agent":"Auto Code Test"}}),false),sid=`sid=${session.token}`;

  const batchGet=await worker.fetch(new Request("https://ims.example/batches",{headers:{cookie:sid}}),env),batchHtml=await batchGet.text(),csrf=csrfFromHtml(batchHtml),csrfCookie=cookiePair(batchGet);
  assert.match(batchHtml,/Automatic: BAT-000001/);
  const batchPost=await worker.fetch(postRequest("/batches",{_csrf:csrf,name:"Auto Batch",extra:"",status:"ACTIVE"},`${sid}; ${csrfCookie}`),env);assert.equal(batchPost.status,303);
  const batch=await DB.prepare("SELECT id,code FROM batches WHERE name='Auto Batch'").first();assert.equal(batch.code,`BAT-${String(batch.id).padStart(6,"0")}`);

  const subjectGet=await worker.fetch(new Request("https://ims.example/subjects",{headers:{cookie:sid}}),env),subjectHtml=await subjectGet.text(),subjectCsrf=csrfFromHtml(subjectHtml),subjectCookie=cookiePair(subjectGet);
  assert.match(subjectHtml,/Automatic: SUB-000001/);
  const subjectPost=await worker.fetch(postRequest("/subjects",{_csrf:subjectCsrf,name:"Auto Subject",extra:"",relation_id:"",status:"ACTIVE"},`${sid}; ${subjectCookie}`),env);assert.equal(subjectPost.status,303);
  const subject=await DB.prepare("SELECT id,code FROM subjects WHERE name='Auto Subject'").first();assert.equal(subject.code,`SUB-${String(subject.id).padStart(6,"0")}`);

  const studentGet=await worker.fetch(new Request("https://ims.example/students/new",{headers:{cookie:sid}}),env),studentHtml=await studentGet.text(),studentCsrf=csrfFromHtml(studentHtml),studentCookie=cookiePair(studentGet);
  const studentPost=await worker.fetch(postRequest("/students/new",{_csrf:studentCsrf,student_code:"",full_name:"Auto Student",email:"",phone:"",gender:"",birth_date:"",batch_id:String(batch.id),group_id:"",status:"ACTIVE",notes:""},`${sid}; ${studentCookie}`),env);assert.equal(studentPost.status,303);
  const student=await DB.prepare("SELECT id,student_code FROM students WHERE full_name='Auto Student'").first();assert.equal(student.student_code,`STU-${String(student.id).padStart(6,"0")}`);

  const termGet=await worker.fetch(new Request("https://ims.example/terms",{headers:{cookie:sid}}),env),termHtml=await termGet.text(),termCsrf=csrfFromHtml(termHtml),termCookie=cookiePair(termGet);assert.match(termHtml,/Automatic: TRM-000001/);
  const termPost=await worker.fetch(postRequest("/terms",{_csrf:termCsrf,name:"Auto Term",code:"",start_date:"2026-09-01",end_date:"2026-12-31",status:"ACTIVE"},`${sid}; ${termCookie}`),env);assert.equal(termPost.status,303);
  const term=await DB.prepare("SELECT id,code FROM academic_terms WHERE name='Auto Term'").first();assert.equal(term.code,`TRM-${String(term.id).padStart(6,"0")}`);

  const offeringGet=await worker.fetch(new Request("https://ims.example/offerings",{headers:{cookie:sid}}),env),offeringHtml=await offeringGet.text(),offeringCsrf=csrfFromHtml(offeringHtml),offeringCookie=cookiePair(offeringGet);assert.match(offeringHtml,/Automatic: OFF-000001/);
  const offeringPost=await worker.fetch(postRequest("/offerings",{_csrf:offeringCsrf,subject_id:String(subject.id),term_id:String(term.id),lecturer_id:"",batch_id:String(batch.id),group_id:"",code:"",status:"ACTIVE"},`${sid}; ${offeringCookie}`),env);assert.equal(offeringPost.status,303);
  const offering=await DB.prepare("SELECT id,code FROM course_offerings WHERE subject_id=? AND term_id=?").bind(subject.id,term.id).first();assert.equal(offering.code,`OFF-${String(offering.id).padStart(6,"0")}`);
});

test("V1.4.6 Custom Delete previews dependencies and requires explicit permanent-delete confirmation",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"custom-delete-pepper"};await ensureSchema(DB);
  const ts=new Date().toISOString();const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Delete Owner","delete@example.com","","x","OWNER","ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(owner.meta.last_row_id),new Request("https://ims.example/login"),false),sid=`sid=${session.token}`;

  const batch=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Disposable Batch","DEL-BAT","ACTIVE",ts,ts).run(),batchId=Number(batch.meta.last_row_id);
  const page=await worker.fetch(new Request(`https://ims.example/custom-delete/batches/${batchId}`,{headers:{cookie:sid}}),env);assert.equal(page.status,200);
  const pageHtml=await page.text();assert.match(pageHtml,/Custom Delete/);assert.match(pageHtml,/Dependency Check/);assert.match(pageHtml,/Permanent Delete/);assert.match(pageHtml,/DEL-BAT/);
  const csrf=csrfFromHtml(pageHtml),csrfCookie=cookiePair(page);

  const wrong=await worker.fetch(postRequest(`/custom-delete/batches/${batchId}`,{_csrf:csrf,action:"delete",reason:"test cleanup",confirm_value:"WRONG",acknowledge:"yes"},`${sid}; ${csrfCookie}`),env);assert.equal(wrong.status,303);assert.match(wrong.headers.get("location"),/Confirmation/);
  assert.ok(await DB.prepare("SELECT id FROM batches WHERE id=?").bind(batchId).first());

  const page2=await worker.fetch(new Request(`https://ims.example/custom-delete/batches/${batchId}`,{headers:{cookie:sid}}),env),html2=await page2.text(),csrf2=csrfFromHtml(html2),cookie2=cookiePair(page2);
  const deleted=await worker.fetch(postRequest(`/custom-delete/batches/${batchId}`,{_csrf:csrf2,action:"delete",reason:"Created by mistake",confirm_value:"DEL-BAT",acknowledge:"yes"},`${sid}; ${cookie2}`),env);assert.equal(deleted.status,303);assert.equal(await DB.prepare("SELECT id FROM batches WHERE id=?").bind(batchId).first(),null);
  const auditRow=await DB.prepare("SELECT action,details FROM activity_logs WHERE action='CUSTOM_DELETE_PERMANENT' ORDER BY id DESC LIMIT 1").first();assert.equal(auditRow.action,"CUSTOM_DELETE_PERMANENT");assert.match(auditRow.details,/Created by mistake/);
});


test("V1.4.8 Owner-only reset clears all data while preserving current Owner and session",async()=>{
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"keep-owner-reset-pepper"};await ensureSchema(DB);
  const ts=new Date().toISOString(),password="StrongReset123!",hash=await hashPassword(password,env.AUTH_PEPPER);
  const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Keep Owner","owner@example.com","01000000000",hash,"OWNER","ACTIVE",ts,ts).run();
  const ownerId=Number(owner.meta.last_row_id),session=await createSession(DB,ownerId,new Request("https://ims.example/login"),false),sid=`sid=${session.token}`,currentSessionHash=await sha256(session.token);
  const other=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Other User","other@example.com","",hash,"VIEWER","ACTIVE",ts,ts).run();
  await createSession(DB,Number(other.meta.last_row_id),new Request("https://ims.example/login"),false);
  await createSession(DB,ownerId,new Request("https://ims.example/login"),false);
  const batch=await DB.prepare("INSERT INTO batches(name,code,status,created_at,updated_at) VALUES(?,?,?,?,?)").bind("Reset Batch","RST","ACTIVE",ts,ts).run();
  await DB.prepare("INSERT INTO students(student_code,full_name,batch_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind("RST-001","Reset Student",Number(batch.meta.last_row_id),"ACTIVE",ts,ts).run();
  await DB.prepare("INSERT INTO activity_logs(user_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,?)").bind(ownerId,"TEST","test","1","seed",ts).run();

  const page=await worker.fetch(new Request("https://ims.example/settings/reset-all",{headers:{cookie:sid}}),env);assert.equal(page.status,200);
  const html=await page.text();assert.match(html,/Reset All Data/);assert.match(html,/Keep Owner/);assert.match(html,/KEEP OWNER AND DELETE ALL DATA/);
  const csrf=csrfFromHtml(html),csrfCookie=cookiePair(page),cookie=`${sid}; ${csrfCookie}`;

  const badPassword=await worker.fetch(postRequest("/settings/reset-all",{_csrf:csrf,current_password:"WrongPass",confirm_text:"KEEP OWNER AND DELETE ALL DATA",acknowledge:"yes"},cookie),env);
  assert.equal(badPassword.status,303);assert.ok(await DB.prepare("SELECT id FROM students WHERE student_code='RST-001'").first());

  const page2=await worker.fetch(new Request("https://ims.example/settings/reset-all",{headers:{cookie:sid}}),env),html2=await page2.text(),csrf2=csrfFromHtml(html2),csrfCookie2=cookiePair(page2);
  const reset=await worker.fetch(postRequest("/settings/reset-all",{_csrf:csrf2,current_password:password,confirm_text:"KEEP OWNER AND DELETE ALL DATA",acknowledge:"yes"},`${sid}; ${csrfCookie2}`),env);
  assert.equal(reset.status,303);assert.match(reset.headers.get("location")||"",/^\/dashboard\?/);assert.equal(reset.headers.get("set-cookie"),null);

  for(const table of ["students","enrollments","course_offerings","academic_terms","subjects","lecturers","groups_tbl","batches","user_permissions","activity_logs","login_attempts","password_reset_requests"]){
    const row=await DB.prepare(`SELECT COUNT(*) n FROM ${table}`).first();assert.equal(Number(row.n),0,`${table} should be empty after keep-owner reset`);
  }
  const users=(await DB.prepare("SELECT id,email,role,status,password_hash FROM users ORDER BY id").all()).results||[];assert.equal(users.length,1);assert.equal(Number(users[0].id),ownerId);assert.equal(users[0].email,"owner@example.com");assert.equal(users[0].role,"OWNER");assert.equal(users[0].status,"ACTIVE");assert.equal(users[0].password_hash,hash);
  const sessions=(await DB.prepare("SELECT user_id,token_hash,revoked_at FROM sessions ORDER BY id").all()).results||[];assert.equal(sessions.length,1);assert.equal(Number(sessions[0].user_id),ownerId);assert.equal(sessions[0].token_hash,currentSessionHash);assert.equal(sessions[0].revoked_at,null);
  const settings=(await DB.prepare("SELECT key,value FROM settings ORDER BY key").all()).results||[];assert.equal(settings.length,2);assert.ok(settings.some(r=>r.key==="organization_name"&&r.value==="Student Information System"));
  const meta=await DB.prepare("SELECT value FROM app_meta WHERE key='schema_version'").first();assert.equal(Number(meta.value),4);
  const dashboard=await worker.fetch(new Request("https://ims.example/dashboard",{headers:{cookie:sid}}),env);assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/Dashboard/);
});



test("V1.4.9 reset controls are visible to owner", async () => {
  const DB=new D1Mock(),env={DB,AUTH_PEPPER:"reset-button-test-pepper"};await ensureSchema(DB);
  const ts=new Date().toISOString(),hash=await hashPassword("OwnerPass123!",env.AUTH_PEPPER);
  const owner=await DB.prepare("INSERT INTO users(full_name,email,phone,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind("Owner User","owner-reset@example.com","",hash,"OWNER","ACTIVE",ts,ts).run();
  const session=await createSession(DB,Number(owner.meta.last_row_id),new Request("https://ims.example/login"),false),sid=`sid=${session.token}`;
  const settings=await worker.fetch(new Request("https://ims.example/settings",{headers:{cookie:sid}}),env);
  assert.equal(settings.status,200);
  const html=await settings.text();
  assert.match(html,/Reset All Data — Keep Owner/);
  assert.match(html,/href="\/settings\/reset-all"/);
  assert.match(html,/>Reset Data<\/span>/);
  const resetPage=await worker.fetch(new Request("https://ims.example/settings/reset-all",{headers:{cookie:sid}}),env);
  assert.equal(resetPage.status,200);
});
