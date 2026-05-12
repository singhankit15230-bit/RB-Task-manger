import Team, { TEAM_PERMISSIONS } from '../models/Team.js';
import User from '../models/User.js';
import Note from '../models/Note.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { encryptFile, deleteEncryptedFile } from '../utils/encryption.js';
import { validateEmailAddress } from '../utils/emailValidation.js';
import {
  canManageTeam,
  getDefaultMemberRole,
  getMembership,
  getRole,
  serializeTeamForUser
} from '../utils/teamPermissions.js';

const getTeamForMember = async (teamId, userId) => {
  const team = await Team.findById(teamId).populate('members.user', 'name email role');

  if (!team || !getMembership(team, userId)) {
    return null;
  }

  return team;
};

const validatePermissions = (permissions = []) =>
  permissions.every((permission) => TEAM_PERMISSIONS.includes(permission));

const isOwnerRole = (role) => role?.isSystem && role?.name === 'Owner';

export const listTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ 'members.user': req.user.id })
      .populate('members.user', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      teams: teams.map((team) => serializeTeamForUser(team, req.user.id))
    });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a team name'
      });
    }

    const team = await Team.create({
      name,
      owner: req.user.id
    });

    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.create',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { name: team.name },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (req, res, next) => {
  try {
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, permissions = ['view_team'] } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_roles')) {
      return res.status(403).json({ success: false, message: 'You cannot manage roles in this team' });
    }

    if (!name || ['owner', 'member'].includes(name.trim().toLowerCase()) || !validatePermissions(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a custom role name and valid permissions'
      });
    }

    team.roles.push({
      name,
      permissions: [...new Set(['view_team', ...permissions])]
    });
    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.role_create',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { roleName: name },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { name, permissions } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_roles')) {
      return res.status(403).json({ success: false, message: 'You cannot manage roles in this team' });
    }

    const role = getRole(team, req.params.roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'System roles cannot be edited' });
    }

    if (name) role.name = name;
    if (permissions) {
      if (!validatePermissions(permissions)) {
        return res.status(400).json({ success: false, message: 'Invalid permissions' });
      }
      role.permissions = [...new Set(['view_team', ...permissions])];
    }

    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.role_update',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { roleId: role._id.toString(), roleName: role.name },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_roles')) {
      return res.status(403).json({ success: false, message: 'You cannot manage roles in this team' });
    }

    const role = getRole(team, req.params.roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'System roles cannot be deleted' });
    }

    const defaultRole = getDefaultMemberRole(team);
    team.members.forEach((member) => {
      if (member.role.toString() === role._id.toString()) {
        member.role = defaultRole._id;
      }
    });

    team.roles.pull(role._id);
    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.role_delete',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { roleId: role._id.toString(), roleName: role.name },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { email, roleId } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_members')) {
      return res.status(403).json({ success: false, message: 'You cannot manage members in this team' });
    }

    const emailValidation = await validateEmailAddress(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }

    const user = await User.findOne({ email: emailValidation.normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    if (getMembership(team, user._id.toString())) {
      return res.status(400).json({ success: false, message: 'User is already in this team' });
    }

    const role = roleId ? getRole(team, roleId) : getDefaultMemberRole(team);
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role not found' });
    }

    if (isOwnerRole(role)) {
      return res.status(400).json({ success: false, message: 'Owner is unique to the team creator' });
    }

    team.members.push({
      user: user._id,
      role: role._id
    });
    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.member_add',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { memberEmail: user.email, roleName: role.name },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { roleId } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_members')) {
      return res.status(403).json({ success: false, message: 'You cannot manage members in this team' });
    }

    const membership = getMembership(team, req.params.userId);
    const role = getRole(team, roleId);

    if (!membership || !role) {
      return res.status(404).json({ success: false, message: 'Member or role not found' });
    }

    if (team.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'The team owner role cannot be changed' });
    }

    if (isOwnerRole(role)) {
      return res.status(400).json({ success: false, message: 'Owner is unique to the team creator' });
    }

    membership.role = role._id;
    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.member_role_update',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { memberId: req.params.userId, roleName: role.name },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};

