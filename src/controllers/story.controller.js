const Story = require('../models/Story');
const uploadService = require('../services/upload.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get story feed
exports.getStoryFeed = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('friends');
  const friendIds = [...user.friends, req.user._id];

  const stories = await Story.find({
    author: { $in: friendIds },
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate('author', 'displayName avatar')
    .sort({ createdAt: -1 })
    .lean();

  // Group by author
  const grouped = {};
  stories.forEach(story => {
    const authorId = story.author._id.toString();
    if (!grouped[authorId]) {
      grouped[authorId] = {
        author: story.author,
        stories: [],
        hasUnviewed: false,
      };
    }
    grouped[authorId].stories.push(story);
    if (!story.viewers?.some(v => v.user?.toString() === req.user._id.toString())) {
      grouped[authorId].hasUnviewed = true;
    }
  });

  new ApiResponse(200, 'Success', Object.values(grouped)).send(res);
});

// @desc    Get my stories
exports.getMyStories = asyncHandler(async (req, res) => {
  const stories = await Story.find({
    author: req.user._id,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  new ApiResponse(200, 'Success', stories).send(res);
});

// @desc    Create story
exports.createStory = asyncHandler(async (req, res) => {
  const storyData = {
    author: req.user._id,
    type: req.body.type,
    privacy: req.body.privacy || 'friends',
    caption: req.body.caption,
  };

  if (req.body.type === 'text') {
    storyData.content = {
      text: req.body.text,
      backgroundColor: req.body.backgroundColor,
      fontFamily: req.body.fontFamily,
      textColor: req.body.textColor,
    };
  }

  if (req.file) {
    const media = await uploadService.uploadStoryMedia(req.file.path, req.body.type);
    storyData.media = media;
  }

  if (req.body.allowedUsers) storyData.allowedUsers = JSON.parse(req.body.allowedUsers);
  if (req.body.excludedUsers) storyData.excludedUsers = JSON.parse(req.body.excludedUsers);

  const story = await Story.create(storyData);
  new ApiResponse(201, 'Đã đăng story', story).send(res);
});

// @desc    Delete story
exports.deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findOne({ _id: req.params.id, author: req.user._id });
  if (!story) throw ApiError.notFound('Story không tồn tại');

  story.isActive = false;
  await story.save();

  new ApiResponse(200, 'Đã xóa story').send(res);
});

// @desc    View story
exports.viewStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) throw ApiError.notFound('Story không tồn tại');

  // Check if already viewed
  const alreadyViewed = story.viewers.some(v => v.user?.toString() === req.user._id.toString());
  if (!alreadyViewed) {
    story.viewers.push({ user: req.user._id, viewedAt: new Date() });
    story.viewCount += 1;
    await story.save();
  }

  new ApiResponse(200, 'Đã xem story').send(res);
});

// @desc    Get story viewers
exports.getViewers = asyncHandler(async (req, res) => {
  const story = await Story.findOne({ _id: req.params.id, author: req.user._id })
    .populate('viewers.user', 'displayName avatar');
  if (!story) throw ApiError.notFound('Story không tồn tại');

  new ApiResponse(200, 'Success', story.viewers).send(res);
});

// @desc    React to story
exports.reactStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) throw ApiError.notFound('Story không tồn tại');

  const viewerIdx = story.viewers.findIndex(v => v.user?.toString() === req.user._id.toString());
  if (viewerIdx >= 0) {
    story.viewers[viewerIdx].reaction = req.body.emoji;
  } else {
    story.viewers.push({ user: req.user._id, viewedAt: new Date(), reaction: req.body.emoji });
    story.viewCount += 1;
  }
  await story.save();

  new ApiResponse(200, 'Đã react story').send(res);
});

// @desc    Reply to story
exports.replyStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story) throw ApiError.notFound('Story không tồn tại');

  story.replies.push({
    user: req.user._id,
    content: req.body.content,
    type: req.body.type || 'text',
    createdAt: new Date(),
  });
  await story.save();

  new ApiResponse(200, 'Đã trả lời story').send(res);
});
