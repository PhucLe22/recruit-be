const express = require('express');
const router = express.Router();
const pdfConverterController = require('../app/controllers/users/PDFConverterController');

// Convert PDF to single image (first page)
router.get('/convert-pdf-to-image', pdfConverterController.convertToImage);

// Convert PDF to multiple images (all pages)
router.get('/convert-pdf-to-images', pdfConverterController.convertToImages);

module.exports = router;