export const listTeamTasks = async (req, res, next) => {
  try {
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const tasks = await Note.find({ team: team._id })
      .populate('assignedTo', 'name email role')
      .populate('user', 'name email role')
      .sort({ completed: 1, createdAt: -1 })
      .select('-file.encryptedPath -file.iv');

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

const attachEncryptedFile = async (task, uploadedFile) => {
  if (!uploadedFile) {
    return;
  }

  const { encryptedPath, iv } = await encryptFile(uploadedFile.path);

  task.file = {
    fileName: uploadedFile.filename,
    originalName: uploadedFile.originalname,
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    encryptedPath,
    iv
  };
};

export const createTeamTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, assignedTo } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_tasks')) {
      return res.status(403).json({ success: false, message: 'You cannot manage tasks in this team' });
    }

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please provide title and description' });
    }

    if (assignedTo && !getMembership(team, assignedTo)) {
      return res.status(400).json({ success: false, message: 'Assigned user must be a team member' });
    }

    const task = new Note({
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completed: req.body.completed === true || req.body.completed === 'true',
      user: req.user.id,
      team: team._id,
      assignedTo: assignedTo || undefined
    });

    try {
      await attachEncryptedFile(task, req.file);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'File encryption failed'
      });
    }

    await task.save();

    await task.populate('assignedTo', 'name email role');
    await task.populate('user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.task_create',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { taskId: task._id.toString(), title: task.title },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Team task created successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeamTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, completed, assignedTo } = req.body;
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const task = await Note.findOne({ _id: req.params.taskId, team: team._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const isAssignee = task.assignedTo?.toString() === req.user.id;
    const canManageTasks = canManageTeam(team, req.user.id, 'manage_tasks');

    if (!canManageTasks && !isAssignee) {
      return res.status(403).json({ success: false, message: 'You cannot update this team task' });
    }

    if (!canManageTasks && (title || description || dueDate || assignedTo)) {
      return res.status(403).json({ success: false, message: 'Only task managers can edit task details' });
    }

    if (assignedTo && !getMembership(team, assignedTo)) {
      return res.status(400).json({ success: false, message: 'Assigned user must be a team member' });
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (typeof completed !== 'undefined') task.completed = completed === true || completed === 'true';
    if (typeof assignedTo !== 'undefined') task.assignedTo = assignedTo || undefined;

    if (req.file) {
      if (task.file?.encryptedPath) {
        await deleteEncryptedFile(task.file.encryptedPath);
      }

      try {
        await attachEncryptedFile(task, req.file);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'File encryption failed'
        });
      }
    }

    await task.save();
    await task.populate('assignedTo', 'name email role');
    await task.populate('user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.task_update',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { taskId: task._id.toString(), title: task.title },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Team task updated successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeamTask = async (req, res, next) => {
  try {
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_tasks')) {
      return res.status(403).json({ success: false, message: 'You cannot manage tasks in this team' });
    }

    const task = await Note.findOne({ _id: req.params.taskId, team: team._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();

    await createAuditLog({
      actor: req.user.id,
      action: 'team.task_delete',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { taskId: req.params.taskId, title: task.title },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Team task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const team = await getTeamForMember(req.params.teamId, req.user.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!canManageTeam(team, req.user.id, 'manage_members')) {
      return res.status(403).json({ success: false, message: 'You cannot manage members in this team' });
    }

    if (team.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'The team owner cannot be removed' });
    }

    const startingCount = team.members.length;
    team.members = team.members.filter((member) => {
      const memberUserId = member.user?._id ? member.user._id.toString() : member.user.toString();
      return memberUserId !== req.params.userId;
    });

    if (team.members.length === startingCount) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await team.save();
    await team.populate('members.user', 'name email role');

    await createAuditLog({
      actor: req.user.id,
      action: 'team.member_remove',
      entityType: 'team',
      entityId: team._id.toString(),
      details: { memberId: req.params.userId },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      team: serializeTeamForUser(team, req.user.id)
    });
  } catch (error) {
    next(error);
  }
};
