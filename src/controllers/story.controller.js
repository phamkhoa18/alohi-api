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
    .populate('viewers.user', 'displayName avatar')
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
        hasUnread: false,
      };
    }
    grouped[authorId].stories.push(story);
    if (!story.viewers?.some(v => v.user?.toString() === req.user._id.toString())) {
      grouped[authorId].hasUnread = true;
    }
  });
  const allGroups = Object.values(grouped);
  const myStories = allGroups.filter(g => g.author._id.toString() === req.user._id.toString());
  const friendsStories = allGroups.filter(g => g.author._id.toString() !== req.user._id.toString());

  new ApiResponse(200, 'Success', { myStories, friendsStories }).send(res);
});

// @desc    Get my stories
exports.getMyStories = asyncHandler(async (req, res) => {
  const stories = await Story.find({
    author: req.user._id,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate('author', 'displayName avatar')
    .populate('viewers.user', 'displayName avatar')
    .sort({ createdAt: -1 });

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

  if (req.files && req.files.media && req.files.media[0]) {
    const media = await uploadService.uploadStoryMedia(req.files.media[0].path, req.body.type);
    storyData.media = media;
  }

  if (req.files && req.files.music && req.files.music[0]) {
    const musicFile = req.files.music[0];
    const musicUpload = await uploadService.uploadAudio(musicFile.path);
    storyData.music = {
      name: musicFile.originalname,
      url: musicUpload.url
    };
  }

  if (req.body.allowedUsers) storyData.allowedUsers = JSON.parse(req.body.allowedUsers);
  if (req.body.excludedUsers) storyData.excludedUsers = JSON.parse(req.body.excludedUsers);

  const story = await Story.create(storyData);
  await story.populate('author', 'displayName avatar');

  // Send Push Notification to friends
  try {
    const User = require('../models/User');
    const notificationService = require('../services/notification.service');
    
    // Get sender info and friends
    const authorPopulated = await User.findById(req.user._id).select('displayName friends');
    
    if (authorPopulated && authorPopulated.friends && authorPopulated.friends.length > 0) {
      const friends = authorPopulated.friends;
      
      const title = 'Story mới';
      const body = `${authorPopulated.displayName} vừa đăng một tin mới.`;
      
      // Async fire and forget
      friends.forEach(friendId => {
        notificationService.create({
          recipientId: friendId,
          senderId: req.user._id,
          type: 'story',
          title: title,
          body: body,
          data: {
            authorId: req.user._id.toString(),
            storyId: story._id.toString()
          }
        }).catch(err => {
          // Ignore individual notification fail
          console.error("Story Notification error:", err.message);
        });
      });
    }
  } catch (err) {
    console.error("Failed to send story notifications", err);
  }

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
