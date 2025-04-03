import { collection, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where, doc, deleteDoc, getDoc, deleteField, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const getConversationCount = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch conversation count.");
  }

  // Create a query to filter conversations by the current userId
  const conversationsCollection = collection(db, "linkedinConversations");
  const userQuery = query(
    conversationsCollection, 
    where("userId", "==", userId),
    where("read" , "==", false)
  );

  // Fetch the total count of documents for the user
  const countSnapshot = await getCountFromServer(userQuery);

  return countSnapshot.data().count; // Return the count of documents
};

export const fetchPaginatedConversations = async (pageSize, lastVisibleDoc = null, userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch conversations.");
  }

  try {
    const conversationsCollection = collection(db, "linkedinConversations");

    // Base query for paginated data
    let q = query(
      conversationsCollection,
      where("userId", "==", userId),
      orderBy("timestamp"),
      limit(pageSize)
    );

    // Add pagination if lastVisibleDoc exists
    if (lastVisibleDoc) {
      q = query(
        conversationsCollection,
        where("userId", "==", userId),
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId
    const countQuery = query(conversationsCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    // Get the last visible document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    // Map documents to data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { data, lastVisible, total: totalDocuments };
  } catch (error) {
    console.error("Error fetching paginated conversations:", error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

export const searchConversations = async (searchQuery, userId) => {
  const conversationsCollection = collection(db, "linkedinConversations");
  const q = query(conversationsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter in memory
  const filteredData = data.filter((conversation) => {
    // Check if the connection name matches the search query
    if (conversation.connection.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }

    // Flatten all messages into a single array
    const allMessages = Object.values(conversation.messagesByDate).flat();

    // Check if any message text or attachment name matches the search query
    return allMessages.some((message) => {
      // Check message text
      if (message.messageText && message.messageText.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
      }

      // Check attachments
      if (message.attachments && message.attachments.some((attachment) => 
        attachment.name && attachment.name.toLowerCase().includes(searchQuery.toLowerCase())
      )) {
        return true;
      }

      return false;
    });
  });

  return filteredData;
};

export const fetchPaginatedCandidates = async (pageSize, lastVisibleDoc, userId) => {
  try {
    const candidatesCollection = collection(db, "candidates");

    // Query for paginated data
    let q = query(
      candidatesCollection, 
      where("userId", "==", userId), 
      orderBy("timestamp"), 
      limit(pageSize));

    if (lastVisibleDoc) {
      q = query(
        candidatesCollection,
        where("userId", "==", userId), 
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId
    const countQuery = query(candidatesCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    // Get the last visible document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    // Map the data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { data, lastVisible, total: totalDocuments };
  } catch (error) {
    console.error("Error fetching paginated candidates:", error);
    throw new Error("Unable to fetch paginated candidates.");
  }
};

export const searchCandidates = async (searchQuery, userId) => {
  const candidatesCollection = collection(db, "candidates");
  const q = query(candidatesCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter in memory
  const filteredData = data.filter((candidate) => {
    return (
      candidate.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.contact.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return filteredData;
};

export const deleteConversation = async (conversationId) => {
  try {
    const conversationRef = doc(db, "linkedinConversations", conversationId);
    await deleteDoc(conversationRef);
    console.log("Conversation deleted:", conversationId);
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

export const searchContacts = async (searchQuery, userId) => {
  const contactsCollection = collection(db, "contacts");
  const q = query(contactsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter in memory
  const filteredData = data.filter((contact) => {
    return (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return filteredData;
};

export const fetchPaginatedContacts = async (pageSize, lastVisibleDoc, userId) => {
  try {
    const contactsCollection = collection(db, "contacts");

    // Query for total count first
    const countQuery = query(contactsCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    // Query for paginated data
    let q = query(
      contactsCollection, 
      where("userId", "==", userId), 
      orderBy("timestamp", "desc"), // Changed to desc for newest first
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        contactsCollection,
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    // Map the data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { 
      data, 
      lastVisible, 
      total: totalDocuments 
    };
  } catch (error) {
    console.error("Error fetching paginated contacts:", error);
    throw new Error("Unable to fetch paginated contacts.");
  }
};

export const deleteContact = async (contactId) => {
  try {
    const conversationRef = doc(db, "contacts", contactId);
    await deleteDoc(conversationRef);
    console.log("Contact deleted:", contactId);
  } catch (error) {
    console.error("Error deleting contact:", error);
    throw error;
  }
};

export const searchJobs = async (searchQuery, userId) => {
  const jobsCollection = collection(db, "jobs");
  const q = query(jobsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter in memory
  const filteredData = data.filter((job) => {
    return (
      job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return filteredData;
};

export const fetchPaginatedJobs = async (pageSize, lastVisibleDoc = null, userId) => {
  try {
    const jobsCollection = collection(db, "jobs");

    // Query for paginated data
    let q = query(
      jobsCollection, 
      where("userId", "==", userId), 
      orderBy("timestamp"), 
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        jobsCollection,
        where("userId", "==", userId),
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId
    const countQuery = query(jobsCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    // Get the last visible document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    // Map the data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { data, lastVisible, total: totalDocuments };
  } catch (error) {
    console.error("Error fetching paginated jobs:", error);
    throw new Error("Unable to fetch paginated jobs.");
  }
};

export const searchGeneralQuestions = async (searchQuery, userId) => {
  const questionsCollection = collection(db, "questionnaires");
  const q = query(questionsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter in memory
  const filteredData = data.filter((question) => {
    return (
      question.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.version.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return filteredData;
};

export const fetchPaginatedGeneralQuestions = async (pageSize, lastVisibleDoc = null, userId) => {
  try {
    const questionsCollection = collection(db, "questionnaires");

    // Query for paginated data
    let q = query(
      questionsCollection, 
      where("userId", "==", userId), 
      orderBy("company_name", "desc"),
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        questionsCollection,
        where("userId", "==", userId),
        orderBy("company_name", "desc"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId
    const countQuery = query(questionsCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    // Get the last visible document for pagination
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    // Map the data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { data, lastVisible, total: totalDocuments };
  } catch (error) {
    console.error("Error fetching paginated general questions:", error);
    throw new Error("Unable to fetch paginated general questions.");
  }
};

export const getUser = async (email) => {
  if (!email) {
    throw new Error("Email is required to fetch user.");
  }

  // Create a query to filter users by email
  const usersCollection = collection(db, "users");
  const userQuery = query(usersCollection, where("email", "==", email));

  try {
    // Execute the query and fetch the documents
    const querySnapshot = await getDocs(userQuery);

    if (querySnapshot.empty) {
      throw new Error("No user found with the given email.");
    }

    // Assuming there's only one user per email (unique email constraint)
    const user = querySnapshot.docs[0].data();

    return user; // Return the user data
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user details.");
  }
};

export const fetchCandidateQuestionnaire = async (candidateId) => {
  try {
    // Reference the candidate document
    const candidateDocRef = doc(db, "candidates", candidateId);

    // Fetch the document snapshot
    const candidateDocSnapshot = await getDoc(candidateDocRef);

    // Check if the document exists
    if (!candidateDocSnapshot.exists()) {
      throw new Error("Candidate document does not exist.");
    }

    // Extract the data from the document
    const candidateData = candidateDocSnapshot.data();

    // Assuming the questionnaire data is stored directly in the candidate document
    const data = candidateData.questionnaireData;
    const name = candidateData.contact.name;
    const jobTitle = candidateData.jobTitle;

    // Return the questionnaire data
    return {data, name, jobTitle};
  } catch (error) {
    console.error("Error fetching candidate data:", error);
    throw new Error("Unable to fetch candidate data.");
  }
};

export const fetchJobQuestionnaire = async (jobId) => {
  try {
    // Reference the job document
    const jobDocRef = doc(db, "jobs", jobId);

    // Fetch the document snapshot
    const jobDocSnapshot = await getDoc(jobDocRef);

    // Check if the document exists
    if (!jobDocSnapshot.exists()) {
      throw new Error("Job document does not exist.");
    }

    // Extract the data from the document
    const jobData = jobDocSnapshot.data();

    // Assuming the questionnaire data is stored directly in the job document
    const data = jobData.questionnaireData;
    const jobTitle = jobData.job_title;

    // Return the questionnaire data
    return {data, jobTitle};
  } catch (error) {
    console.error("Error fetching job data:", error);
    throw new Error("Unable to fetch job data.");
  }
};

// Helper function to filter jobs based on search query
const filterJobs = (jobs, searchQuery) => {
  return jobs.filter((job) => {
    return (
      job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
};

// Helper function to extract questionnaires from jobs
const extractQuestionnaires = (jobs) => {
  return jobs.map((job) => ({
    id: job.id,
    job_title: job.job_title,
    description: job.description,
    company_name: job.company_name,
    language: job.language,
    data: job.questionnaireData,
    timestamp: job.timestamp,
  }));
};

// Main function to search questionnaires
export const searchQuestionnaires = async (searchQuery, userId) => {
  try {
    const jobsCollection = collection(db, "jobs");
    const q = query(jobsCollection, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const filteredData = filterJobs(data, searchQuery);
    const questionnaires = extractQuestionnaires(filteredData);

    return questionnaires;
  } catch (error) {
    console.error("Error searching questionnaires:", error);
    throw new Error("Unable to search questionnaires.");
  }
};

// Main function to fetch paginated questionnaires
export const fetchPaginatedQuestionnaires = async (pageSize, lastVisibleDoc = null, userId) => {
  try {
    const jobsCollection = collection(db, "jobs");

    // Query for jobs that have questionnaireData
    let q = query(
      jobsCollection,
      where("userId", "==", userId),
      // where("questionnaireData", "!=", null), // Filter jobs with questionnaireData
      orderBy("timestamp"),
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        jobsCollection,
        where("userId", "==", userId),
        // where("questionnaireData", "!=", null), // Filter jobs with questionnaireData
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId and have questionnaireData
    const countQuery = query(jobsCollection, where("userId", "==", userId));
    const totalSnapshot = await getCountFromServer(countQuery);
    const totalDocuments = totalSnapshot.data().count;

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const data = extractQuestionnaires(jobs);

    return { data, lastVisible, total: totalDocuments };
  } catch (error) {
    console.error("Error fetching paginated questionnaires:", error);
    throw new Error("Unable to fetch paginated questionnaires.");
  }
};

export const deleteQuestionnaire = async (jobId) => {
  try {
    const jobDocRef = doc(db, "jobs", jobId);

    await updateDoc(jobDocRef, {
      questionnaireData: deleteField(),
    });

    console.log("Questionnaire data deleted successfully:", jobId);
  } catch (error) {
    console.error("Error deleting questionnaire data:", error);
    throw new Error("Unable to delete questionnaire data.");
  }
};

export const getSkillCategories = async (jobId) => {
  try {
    // Reference the job document
    const jobDocRef = doc(db, "jobs", jobId);

    // Fetch the document snapshot
    const jobDocSnapshot = await getDoc(jobDocRef);

    // Check if the document exists
    if (!jobDocSnapshot.exists()) {
      throw new Error("Job document does not exist.");
    }

    // Extract the data from the document
    const jobData = jobDocSnapshot.data();

    // Initialize a Set to store unique skill categories
    const skillCategories = new Set();

    // Check if the job has questionnaireData
    if (jobData.questionnaireData && jobData.questionnaireData.questions) {
      // Iterate through each question in the questionnaireData
      jobData.questionnaireData.questions.forEach((question) => {
        if (question.skillCategory) {
          // Add the skillCategory to the Set
          skillCategories.add(question.skillCategory);
        }
      });
    }

    // Convert the Set to an array and return it
    return Array.from(skillCategories);
  } catch (error) {
    console.error("Error fetching skill categories:", error);
    throw new Error("Unable to fetch skill categories.");
  }
};