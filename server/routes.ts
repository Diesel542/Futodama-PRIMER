import type { Express } from "express";
import { type Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import { v4 as uuidv4 } from 'uuid';

import { cvStorage } from "./storage";
import { parseWithLLM } from "./engine/llm-parser";
import { generateObservations, createObservation, identifyStrengths } from "./engine/observationGenerator";
import { phraseObservation, generateProposal, rewriteSection, phraseStrengths } from "./llm/claude";
import { PARSE_THRESHOLDS } from "./engine/thresholds";
import {
  CV,
  AnalyzeResponse,
  RewriteResponse,
  ErrorResponse,
  RewriteRequestSchema,
  ObservationRespondSchema
} from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============================================
  // POST /api/cv/analyze
  // ============================================
  app.post("/api/cv/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          code: "UNSUPPORTED_FORMAT"
        } as ErrorResponse);
      }

      let extractedText = "";
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Extract text based on file type
      if (mimeType === "application/pdf") {
        // pdf-parse has ESM/CJS interop issues - handle various export patterns
        const pdfParseModule = await import("pdf-parse") as any;

        let pdfData: { text: string };

        // Check if PDFParse is a class (Replit pattern) vs function (standard pattern)
        if (pdfParseModule.PDFParse) {
          // PDFParse is a class - pass data in constructor, then call getText()
          const parser = new pdfParseModule.PDFParse({ data: fileBuffer });
          const textResult = await parser.getText();
          pdfData = { text: textResult.text };
        } else {
          // Standard pattern - default export is a function
          const pdfParse = pdfParseModule.default || pdfParseModule;
          if (typeof pdfParse !== 'function') {
            console.error('pdf-parse module structure:', Object.keys(pdfParseModule));
            throw new Error('Could not load PDF parser');
          }
          pdfData = await pdfParse(fileBuffer);
        }

        extractedText = pdfData.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({
          error: "Unsupported file type. Please upload PDF or DOCX.",
          code: "UNSUPPORTED_FORMAT"
        } as ErrorResponse);
      }

      // Basic validation
      if (extractedText.length < PARSE_THRESHOLDS.MIN_CONTENT_LENGTH) {
        return res.status(400).json({
          error: "Document appears to be too short or empty",
          code: "FILE_TOO_SHORT"
        } as ErrorResponse);
      }

      // Parse CV into structured sections using LLM
      const parseResult = await parseWithLLM(extractedText);

      // Check if we got usable sections (but don't fail - show something even if parsing isn't perfect)
      if (parseResult.sections.length === 0 || parseResult.overallConfidence === 'low') {
        console.warn('CV parsing had issues:', parseResult.warnings);
      }

      // Generate raw observations
      const rawObservations = generateObservations(parseResult.sections);

      // Phrase observations using LLM
      const phrasedObservations = await Promise.all(
        rawObservations.map(async (raw) => {
          const observationContext = {
            signal: raw.signal,
            sectionTitle: raw.context.sectionTitle as string | undefined,
            wordCount: raw.context.wordCount as number | undefined,
            durationMonths: raw.context.durationMonths as number | undefined,
            wordsPerMonth: raw.context.wordsPerMonth as number | undefined,
            monthsSinceEnd: raw.context.monthsSinceEnd as number | undefined,
            gapMonths: raw.context.gapMonths as number | undefined,
            completeness: raw.context.completeness as { hasMetrics: boolean; hasOutcomes: boolean; hasTools: boolean; hasTeamSize: boolean } | undefined,
          };
          const message = await phraseObservation(observationContext);
          const proposal = await generateProposal(raw.signal, (raw.context.sectionTitle as string) || 'Section');
          return createObservation(raw, message, proposal);
        })
      );

      // Identify and phrase strengths
      const strengthSignals = identifyStrengths(parseResult.sections);
      const sectionSummaries = parseResult.sections
        .slice(0, 5)
        .map(s => `${s.title}: ${s.content.substring(0, 100)}...`);
      const strengths = await phraseStrengths(strengthSignals, sectionSummaries);

      // Build CV object
      const cv: CV = {
        id: uuidv4(),
        uploadedAt: new Date().toISOString(),
        fileName: req.file.originalname,
        rawText: extractedText,
        sections: parseResult.sections,
        observations: phrasedObservations,
        strengths,
      };

      // Store for later operations
      cvStorage.store(cv);

      // Return response
      const response: AnalyzeResponse = {
        cv,
        observations: phrasedObservations,
        strengths,
      };

      res.json(response);

    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({
        error: "Failed to process the uploaded file",
        code: "ANALYSIS_FAILED"
      } as ErrorResponse);
    }
  });

  // ============================================
  // POST /api/cv/:cvId/rewrite
  // ============================================
  app.post("/api/cv/:cvId/rewrite", async (req, res) => {
    try {
      const { cvId } = req.params;
      const parsed = RewriteRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          code: "PARSE_FAILED",
          details: parsed.error.message
        } as ErrorResponse);
      }

      const { sectionId } = parsed.data;
      const section = cvStorage.getSection(cvId, sectionId);

      if (!section) {
        return res.status(404).json({
          error: "Section not found",
          code: "SECTION_NOT_FOUND"
        } as ErrorResponse);
      }

      const rewritten = await rewriteSection(
        section.content,
        section.title,
        section.organization,
        section.duration
      );

      const response: RewriteResponse = {
        original: section.content,
        rewritten,
      };

      res.json(response);

    } catch (error) {
      console.error("Error rewriting section:", error);
      res.status(500).json({
        error: "Failed to rewrite section",
        code: "ANALYSIS_FAILED"
      } as ErrorResponse);
    }
  });

  // ============================================
  // POST /api/cv/:cvId/observation/:observationId/respond
  // ============================================
  app.post("/api/cv/:cvId/observation/:observationId/respond", async (req, res) => {
    try {
      const { cvId, observationId } = req.params;
      const parsed = ObservationRespondSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          code: "PARSE_FAILED",
          details: parsed.error.message
        } as ErrorResponse);
      }

      const { response: userResponse } = parsed.data;
      const observation = cvStorage.updateObservation(cvId, observationId, userResponse);

      if (!observation) {
        return res.status(404).json({
          error: "Observation not found",
          code: "SECTION_NOT_FOUND"
        } as ErrorResponse);
      }

      res.json({
        success: true,
        observation,
      });

    } catch (error) {
      console.error("Error updating observation:", error);
      res.status(500).json({
        error: "Failed to update observation",
        code: "ANALYSIS_FAILED"
      } as ErrorResponse);
    }
  });

  return httpServer;
}
