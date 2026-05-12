import express from 'express';
import {
  addMember,
  createRole,
  createTeam,
  createTeamTask,
  deleteTeamTask,
  deleteRole,
  getTeam,
  listTeams,
  listTeamTasks,
  removeMember,
  updateMemberRole,
  updateRole,
  updateTeamTask
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';
import { upload, handleMulterError } from '../utils/fileUpload.js';

const router = express.Router();

router.use(protect);

router.route('/').get(listTeams).post(createTeam);
router.get('/:teamId', getTeam);

router.post('/:teamId/roles', createRole);
router.patch('/:teamId/roles/:roleId', updateRole);
router.delete('/:teamId/roles/:roleId', deleteRole);

router.post('/:teamId/members', addMember);
router.patch('/:teamId/members/:userId/role', updateMemberRole);
router.delete('/:teamId/members/:userId', removeMember);

router
  .route('/:teamId/tasks')
  .get(listTeamTasks)
  .post(upload.single('file'), handleMulterError, createTeamTask);

router
  .route('/:teamId/tasks/:taskId')
  .patch(upload.single('file'), handleMulterError, updateTeamTask)
  .delete(deleteTeamTask);

export default router;
