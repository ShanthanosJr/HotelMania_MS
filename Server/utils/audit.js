const AuditLog = require('../models/AuditLog');

/** Records a staff or guest action. Never throws: an audit failure must not break the request. */
const audit = async (user, action, { entity, entityId, summary } = {}) => {
  try {
    await AuditLog.create({
      actor: user && user._id,
      actorName: user ? `${user.name || 'User'}${user.role && user.role !== 'guest' ? ` (${user.role})` : ''}` : 'System',
      action,
      entity,
      entityId,
      summary,
    });
  } catch (err) {
    console.error('[audit] could not record', action, err.message);
  }
};

module.exports = { audit };
