import { TEAM_PERMISSIONS } from '../models/Team.js';

export const getMembership = (team, userId) =>
  team.members.find((member) => {
    const memberUserId = member.user?._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId;
  });

export const getRole = (team, roleId) =>
  team.roles.id(roleId) || team.roles.find((role) => role._id.toString() === roleId?.toString());

export const getMemberPermissions = (team, userId) => {
  if (team.owner.toString() === userId) {
    return TEAM_PERMISSIONS;
  }

  const membership = getMembership(team, userId);
  if (!membership) {
    return [];
  }

  const role = getRole(team, membership.role);
  return role?.permissions || [];
};

export const canManageTeam = (team, userId, permission) =>
  getMemberPermissions(team, userId).includes(permission);

export const getDefaultMemberRole = (team) =>
  team.roles.find((role) => role.name === 'Member' && role.isSystem) || team.roles[0];

export const serializeTeamForUser = (team, userId) => {
  const teamObject = team.toObject ? team.toObject() : team;

  return {
    ...teamObject,
    currentUserPermissions: getMemberPermissions(team, userId)
  };
};
