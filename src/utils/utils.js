export const capitalizeFirstLetter = (input) => {
  return input
      ?.toLowerCase() // Convert the entire string to lowercase
      .split(' ')    // Split the string into an array of words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
      .join(' ');    // Join the words back into a single string
}

export const handleRedirectToLinkedIn = (link) => {
  const linkedinUrl = link;

  if (linkedinUrl) {
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  } else {
    alert('LinkedIn profile is not available for this candidate.');
  }
};