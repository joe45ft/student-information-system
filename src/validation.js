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

  if (!fullName) errors.push("Full name is required.");
  if (email && !validEmail(email)) errors.push("Enter a valid student email.");
  if (!oneOf(gender, GENDERS)) errors.push("Invalid gender value.");
  if (birthDate && (!validIsoDate(birthDate) || birthDate > new Date().toISOString().slice(0, 10))) errors.push("Enter a valid birth date.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Invalid student status.");
  if (rawBatchId && !batchId) errors.push("Invalid batch selection.");
  if (rawGroupId && !groupId) errors.push("Invalid group selection.");

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

  if (!fullName) errors.push("Full name is required.");
  if (!validEmail(email)) errors.push("Enter a valid email.");
  if (!oneOf(role, USER_ROLES)) errors.push("Invalid role.");
  if (!oneOf(status, USER_STATUSES)) errors.push("Invalid user status.");

  return { errors, value: { fullName, email, phone, role, status } };
}

export function academicInput(body, { extra = "", relation = null } = {}) {
  const name = clean(body.name, 150);
  const extraValue = extra === "email" ? normalizeEmail(body.extra) : clean(body.extra, 100);
  const status = clean(body.status, 20) || "ACTIVE";
  const rawRelationId = clean(body.relation_id, 30);
  const relationId = intId(rawRelationId);
  const errors = [];

  if (!name) errors.push("Name is required.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Invalid status.");
  if (extra === "email" && extraValue && !validEmail(extraValue)) errors.push("Enter a valid email.");
  if (relation && rawRelationId && !relationId) errors.push(`Invalid ${relation.label.toLowerCase()} selection.`);

  return { errors, value: { name, extraValue, status, relationId } };
}

export function settingsInput(body) {
  const organizationName = clean(body.organization_name, 150);
  const supportEmail = normalizeEmail(body.support_email);
  const errors = [];
  if (!organizationName) errors.push("Organization name is required.");
  if (supportEmail && !validEmail(supportEmail)) errors.push("Enter a valid support email.");
  return { errors, value: { organizationName, supportEmail } };
}


export function termInput(body) {
  const name = clean(body.name, 150);
  const code = clean(body.code, 80);
  const startDate = clean(body.start_date, 10);
  const endDate = clean(body.end_date, 10);
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];
  if (!name) errors.push("Term / semester name is required.");
  if (startDate && !validIsoDate(startDate)) errors.push("Enter a valid start date.");
  if (endDate && !validIsoDate(endDate)) errors.push("Enter a valid end date.");
  if (startDate && endDate && endDate < startDate) errors.push("End date cannot be before start date.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Invalid term status.");
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
  if (!subjectId) errors.push("Subject is required.");
  if (!termId) errors.push("Term / semester is required.");
  if (!oneOf(status, RECORD_STATUSES)) errors.push("Invalid offering status.");
  return { errors, value: { subjectId, lecturerId, termId, batchId, groupId, code, status } };
}

export function enrollmentInput(body) {
  const studentId = intId(clean(body.student_id, 30));
  const offeringId = intId(clean(body.offering_id, 30));
  const status = clean(body.status, 20) || "ACTIVE";
  const errors = [];
  if (!studentId) errors.push("Student is required.");
  if (!offeringId) errors.push("Course offering is required.");
  if (!oneOf(status, ENROLLMENT_STATUSES)) errors.push("Invalid enrollment status.");
  return { errors, value: { studentId, offeringId, status } };
}
