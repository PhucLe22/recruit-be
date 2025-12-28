const path = require('path');
const fs = require('fs');
const poppler = require('pdf-poppler');

class PDFConverterController {
    /**
     * Convert PDF to PNG image
     * GET /convert-pdf-to-image?file=/ai-uploads/filename.pdf
     */
    async convertToImage(req, res) {
        try {
            const { file } = req.query;
            
            console.log('PDF conversion request:', { file });
            
            if (!file) {
                return res.status(400).json({ error: 'File parameter is required' });
            }

            // Extract filename from the file path
            const filename = path.basename(file);
            console.log('Extracted filename:', filename);
            
            // Construct the full path to the PDF file
            const pdfPath = path.join(__dirname, '../../../ai-agent/chatbot_backend/uploads', filename);
            console.log('PDF path:', pdfPath);
            
            // Check if file exists
            if (!fs.existsSync(pdfPath)) {
                console.log('PDF file not found at:', pdfPath);
                return res.status(404).json({ error: 'PDF file not found', path: pdfPath });
            }

            console.log('PDF file exists, proceeding with conversion');

            // Create cache directory if it doesn't exist
            const cacheDir = path.join(__dirname, '../../public/cache/pdf-images');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Generate cache filename
            const cacheFilename = `${path.parse(filename).name}.png`;
            const cachePath = path.join(cacheDir, cacheFilename);

            // Check if cached image exists and is newer than PDF
            if (fs.existsSync(cachePath)) {
                const pdfStat = fs.statSync(pdfPath);
                const cacheStat = fs.statSync(cachePath);
                
                if (cacheStat.mtime > pdfStat.mtime) {
                    // Serve cached image
                    return res.sendFile(cachePath);
                }
            }

            // Convert PDF to PNG
            const options = {
                format: 'png',
                out_dir: cacheDir,
                out_prefix: path.parse(filename).name,
                page: null // Convert all pages
            };

            try {
                console.log('Starting PDF conversion with options:', options);
                // Convert PDF to images
                const convertResults = await poppler.convert(pdfPath, options);
                console.log('Conversion results:', convertResults);
                
                if (convertResults && convertResults.length > 0) {
                    // Get the first page image
                    const firstPageImage = convertResults[0];
                    console.log('First page image:', firstPageImage);
                    
                    // Rename to our standard cache filename
                    if (firstPageImage !== cachePath) {
                        fs.renameSync(firstPageImage, cachePath);
                    }
                    
                    console.log('Serving cached image:', cachePath);
                    // Serve the converted image
                    res.sendFile(cachePath);
                } else {
                    console.error('No conversion results');
                    res.status(500).json({ error: 'Failed to convert PDF to image - no results' });
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
     * Convert PDF to PNG image (all pages as separate images)
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
            const options = {
                format: 'png',
                out_dir: cacheDir,
                out_prefix: baseName,
                page: null
            };

            try {
                const convertResults = await poppler.convert(pdfPath, options);
                
                if (convertResults && convertResults.length > 0) {
                    const imageUrls = convertResults.map((imagePath, index) => {
                        const imageName = `${baseName}_page_${index + 1}.png`;
                        const newPath = path.join(cacheDir, imageName);
                        
                        // Rename the file to our standard naming
                        if (imagePath !== newPath) {
                            fs.renameSync(imagePath, newPath);
                        }
                        
                        return `/cache/pdf-images/${imageName}`;
                    });
                    
                    res.json({ 
                        success: true, 
                        images: imageUrls,
                        totalPages: convertResults.length 
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
