const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/tmp' 
  : path.resolve(__dirname, '../../uploads');

if (process.env.NODE_ENV !== 'production' && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});


const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};


const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: imageFilter,
});

const uploadAny = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

module.exports = { uploadImage, uploadAny };
