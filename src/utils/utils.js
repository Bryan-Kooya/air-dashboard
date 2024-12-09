export const capitalizeFirstLetter = (input) => {
  return input
      ?.toLowerCase() // Convert the entire string to lowercase
      .split(' ')    // Split the string into an array of words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
      .join(' ');    // Join the words back into a single string
}

export const handleRedirectToLinkedIn = (link) => {
  const profile = link.toLowerCase();
  if (!profile) {
    alert('LinkedIn profile is not available for this candidate.');
    return;
  }

  // Ensure the link starts with "http://" or "https://"
  const linkedinUrl = profile.startsWith('http://') || profile.startsWith('https://') 
    ? profile 
    : `https://${profile}`;

  // Open the URL in a new tab
  window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);

  const options = date.getFullYear() === new Date().getFullYear()
    ? { month: 'short', day: '2-digit' } // Format as 'Oct 27'
    : { month: 'short', day: '2-digit', year: 'numeric' }; // Format as 'Dec 03, 2023'

  return new Intl.DateTimeFormat('en-US', options).format(date);
}