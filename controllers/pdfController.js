/**
 * getOcrData controller
 * ---------------------------------------------------------------
 * Expects: POST body -> { "pdf_url": "https://example.com/file.pdf" }
 */

import axios from "axios";
import FormData from "form-data";
import "dotenv/config";

// CRITICAL FIX: You MUST import the worker CanvasFactory BEFORE importing pdf-parse.
// This sets up the Node.js polyfills needed for @napi-rs/canvas to render pages.
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

const OCRSPACE_API_KEY = process.env.OCRSPACE_API_KEY || "helloworld"; 
const OCRSPACE_ENDPOINT = "https://api.ocr.space/parse/image";

// ---- OCR.space FREE PLAN HARD LIMITS ----
const FREE_PLAN_MAX_FILE_SIZE_BYTES = 1_000_000; // 1 MB
const FREE_PLAN_MAX_PDF_PAGES = 3;
const MIN_CHARS_TO_SKIP_OCR = 20;
const OCR_RENDER_WIDTH = 1654;

async function downloadPdf(url) {
  let resp;
  try {
    resp = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  } catch (e) {
    const err = new Error(`Could not download PDF: ${e.message}`);
    err.status = 400;
    throw err;
  }

  const buffer = Buffer.from(resp.data);
  if (buffer.slice(0, 4).toString("utf8") !== "%PDF") {
    const err = new Error("URL does not point to a valid PDF");
    err.status = 400;
    throw err;
  }
  return buffer;
}

async function ocrPageWithOcrSpace(imageBuffer) {
  const form = new FormData();
  form.append("file", imageBuffer, { filename: "page.png", contentType: "image/png" });
  form.append("apikey", OCRSPACE_API_KEY);
  form.append("OCREngine", "3"); 
  form.append("scale", "true"); 
  form.append("isTable", "false");

  let resp;
  try {
    resp = await axios.post(OCRSPACE_ENDPOINT, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxBodyLength: Infinity,
    });
  } catch (e) {
    const err = new Error(`OCR.space request failed: ${e.message}`);
    err.status = 502;
    throw err;
  }

  const result = resp.data;
  if (result.IsErroredOnProcessing) {
    const err = new Error(`OCR.space error: ${result.ErrorMessage}`);
    err.status = 502;
    throw err;
  }

  const parsedResults = result.ParsedResults || [];
  if (!parsedResults.length) return "";
  return (parsedResults[0].ParsedText || "").trim();
}

export const getOcrData = async (req, res) => {
  let parser;
  try {
    const { pdf_url } = req.body || {};

    if (!pdf_url) {
      return res.status(400).json({ detail: "pdf_url is required in the request body" });
    }

    const pdfBuffer = await downloadPdf(pdf_url);
    const fileSize = pdfBuffer.length;

    if (fileSize > FREE_PLAN_MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({
        detail: `Not possible to extract: file size is ${(fileSize / 1_000_000).toFixed(2)} MB, which exceeds the OCR.space FREE plan limit of 1 MB. Upgrade to a PRO plan or compress the PDF first.`
      });
    }

    // CRITICAL FIX: Pass the imported CanvasFactory and cast buffer to Uint8Array 
    // to satisfy the underlying pdfjs-dist engine.
    parser = new PDFParse({ 
      data: new Uint8Array(pdfBuffer), 
      CanvasFactory 
    });

    let pageCount;
    try {
      const info = await parser.getInfo();
      pageCount = info.total;
    } catch (e) {
      return res.status(400).json({ detail: `Could not open PDF: ${e.message}` });
    }

    if (pageCount > FREE_PLAN_MAX_PDF_PAGES) {
      return res.status(422).json({
        detail: `Not possible to extract: this PDF has ${pageCount} pages, which exceeds the OCR.space FREE plan limit of ${FREE_PLAN_MAX_PDF_PAGES} pages. Split the PDF into smaller files first.`
      });
    }

    const textResult = await parser.getText();
    const directTextByPage = new Map(textResult.pages.map((p) => [p.num, p.text || ""]));

    const pagesResult = [];
    let ocrPagesUsed = 0;

    for (let i = 1; i <= pageCount; i++) {
      const directText = (directTextByPage.get(i) || "").trim();

      if (directText.length >= MIN_CHARS_TO_SKIP_OCR) {
        pagesResult.push({ page: i, source: "direct_extraction", text: directText });
      } else {
        const screenshot = await parser.getScreenshot({
          partial: [i],
          desiredWidth: OCR_RENDER_WIDTH,
          imageBuffer: true,
          imageDataUrl: false,
        });
        
        const pageImage = Buffer.from(screenshot.pages[0].data);
        const ocrText = await ocrPageWithOcrSpace(pageImage);
        ocrPagesUsed++;
        
        pagesResult.push({ page: i, source: "ocr", text: ocrText });
      }
    }

    const fullText = pagesResult.map((p) => p.text).join("\n\n");

    return res.status(200).json({
      pdf_url,
      file_size_bytes: fileSize,
      total_pages: pageCount,
      ocr_pages_used: ocrPagesUsed,
      pages: pagesResult,
      full_text: fullText,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ detail: err.message || "Internal server error" });
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};