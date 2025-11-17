// backend/repositories/reports.repository.js
const db = require('../db/knex');

// สรุปผลรายบุคคล
exports.getIndividualSummary = async (evaluateeId, periodId) => {
  // ข้อมูลผู้ถูกประเมิน
  const evaluatee = await db('users')
    .select('users.id', 'users.name_th', 'users.email', 'users.department_id')
    .leftJoin('departments', 'users.department_id', 'departments.id')
    .select('departments.name_th as department_name')
    .where('users.id', evaluateeId)
    .first();

  if (!evaluatee) return null;

  // รอบประเมิน
  const period = await db('evaluation_periods')
    .select('id', 'name_th', 'start_date', 'end_date')
    .where('id', periodId)
    .first();

  // รายละเอียดผลการประเมิน
  const results = await db('evaluation_results as er')
    .select(
      'er.*',
      'i.name_th as indicator_name',
      'i.type as indicator_type',
      'i.weight as indicator_weight',
      't.title_th as topic_name',
      't.weight as topic_weight',
      'evaluator.name_th as evaluator_name'
    )
    .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
    .leftJoin('evaluation_topics as t', 'i.topic_id', 't.id')
    .leftJoin('users as evaluator', 'er.evaluator_id', 'evaluator.id')
    .where('er.evaluatee_id', evaluateeId)
    .where('er.period_id', periodId)
    .orderBy('t.id', 'asc')
    .orderBy('i.id', 'asc');

  // ความคิดเห็น
  const comments = await db('evaluator_comments')
    .select('evaluator_comments.*', 'users.name_th as evaluator_name')
    .leftJoin('users', 'evaluator_comments.evaluator_id', 'users.id')
    .where('evaluator_comments.evaluatee_id', evaluateeId)
    .where('evaluator_comments.period_id', periodId)
    .orderBy('evaluator_comments.created_at', 'desc');

  // ลายเซ็น
  const signatures = await db('signatures')
    .select('signatures.*', 'users.name_th as evaluator_name', 'er.indicator_id')
    .leftJoin('users', 'signatures.evaluator_id', 'users.id')
    .leftJoin('evaluation_results as er', 'signatures.result_id', 'er.id')
    .where('er.evaluatee_id', evaluateeId)
    .where('er.period_id', periodId)
    .groupBy('signatures.evaluator_id');

  // คำนวณคะแนน (ใช้ score อย่างเดียว)
  const totalScore = results.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0);
  const totalWeight = results.reduce((sum, r) => sum + (parseFloat(r.indicator_weight) || 0), 0);

  return {
    evaluatee,
    period,
    results,
    comments,
    signatures,
    summary: {
      total_indicators: results.length,
      total_score: totalScore,
      total_weight: totalWeight,
      avg_score: results.length > 0 ? (totalScore / results.length).toFixed(2) : 0
    }
  };
};


// สรุปผลรวมทั้งหมด (ภาพรวม)
exports.getOverallSummary = async (periodId) => {
  const summary = await db('evaluation_results as er')
    .select(
      'u.id as evaluatee_id',
      'u.name_th as evaluatee_name',
      'd.name_th as department_name'
    )
    .count('er.id as total_indicators')
    .avg('er.score as avg_score')
    .sum('i.weight as total_weight')
    .leftJoin('users as u', 'er.evaluatee_id', 'u.id')
    .leftJoin('departments as d', 'u.department_id', 'd.id')
    .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
    .where('er.period_id', periodId)
    .groupBy('u.id', 'u.name_th', 'd.name_th')
    .orderBy('u.name_th', 'asc');

  return summary;
};


// สรุปผลตามแผนก
exports.getDepartmentSummary = async (departmentId, periodId) => {
  const summary = await db('evaluation_results as er')
    .select(
      'u.id as evaluatee_id',
      'u.name_th as evaluatee_name',
      'u.email'
    )
    .count('er.id as total_indicators')
    .avg('er.score as avg_score')
    .leftJoin('users as u', 'er.evaluatee_id', 'u.id')
    .where('u.department_id', departmentId)
    .where('er.period_id', periodId)
    .groupBy('u.id', 'u.name_th', 'u.email')
    .orderBy('u.name_th', 'asc');

  return summary;
};


// สรุปผลตามหัวข้อการประเมิน
exports.getTopicSummary = async (periodId) => {
  const summary = await db('evaluation_results as er')
    .select(
      't.id as topic_id',
      't.title_th as topic_name',
      't.weight as topic_weight'
    )
    .count('er.id as total_results')
    .avg('er.score as avg_score')
    .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
    .leftJoin('evaluation_topics as t', 'i.topic_id', 't.id')
    .where('er.period_id', periodId)
    .groupBy('t.id', 't.title_th', 't.weight')
    .orderBy('t.id', 'asc');

  return summary;
};


// สำหรับ Export PDF
exports.getExportData = async (evaluateeId, periodId) => {
  return exports.getIndividualSummary(evaluateeId, periodId);
};
