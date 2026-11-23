const mongoose = require('mongoose');

/** Who did what, for the dashboard activity feed and for disputes. */
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, trim: true },
  action: { type: String, required: true, trim: true }, // e.g. booking.check_in
  entity: { type: String, trim: true },                 // booking, room, settings, rates...
  entityId: { type: mongoose.Schema.Types.ObjectId },
  summary: { type: String, trim: true, maxlength: 300 },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
