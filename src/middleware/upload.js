import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.resolve(__dirname, '../../uploads');
const proofsDir = path.join(uploadRoot, 'proofs');
const productsDir = path.join(uploadRoot, 'products');

// Ensure directories exist
fs.mkdirSync(proofsDir, { recursive: true });
fs.mkdirSync(productsDir, { recursive: true });

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

export const uploadProductImage = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPG, PNG, and WebP images are allowed.'));
    }
  }
});
