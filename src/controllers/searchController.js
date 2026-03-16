const searchService = require('../services/searchService');
const config = require('../../config');

async function search(req, res, next) {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || config.defaultPageLimit;
    
    if (!q.trim()) {
      return res.json({ total: 0, page, limit, data: [] });
    }

    const period = req.query.period || 'all';
    const sort = req.query.sort || 'desc';
    const result = await searchService.searchDocuments(q, page, limit, period, sort);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { search };
