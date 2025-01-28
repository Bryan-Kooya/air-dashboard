import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import mammoth from "mammoth";

// Set the worker source to the local file
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export const extractTextFromPDF = async (pdfUrl) => {
  const loadingTask = getDocument(pdfUrl);
  const pdf = await loadingTask.promise;

  let extractedText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    // Concatenate all text items into a single string
    textContent.items.forEach((item) => {
      extractedText += item.str + " ";
    });
  }

  return extractedText.trim(); // Return the extracted text
}

export const extractTextFromDocx = async (docxUrl) => {
  const response = await fetch(docxUrl);
  const arrayBuffer = await response.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value; // Extracted plain text
}

// Generate initials from the user's name
export const getInitials = (name) => {
  if (!name) return "?";
  const names = name.split(" ");
  const initials = names.map((n) => n[0]).join("").toUpperCase();
  return initials;
};

export const translateToEnglish = async (text) => {
  try {
    const apiKey = 'AIzaSyBpiGRjYvgayUj1sOg7XGj010vZanq6ZO8';
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'iw', // Hebrew
        target: 'en', // English
      }),
    });

    const data = await response.json();
    return data.data.translations[0].translatedText.toLowerCase();
  } catch (error) {
    console.error("Error translating text:", error);
    return text; // Return the original text if translation fails
  }
};