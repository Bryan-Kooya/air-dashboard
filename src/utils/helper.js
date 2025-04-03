import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import mammoth from "mammoth";
import JSZip from 'jszip';
import { apiBaseUrl, googleApiKey, israeli_universities, industries } from "./constants";

// Set the worker source to the local file
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const geocodeAddress = async (address) => {
  const response = await fetch(`${apiBaseUrl}/get-geocode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status: ${response.status}`);
  }
  
  const data = await response.json();
  return data; // Expected to return an object like { lat, lng }
};

// Helper: Convert degrees to radians
const toRadians = (degrees) => degrees * (Math.PI / 180);

// Helper: Calculate distance in kilometers using the Haversine formula
const calculateDistance = (loc1, loc2) => {
  console.log('loc1, loc2', loc1, loc2)
  const R = 6371; // Radius of the Earth in km
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLon = toRadians(loc2.lng - loc1.lng);
  const lat1 = toRadians(loc1.lat);
  const lat2 = toRadians(loc2.lat);
  
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: Get location score based on distance (in km) with maximum score of 10
const getLocationScore = (distance) => {
  if (distance <= 10) return 10;
  if (distance <= 15) return 9;
  if (distance <= 20) return 8;
  if (distance <= 25) return 7;
  if (distance <= 30) return 6;
  if (distance <= 40) return 5;
  if (distance <= 50) return 2.5;
  return 0;
};

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
    const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
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
    const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
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
      month: 'numeric',
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

export const customJobMatchScore = async (contact, jobTitleTags, jobLocation, jobIndustry, filtersData, jobTags) => {
  // Calculate tag matching score (max 50)
  const updatedJobTags = Array.from(new Set([...jobTitleTags, ...jobTags]));
  const scorePerTag = jobTags.length > 0 ? (50 / jobTags.length) : 0;
  const matchedTags = [];
  let tagTotalScore = 0;
  
  // List of fields to compare against for tag matching
  const tagFields = [
    'alternative_job_title_tags_en',
    'alternative_job_title_tags_he',
    'alternative_mandatory_tags_en',
    'alternative_mandatory_tags_he',
    'job_title_tags',
    'mandatory_tags',
    'skills',
  ];
  
  updatedJobTags.forEach(tag => {
    const tagExists = tagFields.some(field => {
      const contactTags = contact[field];
      return contactTags && contactTags.includes(tag);
    });
    if (tagExists) {
      tagTotalScore += scorePerTag;
      matchedTags.push(tag);
    }
  });

  // Tag score breakdown
  const finalTagScore = Math.min(tagTotalScore, 50);
  const tagScoreFinal = Math.round(finalTagScore * 2);

  // Location score breakdown
  let locationBaseScore = 10;
  let distance = 0;
  let jobLocationCoords;
  let contactLocationCoords;
  if (filtersData?.location && jobLocation && contact.location) {
    jobLocationCoords = typeof jobLocation === 'string' 
      ? await geocodeAddress(jobLocation) 
      : jobLocation;
    contactLocationCoords = typeof contact.location === 'string' 
      ? await geocodeAddress(contact.location) 
      : contact.location;
    distance = calculateDistance(jobLocationCoords, contactLocationCoords);
    locationBaseScore = getLocationScore(distance);
  }
  const locationScoreFinal = Math.round(locationBaseScore * 10);

  // Institution score breakdown
  let institutionScore = 10;
  let institutionName = null;
  if (filtersData?.institution) {
    institutionScore = 0;
    const getInstitutionScore = (name) => {
      if (!name) return 0;
      const normalizedName = name.trim().toLowerCase();
      const university = israeli_universities.find(u => 
        u.name.trim().toLowerCase() === normalizedName
      );
      if (university) institutionName = university.name;
      return university?.score;
    };
    if (contact.education?.length) {
      for (const edu of contact.education) {
        if (edu.institution) {
          const scoreInstitution = getInstitutionScore(edu.institution);
          if (scoreInstitution !== undefined) {
            institutionScore = scoreInstitution;
            break;
          }
        }
      }
    }
  }

  // Industry score breakdown
  let industryScore = 10;
  let industryName = null;
  if (filtersData?.industry) {
    industryScore = 0;
    const getIndustryScore = (name) => {
      if (!name || !jobIndustry) return 0;
      const normalizedName = name.trim().toLowerCase();
      // Normalize jobIndustry to lower case for consistent comparison
      const industryList = industries.find(ind => ind.type.toLowerCase() === jobIndustry.toLowerCase());
      if (!industryList) return 0;
      // Search for a matching institution in the industry list using both English and Hebrew names
      const industry = industryList.list.find(u => 
        (u.name_en && u.name_en.trim().toLowerCase() === normalizedName) ||
        (u.name_he && u.name_he.trim().toLowerCase() === normalizedName)
      );
      if (industry) {
        industryName = industry.name_he || industry.name_en;
        return industry.score;
      }
      return 0;
    };
    if (contact.education?.length) {
      for (const edu of contact.education) {
        if (edu.institution) {
          const scoreIndustry = getIndustryScore(edu.institution);
          if (scoreIndustry !== undefined) {
            industryScore = scoreIndustry;
            break;
          }
        }
      }
    }
    if (contact.work_experience?.length) {
      for (const work of contact.work_experience) {
        if (work.company) {
          const scoreIndustry = getIndustryScore(work.company);
          if (scoreIndustry !== undefined) {
            industryScore = scoreIndustry;
            break;
          }
        }
      }
    }
  }

  const institutionScoreFinal = Math.round(institutionScore * 10);
  const industryScoreFinal = Math.round(industryScore * 10);

  // Other scores (to be implemented)
  const salaryBase = 10;
  const workSetupBase = 5;
  const workShiftBase = 5;

  const baseOverallScore = finalTagScore + locationBaseScore + institutionScore + industryScore + salaryBase + workSetupBase + workShiftBase;
  const finalOverallScore = Math.round(baseOverallScore);

  return {
    tagScore: {
      baseScore: tagTotalScore,
      maxPossible: 50,
      cappedScore: finalTagScore,
      finalScore: tagScoreFinal,
      matchedTags,
      calculation: `min(${tagTotalScore}, 50) × 2`
    },
    locationScore: {
      baseScore: locationBaseScore,
      distanceKm: distance,
      finalScore: locationScoreFinal,
      calculation: `${locationBaseScore} × 10`
    },
    institutionScore: {
      baseScore: institutionScore,
      institutionName: institutionName,
      finalScore: institutionScoreFinal,
      calculation: `${institutionScore} × 10`
    },
    industryScore: {
      baseScore: industryScore,
      finalScore: industryScoreFinal,
      industryName: industryName,
      calculation: `${industryScore} × 10`
    },
    salaryScore: {
      baseScore: salaryBase,
      finalScore: Math.round(salaryBase * 10),
      calculation: "Base score (to be implemented)"
    },
    workSetupScore: {
      baseScore: workSetupBase,
      finalScore: Math.round(workSetupBase * 20),
      calculation: "Base score (to be implemented)"
    },
    workShiftScore: {
      baseScore: workShiftBase,
      finalScore: Math.round(workShiftBase * 20),
      calculation: "Base score (to be implemented)"
    },
    overallScore: {
      baseScore: baseOverallScore,
      finalScore: finalOverallScore,
    }
  };
};