import AuditLog from '../models/AuditLog.js';

export const createAuditLog = async ({
  actor,
  action,
  entityType,
  entityId,
  status = 'success',
  details = {},
  req
}) => {
  try {
    await AuditLog.create({
      actor: actor || undefined,
      action,
      entityType,
      entityId,
      status,
      details,
      ipAddress: req?.requestContext?.ipAddress,
      userAgent: req?.requestContext?.userAgent,
      requestId: req?.requestContext?.requestId
    });
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};
