const Conversation = require('../models/Conversation');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { generateInviteLink } = require('../utils/helpers');

// @desc    Create group
exports.createGroup = asyncHandler(async (req, res) => {
  const { name, members, description } = req.body;
  const creatorId = req.user._id;

  // Ensure all members exist
  const memberUsers = await User.find({ _id: { $in: members }, status: 'active' });
  if (memberUsers.length !== members.length) {
    throw ApiError.badRequest('Một số thành viên không tồn tại');
  }

  const participants = [
    { user: creatorId, role: 'owner', joinedAt: new Date() },
    ...members.map(m => ({
      user: m,
      role: 'member',
      joinedAt: new Date(),
      addedBy: creatorId,
    })),
  ];

  const conversation = await Conversation.create({
    type: 'group',
    participants,
    group: {
      name,
      description,
      createdBy: creatorId,
      inviteLink: generateInviteLink(),
    },
  });

  const populated = await conversation.populate('participants.user', 'displayName avatar');

  new ApiResponse(201, 'Đã tạo nhóm', populated).send(res);
});

// @desc    Update group info
exports.updateGroup = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');

  if (conv.group?.settings?.onlyAdminCanChangeInfo && !conv.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Chỉ admin mới có thể thay đổi thông tin nhóm');
  }

  const { name, description } = req.body;
  if (name) conv.group.name = name;
  if (description !== undefined) conv.group.description = description;
  await conv.save();

  new ApiResponse(200, 'Đã cập nhật nhóm', conv).send(res);
});

// @desc    Add members
exports.addMembers = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');

  if (conv.group?.settings?.onlyAdminCanAddMember && !conv.isAdmin(req.user._id)) {
    throw ApiError.forbidden('Chỉ admin mới có thể thêm thành viên');
  }

  const { members } = req.body;
  const currentMemberIds = conv.participants.map(p => p.user.toString());

  const newMembers = members.filter(m => !currentMemberIds.includes(m));
  if (newMembers.length === 0) {
    throw ApiError.badRequest('Tất cả thành viên đã có trong nhóm');
  }

  // Check max members
  if (conv.participants.length + newMembers.length > (conv.group.settings?.maxMembers || 500)) {
    throw ApiError.badRequest('Nhóm đã đạt giới hạn thành viên');
  }

  for (const memberId of newMembers) {
    conv.participants.push({
      user: memberId,
      role: 'member',
      joinedAt: new Date(),
      addedBy: req.user._id,
    });
  }
  await conv.save();

  new ApiResponse(200, `Đã thêm ${newMembers.length} thành viên`).send(res);
});

// @desc    Remove member
exports.removeMember = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');
  if (!conv.isAdmin(req.user._id)) throw ApiError.forbidden('Chỉ admin mới có thể xóa thành viên');

  const targetId = req.params.userId;
  if (conv.isOwner(targetId)) throw ApiError.forbidden('Không thể xóa chủ nhóm');

  conv.participants = conv.participants.filter(p => p.user.toString() !== targetId);
  await conv.save();

  new ApiResponse(200, 'Đã xóa thành viên').send(res);
});

// @desc    Leave group
exports.leaveGroup = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');

  if (conv.isOwner(req.user._id)) {
    throw ApiError.badRequest('Chủ nhóm phải chuyển quyền trước khi rời nhóm');
  }

  conv.participants = conv.participants.filter(p => p.user.toString() !== req.user._id.toString());
  await conv.save();

  new ApiResponse(200, 'Đã rời nhóm').send(res);
});

// @desc    Change member role
exports.changeRole = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');

  const requesterRole = conv.getParticipant(req.user._id)?.role;
  if (!['owner', 'admin'].includes(requesterRole)) {
    throw ApiError.forbidden('Không có quyền thay đổi vai trò');
  }

  const target = conv.getParticipant(req.params.userId);
  if (!target) throw ApiError.notFound('Thành viên không tồn tại');

  target.role = req.body.role;
  await conv.save();

  new ApiResponse(200, 'Đã thay đổi vai trò').send(res);
});

// @desc    Transfer ownership
exports.transferOwnership = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');
  if (!conv.isOwner(req.user._id)) throw ApiError.forbidden('Chỉ chủ nhóm mới có thể chuyển quyền');

  const newOwner = conv.getParticipant(req.params.userId);
  if (!newOwner) throw ApiError.notFound('Thành viên không tồn tại');

  const currentOwner = conv.getParticipant(req.user._id);
  currentOwner.role = 'admin';
  newOwner.role = 'owner';
  await conv.save();

  new ApiResponse(200, 'Đã chuyển quyền chủ nhóm').send(res);
});

// @desc    Dissolve group
exports.dissolveGroup = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');
  if (!conv.isOwner(req.user._id)) throw ApiError.forbidden('Chỉ chủ nhóm mới có thể giải tán');

  conv.isActive = false;
  await conv.save();

  new ApiResponse(200, 'Đã giải tán nhóm').send(res);
});

// @desc    Generate invite link
exports.generateInviteLink = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');
  if (!conv.isAdmin(req.user._id)) throw ApiError.forbidden('Chỉ admin mới có thể tạo link mời');

  conv.group.inviteLink = generateInviteLink();
  conv.group.inviteLinkEnabled = true;
  await conv.save();

  new ApiResponse(200, 'Đã tạo link mời mới', { inviteLink: conv.group.inviteLink }).send(res);
});

// @desc    Join via invite link
exports.joinByInviteLink = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    'group.inviteLink': req.params.inviteLink,
    'group.inviteLinkEnabled': true,
    type: 'group',
    isActive: true,
  });

  if (!conv) throw ApiError.notFound('Link mời không hợp lệ hoặc đã bị vô hiệu hóa');
  if (conv.isParticipant(req.user._id)) throw ApiError.conflict('Bạn đã ở trong nhóm này');

  if (conv.group.settings?.approvalRequired) {
    conv.group.pendingRequests.push({
      user: req.user._id,
      requestedAt: new Date(),
    });
    await conv.save();
    new ApiResponse(200, 'Đã gửi yêu cầu tham gia, chờ admin duyệt').send(res);
    return;
  }

  conv.participants.push({
    user: req.user._id,
    role: 'member',
    joinedAt: new Date(),
  });
  await conv.save();

  new ApiResponse(200, 'Đã tham gia nhóm', conv).send(res);
});

// @desc    Update group settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv || conv.type !== 'group') throw ApiError.notFound('Nhóm không tồn tại');
  if (!conv.isAdmin(req.user._id)) throw ApiError.forbidden('Chỉ admin mới có thể thay đổi cài đặt');

  const allowedSettings = ['onlyAdminCanSend', 'onlyAdminCanAddMember', 'onlyAdminCanChangeInfo', 'onlyAdminCanPin', 'approvalRequired', 'maxMembers', 'slowMode'];
  for (const key of allowedSettings) {
    if (req.body[key] !== undefined) {
      conv.group.settings[key] = req.body[key];
    }
  }
  await conv.save();

  new ApiResponse(200, 'Đã cập nhật cài đặt nhóm').send(res);
});
