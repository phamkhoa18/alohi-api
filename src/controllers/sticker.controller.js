const StickerPack = require('../models/StickerPack');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

exports.getStore = asyncHandler(async (req, res) => {
  const packs = await StickerPack.find({ isActive: true })
    .select('name nameVi thumbnail category isAnimated isPremium stickerCount downloadCount')
    .sort({ order: 1 });
  new ApiResponse(200, 'Success', packs).send(res);
});

exports.getByCategory = asyncHandler(async (req, res) => {
  const packs = await StickerPack.find({ category: req.params.category, isActive: true })
    .sort({ downloadCount: -1 });
  new ApiResponse(200, 'Success', packs).send(res);
});

exports.getPackDetail = asyncHandler(async (req, res) => {
  const pack = await StickerPack.findById(req.params.id);
  if (!pack) throw ApiError.notFound('Bộ sticker không tồn tại');
  new ApiResponse(200, 'Success', pack).send(res);
});

exports.downloadPack = asyncHandler(async (req, res) => {
  await StickerPack.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });
  new ApiResponse(200, 'Đã tải sticker pack').send(res);
});

exports.searchStickers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const packs = await StickerPack.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { nameVi: { $regex: q, $options: 'i' } },
      { 'stickers.keywords': { $regex: q, $options: 'i' } },
    ],
  });
  new ApiResponse(200, 'Success', packs).send(res);
});
