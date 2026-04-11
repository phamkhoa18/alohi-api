const CallLog = require('../models/CallLog');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get call history
exports.getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [calls, total] = await Promise.all([
    CallLog.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
      deletedFor: { $ne: req.user._id },
    })
      .populate('caller', 'displayName avatar')
      .populate('receiver', 'displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    CallLog.countDocuments({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
      deletedFor: { $ne: req.user._id },
    }),
  ]);

  ApiResponse.paginated(calls, { total, page: parseInt(page), limit: parseInt(limit) }).send(res);
});

// @desc    Get missed calls
exports.getMissedCalls = asyncHandler(async (req, res) => {
  const calls = await CallLog.find({
    receiver: req.user._id,
    status: { $in: ['missed', 'no_answer'] },
    deletedFor: { $ne: req.user._id },
  })
    .populate('caller', 'displayName avatar')
    .sort({ createdAt: -1 })
    .limit(50);

  new ApiResponse(200, 'Success', calls).send(res);
});

// @desc    Get call detail
exports.getCallDetail = asyncHandler(async (req, res) => {
  const call = await CallLog.findOne({ callId: req.params.callId })
    .populate('caller', 'displayName avatar')
    .populate('receiver', 'displayName avatar');

  if (!call) throw ApiError.notFound('Cuộc gọi không tồn tại');

  new ApiResponse(200, 'Success', call).send(res);
});

// @desc    Delete call log
exports.deleteCallLog = asyncHandler(async (req, res) => {
  await CallLog.findOneAndUpdate(
    { callId: req.params.callId },
    { $addToSet: { deletedFor: req.user._id } }
  );
  new ApiResponse(200, 'Đã xóa lịch sử cuộc gọi').send(res);
});

// @desc    Clear all call history
exports.clearCallHistory = asyncHandler(async (req, res) => {
  await CallLog.updateMany(
    { $or: [{ caller: req.user._id }, { receiver: req.user._id }] },
    { $addToSet: { deletedFor: req.user._id } }
  );
  new ApiResponse(200, 'Đã xóa toàn bộ lịch sử cuộc gọi').send(res);
});
