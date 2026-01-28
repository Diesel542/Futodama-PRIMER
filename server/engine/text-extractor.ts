import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';

const OCR_PAGE_LIMIT = 20;
const MIN_TEXT_FOR_SUCCESS = 100;

interface ExtractionResult {
  text: string;
  method: 'pdfjs' | 'ocr' | 'mammoth' | 'fallback';
  warnings: string[];
  pageCount?: number;
}

// ============================================
// GOOGLE DOCUMENT AI OCR
// ============================================

async function ocrSingleDocument(
  buffer: Buffer,
  credentialsJson: string,
  processorId: string
): Promise<string | null> {
  try {
    const credentials = JSON.parse(credentialsJson);
    const client = new DocumentProcessorServiceClient({
      credentials,
      apiEndpoint: 'eu-documentai.googleapis.com',
    });

    const projectId = credentials.project_id;
    const location = 'eu';
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
      name,
      rawDocument: {
        content: buffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    console.log('[OCR] Sending to Document AI...');
    const [result] = await client.processDocument(request);
    const text = result.document?.text || null;

    if (text) {
      console.log('[OCR] Success:', text.length, 'characters extracted');
    }

    return text;
  } catch (error) {
    console.error('[OCR] Single document OCR failed:', error);
    return null;
  }
}

async function extractTextWithOCR(buffer: Buffer): Promise<string | null> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

  if (!credentialsJson) {
    console.log('[OCR] No Google credentials configured - skipping OCR');
    return null;
  }

  if (!processorId) {
    console.log('[OCR] No processor ID configured - skipping OCR');
    return null;
  }

  try {
    // Load PDF to check page count
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    console.log('[OCR] PDF has', pageCount, 'pages');

    // If within limit, process directly
    if (pageCount <= OCR_PAGE_LIMIT) {
      console.log('[OCR] Processing directly (within', OCR_PAGE_LIMIT, 'page limit)');
      return await ocrSingleDocument(buffer, credentialsJson, processorId);
    }

    // Otherwise, split into chunks and process each
    console.log('[OCR] Splitting PDF into chunks of', OCR_PAGE_LIMIT, 'pages');
    const chunks: Buffer[] = [];

    for (let startPage = 0; startPage < pageCount; startPage += OCR_PAGE_LIMIT) {
      const endPage = Math.min(startPage + OCR_PAGE_LIMIT, pageCount);

      const chunkDoc = await PDFDocument.create();
      const pages = await chunkDoc.copyPages(
        pdfDoc,
        Array.from({ length: endPage - startPage }, (_, i) => startPage + i)
      );
      pages.forEach(page => chunkDoc.addPage(page));

      const chunkBuffer = Buffer.from(await chunkDoc.save());
      chunks.push(chunkBuffer);
      console.log('[OCR] Created chunk:', startPage + 1, '-', endPage, '(', endPage - startPage, 'pages)');
    }

    // OCR each chunk and combine
    const textParts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log('[OCR] Processing chunk', i + 1, 'of', chunks.length);
      const chunkText = await ocrSingleDocument(chunks[i], credentialsJson, processorId);
      if (chunkText) {
        textParts.push(chunkText);
      }
    }

    const fullText = textParts.join('\n\n');
    console.log('[OCR] Combined text:', fullText.length, 'characters from', chunks.length, 'chunks');

    return fullText || null;
  } catch (error) {
    console.error('[OCR] Extraction failed:', error);
    return null;
  }
}

// ============================================
// PDF EXTRACTION (pdfjs-dist + OCR fallback)
// ============================================

export async function extractPdfText(buffer: Buffer): Promise<ExtractionResult> {
  const warnings: string[] = [];

  try {
    // Try normal PDF extraction first (fast, free)
    console.log('[PDF] Attempting pdfjs-dist extraction...');
    const data = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = '';
    const pageCount = pdf.numPages;
    console.log('[PDF] Document has', pageCount, 'pages');

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    const trimmedText = fullText.trim();

    // If we got meaningful text, return it
    if (trimmedText && trimmedText.length > MIN_TEXT_FOR_SUCCESS) {
      console.log('[PDF] pdfjs-dist extraction successful:', trimmedText.length, 'chars');
      return {
        text: trimmedText,
        method: 'pdfjs',
        warnings,
        pageCount,
      };
    }

    // Otherwise, try OCR (probably a scanned document)
    console.log('[PDF] Text extraction minimal (' + trimmedText.length + ' chars), trying OCR...');
    warnings.push('PDF appears to be scanned or image-based, attempting OCR');

    const ocrText = await extractTextWithOCR(buffer);

    if (ocrText && ocrText.length > MIN_TEXT_FOR_SUCCESS) {
      return {
        text: ocrText,
        method: 'ocr',
        warnings,
        pageCount,
      };
    }

    // Return whatever we got if OCR also failed
    if (trimmedText) {
      warnings.push('OCR did not improve extraction, using original text');
      return {
        text: trimmedText,
        method: 'fallback',
        warnings,
        pageCount,
      };
    }

    // Complete failure
    warnings.push('Could not extract text from PDF');
    return {
      text: '',
      method: 'fallback',
      warnings,
      pageCount,
    };

  } catch (error) {
    console.error('[PDF] pdfjs-dist extraction failed:', error);
    warnings.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // Try OCR as last resort
    console.log('[PDF] Trying OCR after pdfjs failure...');
    const ocrText = await extractTextWithOCR(buffer);

    if (ocrText) {
      return {
        text: ocrText,
        method: 'ocr',
        warnings,
      };
    }

    return {
      text: '',
      method: 'fallback',
      warnings,
    };
  }
}

// ============================================
// WORD DOCUMENT EXTRACTION
// ============================================

export async function extractWordText(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const warnings: string[] = [];

  // Check for old .doc format
  if (mimeType === 'application/msword') {
    warnings.push('Legacy .doc format detected - extraction may be limited');
    console.log('[Word] Legacy .doc format - attempting extraction...');
  }

  try {
    console.log('[Word] Attempting mammoth extraction...');
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages && result.messages.length > 0) {
      result.messages.forEach((msg: any) => {
        console.log('[Word] mammoth message:', msg.type, msg.message);
        if (msg.type === 'warning' || msg.type === 'error') {
          warnings.push(msg.message);
        }
      });
    }

    const text = result.value.trim();

    if (text.length < MIN_TEXT_FOR_SUCCESS) {
      warnings.push('Very little text extracted from document');
      console.log('[Word] Minimal extraction:', text.length, 'chars');
    } else {
      console.log('[Word] Extraction successful:', text.length, 'chars');
    }

    return {
      text,
      method: 'mammoth',
      warnings,
    };

  } catch (error) {
    console.error('[Word] mammoth extraction failed:', error);
    warnings.push(`Word extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      text: '',
      method: 'fallback',
      warnings,
    };
  }
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<ExtractionResult> {
  console.log('[Extract] Starting extraction for:', filename || 'unknown', 'type:', mimeType);

  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return extractWordText(buffer, mimeType);
  }

  // Unsupported type
  return {
    text: '',
    method: 'fallback',
    warnings: [`Unsupported file type: ${mimeType}`],
  };
}
