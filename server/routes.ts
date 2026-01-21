import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import mammoth from "mammoth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // File upload and analysis endpoint
  app.post("/api/cv/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let extractedText = "";
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Extract text based on file type
      if (mimeType === "application/pdf") {
        // pdf-parse has ESM/CJS interop issues - need to handle multiple export patterns
        const pdfParseModule = await import("pdf-parse") as { default?: unknown; [key: string]: unknown };
        const pdfParse = pdfParseModule.default || pdfParseModule;

        // pdf-parse might export a function directly or as a property
        const pdfParseObj = pdfParse as { default?: unknown };
        const parser = typeof pdfParse === 'function' ? pdfParse : pdfParseObj.default;

        if (typeof parser !== 'function') {
          console.error('pdf-parse module structure:', pdfParseModule);
          throw new Error('Could not load PDF parser');
        }

        const pdfData = await (parser as (buffer: Buffer) => Promise<{ text: string }>)(fileBuffer);
        extractedText = pdfData.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF or DOCX." });
      }

      // Basic validation
      if (extractedText.length < 100) {
        return res.status(400).json({ error: "Document appears to be too short or empty" });
      }

      // Return success with basic metadata
      // In a real application, this is where you'd run actual analysis
      res.json({
        success: true,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          wordCount: extractedText.split(/\s+/).length,
          characterCount: extractedText.length
        }
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process the uploaded file" });
    }
  });

  return httpServer;
}
