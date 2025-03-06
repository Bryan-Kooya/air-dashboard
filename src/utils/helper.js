import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import mammoth from "mammoth";
import JSZip from 'jszip';

// Set the worker source to the local file
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export const extractTextFromPDF = async (pdfUrl) => {
  const loadingTask = getDocument(pdfUrl);
  const pdf = await loadingTask.promise;

  let extractedText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    // Use a custom text content handler to handle RTL text and font encoding
    textContent.items.forEach((item) => {
      // Check if the text is RTL (Hebrew) and handle it accordingly
      if (item.str && item.str.match(/[\u0590-\u05FF]/)) { // Hebrew Unicode range
        extractedText += item.str.split('').reverse().join('') + " "; // Reverse RTL text
      } else {
        extractedText += item.str + " ";
      }
    });
  }

  return extractedText.trim(); // Return the extracted text
};
export const extractTextFromDocx = async (docxUrl) => {
  const response = await fetch(docxUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Extract main body text using mammoth
  const result = await mammoth.extractRawText({ arrayBuffer });
  const bodyText = result.value;

  // Use JSZip to extract headers
  const zip = await JSZip.loadAsync(arrayBuffer);
  let headerText = '';

  // Loop through all files in the zip to find headers
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.startsWith('word/header') && filename.endsWith('.xml')) {
      const headerContent = await file.async('text');
      headerText += headerContent + '\n';
    }
  }

  // Combine body text and header text
  const fullText = `Headers:\n${headerText}\nBody:\n${bodyText}`;
  return fullText;
};

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

export const translateToHebrew = async (text) => {
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
        source: 'en', // English
        target: 'iw', // Hebrew
      }),
    });

    const data = await response.json();
    return data.data.translations[0].translatedText.toLowerCase();
  } catch (error) {
    console.error("Error translating text:", error);
    return text; // Return the original text if translation fails
  }
};

export const getStatus = (value) => {
  // If value is a string, remove non-numeric characters (excluding the decimal point)
  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^\d.]/g, ''))
    : value;

  return numericValue > 79 ? 'passed' : 'failed';
};

export const formatTimestamp = (timestamp) => {
  // Check if the timestamp is null, undefined, or not in the expected format
  if (!timestamp || typeof timestamp.seconds !== 'number' || typeof timestamp.nanoseconds !== 'number') {
    return "N/A"; // Return a default value instead of throwing an error
  }

  try {
    // Convert seconds to milliseconds and add nanoseconds (converted to milliseconds)
    const milliseconds = timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);

    // Create a Date object
    const date = new Date(milliseconds);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date"; // Return a default value if the date is invalid
    }

    // Format the date and time
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    // Convert to the desired format
    const formattedDate = date.toLocaleString('en-US', options);

    // Replace the comma with a hyphen and ensure proper spacing
    return formattedDate.replace(",", " -");
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "N/A"; // Return a default value in case of any unexpected errors
  }
};