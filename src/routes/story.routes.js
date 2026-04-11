const router = require('express').Router();
const storyCtrl = require('../controllers/story.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { uploadStory } = require('../middlewares/upload.middleware');

router.get('/feed', verifyToken, storyCtrl.getStoryFeed);
router.get('/me', verifyToken, storyCtrl.getMyStories);
router.post('/', verifyToken, uploadStory, storyCtrl.createStory);
router.delete('/:id', verifyToken, storyCtrl.deleteStory);
router.get('/:id/viewers', verifyToken, storyCtrl.getViewers);
router.post('/:id/view', verifyToken, storyCtrl.viewStory);
router.post('/:id/react', verifyToken, storyCtrl.reactStory);
router.post('/:id/reply', verifyToken, storyCtrl.replyStory);

module.exports = router;
