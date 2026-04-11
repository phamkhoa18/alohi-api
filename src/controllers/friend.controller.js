const friendService = require('../services/friend.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get friends list
exports.getFriends = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await friendService.getFriends(req.user._id, search, parseInt(page) || 1, parseInt(limit) || 20);
  new ApiResponse(200, 'Success', result).send(res);
});

// @desc    Get online friends
exports.getOnlineFriends = asyncHandler(async (req, res) => {
  const friends = await friendService.getOnlineFriends(req.user._id);
  new ApiResponse(200, 'Success', friends).send(res);
});

// @desc    Get friend count
exports.getFriendCount = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('friendCount');
  new ApiResponse(200, 'Success', { count: user.friendCount }).send(res);
});

// @desc    Send friend request
exports.sendRequest = asyncHandler(async (req, res) => {
  const request = await friendService.sendRequest(
    req.user._id,
    req.params.userId,
    req.body.message,
    req.body.source
  );
  new ApiResponse(201, 'Đã gửi lời mời kết bạn', request).send(res);
});

// @desc    Get received requests
exports.getReceivedRequests = asyncHandler(async (req, res) => {
  const result = await friendService.getReceivedRequests(req.user._id, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20);
  new ApiResponse(200, 'Success', result).send(res);
});

// @desc    Get sent requests
exports.getSentRequests = asyncHandler(async (req, res) => {
  const result = await friendService.getSentRequests(req.user._id, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 20);
  new ApiResponse(200, 'Success', result).send(res);
});

// @desc    Get pending request count
exports.getRequestCount = asyncHandler(async (req, res) => {
  const FriendRequest = require('../models/FriendRequest');
  const count = await FriendRequest.countDocuments({ to: req.user._id, status: 'pending' });
  new ApiResponse(200, 'Success', { count }).send(res);
});

// @desc    Accept friend request
exports.acceptRequest = asyncHandler(async (req, res) => {
  const result = await friendService.acceptRequest(req.params.requestId, req.user._id);
  new ApiResponse(200, 'Đã chấp nhận lời mời kết bạn', result).send(res);
});

// @desc    Reject friend request
exports.rejectRequest = asyncHandler(async (req, res) => {
  await friendService.rejectRequest(req.params.requestId, req.user._id);
  new ApiResponse(200, 'Đã từ chối lời mời kết bạn').send(res);
});

// @desc    Cancel sent request
exports.cancelRequest = asyncHandler(async (req, res) => {
  await friendService.cancelRequest(req.params.requestId, req.user._id);
  new ApiResponse(200, 'Đã hủy lời mời kết bạn').send(res);
});

// @desc    Unfriend
exports.unfriend = asyncHandler(async (req, res) => {
  await friendService.unfriend(req.user._id, req.params.userId);
  new ApiResponse(200, 'Đã hủy kết bạn').send(res);
});

// @desc    Get friend suggestions
exports.getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await friendService.getSuggestions(req.user._id, parseInt(req.query.limit) || 20);
  new ApiResponse(200, 'Success', suggestions).send(res);
});

// @desc    Sync contacts
exports.syncContacts = asyncHandler(async (req, res) => {
  const contacts = await friendService.syncContacts(req.user._id, req.body.phoneNumbers);
  new ApiResponse(200, 'Success', contacts).send(res);
});

// @desc    Get mutual friends
exports.getMutualFriends = asyncHandler(async (req, res) => {
  const friends = await friendService.getMutualFriends(req.user._id, req.params.userId);
  new ApiResponse(200, 'Success', friends).send(res);
});
