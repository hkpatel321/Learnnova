const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'learnova/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'learnova/files',
    resource_type: 'raw',
  },
});

const uploadAny = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadAny, cloudinary };
