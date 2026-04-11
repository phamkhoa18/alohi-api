const router = require('express').Router();
const stickerCtrl = require('../controllers/sticker.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/store', verifyToken, stickerCtrl.getStore);
router.get('/store/:category', verifyToken, stickerCtrl.getByCategory);
router.get('/packs/:id', verifyToken, stickerCtrl.getPackDetail);
router.post('/packs/:id/download', verifyToken, stickerCtrl.downloadPack);
router.get('/search', verifyToken, stickerCtrl.searchStickers);

module.exports = router;
