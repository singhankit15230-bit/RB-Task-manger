import mongoose from 'mongoose';

export const TEAM_PERMISSIONS = [
  'view_team',
  'manage_members',
  'manage_roles',
  'manage_tasks'
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [40, 'Role name cannot be more than 40 characters']
    },
    permissions: {
      type: [String],
      enum: TEAM_PERMISSIONS,
      default: ['view_team']
    },
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name'],
      trim: true,
      maxlength: [80, 'Team name cannot be more than 80 characters']
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roles: {
      type: [roleSchema],
      default: []
    },
    members: {
      type: [memberSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

teamSchema.pre('validate', function (next) {
  if (this.roles.length === 0) {
    const ownerRoleId = new mongoose.Types.ObjectId();
    const memberRoleId = new mongoose.Types.ObjectId();

    this.roles.push(
      {
        _id: ownerRoleId,
        name: 'Owner',
        permissions: TEAM_PERMISSIONS,
        isSystem: true
      },
      {
        _id: memberRoleId,
        name: 'Member',
        permissions: ['view_team'],
        isSystem: true
      }
    );

    this.members.push({
      user: this.owner,
      role: ownerRoleId
    });
  }

  next();
});

teamSchema.index({ owner: 1, createdAt: -1 });
teamSchema.index({ 'members.user': 1, createdAt: -1 });

const Team = mongoose.model('Team', teamSchema);

export default Team;
