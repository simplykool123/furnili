import multer from "multer";
import path from "path";
import crypto from "crypto";

// Product image upload configuration with proper storage
export const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/products/');
    },
    filename: function (req, file, cb) {
      // Generate unique filename with original extension
      const uniqueName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, uniqueName + ext);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// BOQ file upload configuration
export const boqFileUpload = multer({
  dest: "uploads/boq/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === "application/pdf";

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// CSV/Excel file upload for bulk operations
export const csvFileUpload = multer({
  dest: "uploads/csv/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
});

// Receipt image upload for petty cash
export const receiptImageUpload = multer({
  dest: "uploads/receipts/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter - File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'  // Add webp support for pasted images
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname) {
      console.log('File accepted by multer filter');
      return cb(null, true);
    } else {
      console.log('File rejected by multer filter - Invalid type');
      cb(new Error("Only image files are allowed for receipts"));
    }
  },
});