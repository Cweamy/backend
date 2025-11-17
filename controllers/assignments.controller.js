// backend/controllers/assignments.controller.js
// Controller สำหรับจัดการ assignments (การมอบหมายงานประเมิน)

const repo = require('../repositories/assignments.repository');

// GET /api/assignments
exports.list = async (req, res, next) => {
  try {
    const items = await repo.findAll();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/assignments/:id
exports.get = async (req, res, next) => {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// ============================================================
// ✨ ส่วนเพิ่มเติม: GET /api/assignments/mine
// รองรับทั้ง evaluator และ evaluatee
// ============================================================
exports.getMine = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const periodId = req.query.period_id ? Number(req.query.period_id) : null;

    let items = [];

    // ถ้าเป็น evaluator ให้ดึงงานที่ได้รับมอบหมายให้ประเมิน
    if (userRole === 'evaluator' || userRole === 'admin') {
      items = await repo.findByEvaluator(userId);
      if (periodId) {
        items = items.filter(item => item.period_id === periodId);
      }
    }
    // ถ้าเป็น evaluatee ให้ดึงงานที่ตัวเองถูกประเมิน
    else if (userRole === 'evaluatee') {
      items = await repo.findByEvaluatee(userId, periodId);
    }

    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/assignments
exports.create = async (req, res, next) => {
  try {
    const { evaluator_id, evaluatee_id, period_id } = req.body;
    
    if (!evaluator_id) return res.status(400).json({ success: false, message: 'evaluator_id required' });
    if (!evaluatee_id) return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    if (!period_id) return res.status(400).json({ success: false, message: 'period_id required' });
    
    if (evaluator_id === evaluatee_id) {
      return res.status(400).json({ success: false, message: 'Cannot assign to self' });
    }

    const created = await repo.create({ 
      evaluator_id, 
      evaluatee_id, 
      period_id,
    });
    
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    if (e.message.includes('exists')) {
      return res.status(409).json({ success: false, message: e.message });
    }
    next(e);
  }
};

// POST /api/assignments/bulk
exports.createBulk = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }

    const result = await repo.createBulk(items);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    if (e.message.includes('exists')) {
      return res.status(409).json({ success: false, message: e.message });
    }
    next(e);
  }
};

// DELETE /api/assignments/:id
exports.remove = async (req, res, next) => {
  try {
    const deleted = await repo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};
