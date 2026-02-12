const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class PDFConverterController {
    /**
     * Convert PDF first page to PNG image using pdftoppm (poppler-utils)
     * GET /convert-pdf-to-image?file=/ai-uploads/filename.pdf
     */
    async convertToImage(req, res) {
        try {
            const { file } = req.query;

            console.log('PDF conversion request:', { file });

            if (!file) {
                return res.status(400).json({ error: 'File parameter is required' });
            }

            const filename = path.basename(file);
            console.log('Extracted filename:', filename);

            const pdfPath = path.join(__dirname, '../../../ai-agent/chatbot_backend/uploads', filename);
            console.log('PDF path:', pdfPath);

            if (!fs.existsSync(pdfPath)) {
                console.log('PDF file not found at:', pdfPath);
                return res.status(404).json({ error: 'PDF file not found', path: pdfPath });
            }

            console.log('PDF file exists, proceeding with conversion');

            const cacheDir = path.join(__dirname, '../../public/cache/pdf-images');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const baseName = path.parse(filename).name;
            const cacheFilename = `${baseName}.png`;
            const cachePath = path.join(cacheDir, cacheFilename);

            // Check if cached image exists and is newer than PDF
            if (fs.existsSync(cachePath)) {
                const pdfStat = fs.statSync(pdfPath);
                const cacheStat = fs.statSync(cachePath);

                if (cacheStat.mtime > pdfStat.mtime) {
                    return res.sendFile(cachePath);
                }
            }

            try {
                console.log('Starting PDF conversion with pdftoppm');
                const outputPrefix = path.join(cacheDir, baseName);
                execSync(`pdftoppm -png -f 1 -l 1 -r 200 "${pdfPath}" "${outputPrefix}"`);

                // pdftoppm outputs as prefix-1.png
                const generatedFile = `${outputPrefix}-1.png`;
                if (fs.existsSync(generatedFile)) {
                    fs.renameSync(generatedFile, cachePath);
                }

                if (fs.existsSync(cachePath)) {
                    console.log('Serving converted image:', cachePath);
                    res.sendFile(cachePath);
                } else {
                    console.error('No conversion output found');
                    res.status(500).json({ error: 'Failed to convert PDF to image - no output' });
                }
            } catch (convertError) {
                console.error('PDF conversion error:', convertError);
                res.status(500).json({ error: 'Failed to convert PDF to image', details: convertError.message });
            }

        } catch (error) {
            console.error('PDF converter error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Convert PDF to PNG images (all pages) using pdftoppm (poppler-utils)
     * GET /convert-pdf-to-images?file=/ai-uploads/filename.pdf
     */
    async convertToImages(req, res) {
        try {
            const { file } = req.query;

            if (!file) {
                return res.status(400).json({ error: 'File parameter is required' });
            }

            const filename = path.basename(file);
            const pdfPath = path.join(__dirname, '../../../ai-agent/chatbot_backend/uploads', filename);

            if (!fs.existsSync(pdfPath)) {
                return res.status(404).json({ error: 'PDF file not found' });
            }

            const cacheDir = path.join(__dirname, '../../public/cache/pdf-images');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const baseName = path.parse(filename).name;

            try {
                const outputPrefix = path.join(cacheDir, `${baseName}_page`);
                execSync(`pdftoppm -png -r 200 "${pdfPath}" "${outputPrefix}"`);

                // Find all generated page images (prefix-1.png, prefix-2.png, ...)
                const generatedFiles = fs.readdirSync(cacheDir)
                    .filter(f => f.startsWith(`${baseName}_page-`) && f.endsWith('.png'))
                    .sort();

                if (generatedFiles.length > 0) {
                    const imageUrls = generatedFiles.map(f => `/cache/pdf-images/${f}`);
                    res.json({
                        success: true,
                        images: imageUrls,
                        totalPages: generatedFiles.length,
                    });
                } else {
                    res.status(500).json({ error: 'Failed to convert PDF to images' });
                }
            } catch (convertError) {
                console.error('PDF conversion error:', convertError);
                res.status(500).json({ error: 'Failed to convert PDF to images' });
            }

        } catch (error) {
            console.error('PDF converter error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new PDFConverterController();
