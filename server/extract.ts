import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { ocrPhysicsImage, redactPotentialPii } from './gemini.ts';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.pptx', '.docx', '.png', '.jpg', '.jpeg', '.webp']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export type ExtractedSourceType = 'pdf' | 'pptx' | 'docx' | 'image';

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractSlideNumber(filePath: string): number {
  const match = filePath.match(/(\d+)\.xml$/);
  return match ? Number(match[1]) : 0;
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => extractSlideNumber(a) - extractSlideNumber(b));

  if (slideFiles.length === 0) {
    throw new Error('No slides found inside this PowerPoint (.pptx) file.');
  }

  const sections: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('string');
    const textMatches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
      decodeXmlEntities(m[1]).trim()
    );
    const slideText = textMatches.filter(Boolean).join(' ');
    if (slideText) {
      sections.push(`Slide ${extractSlideNumber(slidePath)}: ${slideText}`);
    }
  }

  const combined = sections.join('\n\n').trim();
  if (!combined) {
    throw new Error('No readable text found in this PowerPoint (.pptx) presentation.');
  }
  return combined;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();
    if (!text) {
      throw new Error(
        'This PDF appears to be scanned images with no selectable text. Try uploading screenshots/photos of the pages instead.'
      );
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || '').trim();
  if (!text) {
    throw new Error('No readable text found in this Word (.docx) document.');
  }
  return text;
}

export async function extractUploadedDocument(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): Promise<{ extractedText: string; sourceType: ExtractedSourceType }> {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('File must be between 1 byte and 10 MB.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Unsupported file type. Upload PDF, PPTX, DOCX, PNG, JPG, or WEBP.');
  }

  let rawText = '';
  let sourceType: ExtractedSourceType = 'pdf';

  if (ext === '.pdf' || file.mimetype === 'application/pdf') {
    sourceType = 'pdf';
    rawText = await extractPdfText(file.buffer);
  } else if (
    ext === '.pptx' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    sourceType = 'pptx';
    rawText = await extractPptxText(file.buffer);
  } else if (
    ext === '.docx' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    sourceType = 'docx';
    rawText = await extractDocxText(file.buffer);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || file.mimetype.startsWith('image/')) {
    sourceType = 'image';
    const safeMime = file.mimetype.startsWith('image/') ? file.mimetype : 'image/png';
    rawText = await ocrPhysicsImage(file.buffer, safeMime);
  } else {
    throw new Error('Unsupported file format.');
  }

  const cleaned = redactPotentialPii(rawText.replace(/\r\n/g, '\n').trim()).slice(0, 95000);
  if (!cleaned) {
    throw new Error('Could not extract readable text from the uploaded file.');
  }

  return { extractedText: cleaned, sourceType };
}
