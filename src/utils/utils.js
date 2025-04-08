export const capitalizeFirstLetter = (input) => {
  return input
      ?.toLowerCase() // Convert the entire string to lowercase
      .split(' ')    // Split the string into an array of words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
      .join(' ');    // Join the words back into a single string
}

export const convertArrayToLowercase = (arr) => {
  // Check if the input is an array
  if (!Array.isArray(arr)) {
    throw new Error("Input must be an array.");
  }

  // Use map() to create a new array with all strings converted to lowercase
  return arr.map((item) => {
    // Check if the item is a string
    if (typeof item !== "string") {
      throw new Error("All elements in the array must be strings.");
    }
    return item.toLowerCase();
  });
}

export const handleRedirectToLinkedIn = (link) => {
  const profile = link.toLowerCase();
  if (!profile) {
    return false;
  }

  // Ensure the link starts with "http://" or "https://"
  const linkedinUrl = profile.startsWith('http://') || profile.startsWith('https://') 
    ? profile 
    : `https://${profile}`;

  // Open the URL in a new tab
  window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
};

export const convertDateFormat = (dateString) => {
  // Return a default value if dateString is null or empty
  if (!dateString) {
    return "N/A"; // or simply return an empty string ""
  }
  
  // Handle both YYYY-MM-DD (from input) and DD-MM-YYYY (from storage)
  const [first, second, third] = dateString.split("-");
  
  // Detect format: if first segment is 4 digits, it's YYYY-MM-DD
  if (first.length === 4) { 
    return new Intl.DateTimeFormat("en-US", { 
      month: "short", 
      day: "2-digit", 
      year: "numeric" 
    }).format(new Date(dateString));
  }
  
  // Assume format is DD-MM-YYYY
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(`${third}-${second}-${first}`));
};  

export const formatDate = (dateString) => {
  const date = new Date(dateString);

  const options = date.getFullYear() === new Date().getFullYear()
    ? { month: 'short', day: '2-digit' } // Format as 'Oct 27'
    : { month: 'short', day: '2-digit', year: 'numeric' }; // Format as 'Dec 03, 2023'

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export const truncateText = (text, maxLength) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

export const scoreColor = (score) => {
  if (score >= 80) {
    return '#2AD324';
  } else if (score > 49 && score < 80) {
    return '#FFB20D';
  } else if (score > 29 && score < 50) {
    return '#f97316';
  } else if (score >= 0 && score < 30) {
    return '#F91E24';
  } else {
    return '#0A66C2';
  }
};

export const formatDisplayDate = (date) => {
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const parseDateDDMMYYYY = (dateString) => {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is zero-indexed in JavaScript Date
};