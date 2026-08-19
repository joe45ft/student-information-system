import { clean, intId, normalizeEmail, oneOf, validEmail, validIsoDate } from "./utils.js";
import { ENROLLMENT_STATUSES, GENDERS, RECORD_STATUSES, USER_ROLES, USER_STATUSES } from "./config.js";

export function studentInput(body) {
  const studentCode = clean(body.student_code, 60);
  const fullName = clean(body.full_name, 150);
  const email = normalizeEmail(body.email);
  const phone = clean(body.phone, 40);
  const gender = clean(body.gender, 20);
  const birthDate = clean(body.birth_date, 10);
  const status = clean(body.status, 20) || "ACTIVE";
  const notes = clean(body.notes, 3000);
  const rawBatchId = clean(body.batch_id, 30);
  const rawGroupId = clean(body.group_id, 30);
  const batchId = intId(rawBatchId);
  const groupId = intId(rawGroupId);
  const errors = [];

  if (!fullName) errors.push("Enter the student’s full name before saving.");
  if (email && !validEmail(email)) errors.push("Enter a valid student email address, for example student@example.com.");
  if (!oneOf(gender, GENDERS)) errors.push("Choose a valid gender option from the list.");
  if (birthDate && (!validIsoDate(birthDate) || birthDate > new Date().toISOString().slice(0, 10))) errors.push("Enter a valid birth date that is not in the future.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Choose a valid student status.");
  if (rawBatchId && !batchId) errors.push("Choose a valid batch from the list.");
  if (rawGroupId && !groupId) errors.push("Choose a valid group from the list.");

  return {
    errors,
    value: { studentCode, fullName, email, phone, gender, birthDate, batchId, groupId, status, notes }
  };
}

export function userInput(body) {
  const fullName = clean(body.full_name, 120);
  const email = normalizeEmail(body.email);
  const phone = clean(body.phone, 40);
  const role = clean(body.role, 20);
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];

  if (!fullName) errors.push("Enter the student’s full name before saving.");
  if (!validEmail(email)) errors.push("Enter a valid email address, for example user@example.com.");
  if (!oneOf(role, USER_ROLES)) errors.push("Choose a valid user role from the list.");
  if (!oneOf(status, USER_STATUSES)) errors.push("Choose a valid user status.");

  return { errors, value: { fullName, email, phone, role, status } };
}

export function academicInput(body, { extra = "", relation = null } = {}) {
  const name = clean(body.name, 150);
  const extraValue = extra === "email" ? normalizeEmail(body.extra) : clean(body.extra, 100);
  const status = clean(body.status, 20) || "ACTIVE";
  const rawRelationId = clean(body.relation_id, 30);
  const relationId = intId(rawRelationId);
  const errors = [];

  if (!name) errors.push("Enter a name before saving.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Choose a valid status from the list.");
  if (extra === "email" && extraValue && !validEmail(extraValue)) errors.push("Enter a valid email address, for example user@example.com.");
  if (relation && rawRelationId && !relationId) errors.push(`Choose a valid ${relation.label.toLowerCase()} from the list.`);

  return { errors, value: { name, extraValue, status, relationId } };
}

export function settingsInput(body) {
  const organizationName = clean(body.organization_name, 150);
  const supportEmail = normalizeEmail(body.support_email);
  const errors = [];
  if (!organizationName) errors.push("Enter the organization name before saving.");
  if (supportEmail && !validEmail(supportEmail)) errors.push("Enter a valid support email address, for example support@example.com.");
  return { errors, value: { organizationName, supportEmail } };
}


export function termInput(body) {
  const name = clean(body.name, 150);
  const code = clean(body.code, 80);
  const startDate = clean(body.start_date, 10);
  const endDate = clean(body.end_date, 10);
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];
  if (!name) errors.push("Enter a term or semester name before saving.");
  if (startDate && !validIsoDate(startDate)) errors.push("Enter a valid start date.");
  if (endDate && !validIsoDate(endDate)) errors.push("Enter a valid end date.");
  if (startDate && endDate && endDate < startDate) errors.push("The end date must be the same as or later than the start date.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Choose a valid term status.");
  return { errors, value: { name, code, startDate, endDate, status } };
}

export function offeringInput(body) {
  const subjectId = intId(clean(body.subject_id, 30));
  const lecturerId = intId(clean(body.lecturer_id, 30));
  const termId = intId(clean(body.term_id, 30));
  const batchId = intId(clean(body.batch_id, 30));
  const groupId = intId(clean(body.group_id, 30));
  const code = clean(body.code, 100);
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];
  if (!subjectId) errors.push("Choose a subject for this course offering.");
  if (!termId) errors.push("Choose a term or semester for this course offering.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Choose a valid course offering status.");
  return { errors, value: { subjectId, lecturerId, termId, batchId, groupId, code, status } };
}

export function enrollmentInput(body) {
  const studentId = intId(clean(body.student_id, 30));
  const offeringId = intId(clean(body.offering_id, 30));
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];
  if (!studentId) errors.push("Choose a student to enroll.");
  if (!offeringId) errors.push("Choose a course offering for the student.");
  if (!oneOf(status, ENROLLMENT_STATUSES)) errors.push("Choose a valid enrollment status.");
  return { errors, value: { studentId, offeringId, status } };
}
