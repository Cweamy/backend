// repositories/periods.repository.js
const db = require('../db/knex');
const TABLE = 'evaluation_periods';

// ดึงทั้งหมด
exports.findAll = async () => {
  return db(TABLE).select('*').orderBy('id', 'desc');
};

// ดึงรอบเดียว
exports.findById = async (id) => {
  return db(TABLE).where({ id }).first();
};

// ดึงรอบที่ active
exports.findActive = async () => {
  return db(TABLE).where({ is_active: 1 }).orderBy('start_date', 'desc');
};

// สร้างรอบ
exports.create = async (payload) => {
  const [id] = await db(TABLE).insert(payload);
  return exports.findById(id);
};

// แก้ไข
exports.update = async (id, payload) => {
  const data = {};
  if (payload.code !== undefined) data.code = payload.code;
  if (payload.name_th !== undefined) data.name_th = payload.name_th;
  if (payload.buddhist_year !== undefined) data.buddhist_year = payload.buddhist_year;
  if (payload.start_date !== undefined) data.start_date = payload.start_date;
  if (payload.end_date !== undefined) data.end_date = payload.end_date;
  if (payload.is_active !== undefined) data.is_active = payload.is_active;

  await db(TABLE).where({ id }).update(data);
  return exports.findById(id);
};

// ลบ
exports.remove = async (id) => {
  return db(TABLE).where({ id }).del();
};

// ตรวจว่า active ไหม
exports.isActive = async (id) => {
  const row = await db(TABLE).where({ id, is_active: 1 }).first();
  return !!row;
};

