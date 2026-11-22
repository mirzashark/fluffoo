import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(__dirname, '../../uploads');
const proofsDir = path.join(uploadRoot, 'proofs');
const productsDir = path.join(uploadRoot, 'products');

// Ensure directories exist
try {
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.mkdirSync(productsDir, { recursive: true });
} catch (e) {
  console.log('Notice: Upload directories could not be created:', e.message);
}

// Allowed file types for payment proofs: JPG, JPEG, PNG, PDF
const allowedProofMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, proofsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `proof_${Date.now()}_${uniqueSuffix}${ext}`);
  }
});

export const uploadPaymentProof = multer({
  storage: proofStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum
  },
  fileFilter: (req, file, cb) => {
    if (allowedProofMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, JPEG, PNG, and PDF files are allowed for payment proof.'));
    }
  }
});

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `prod_${Date.now()}_${uniqueSuffix}${ext}`);
  }
});

const allowedProductMimes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg'
];

export const uploadProductImage = multer({
  storage: productStorage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB max for images and videos
  },
  fileFilter: (req, file, cb) => {
    if (allowedProductMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, PNG, WebP, GIF, SVG, and MP4/WebM videos are allowed.'));
    }
  }
});
