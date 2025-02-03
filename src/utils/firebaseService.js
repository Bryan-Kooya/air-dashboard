import { collection, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const getConversationCount = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch conversation count.");
  }

  // Create a query to filter conversations by the current userId
  const conversationsCollection = collection(db, "linkedinConversations");
  const userQuery = query(conversationsCollection, where("userId", "==", userId));

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

  // Search query: filter by `connection` field (or adjust as needed)
  const q = query(
    conversationsCollection, 
    where("userId", "==", userId),
    where("connection", ">=", searchQuery), 
    where("connection", "<=", searchQuery + "\uf8ff")
  );

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return data;
};

export const fetchPaginatedCandidates = async (pageSize, lastVisibleDoc = null, userId) => {
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

export const fetchPaginatedContacts = async (pageSize, lastVisibleDoc = null, userId) => {
  try {
    const contactsCollection = collection(db, "contacts");

    // Query for paginated data
    let q = query(
      contactsCollection, 
      where("userId", "==", userId), 
      orderBy("timestamp"), 
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        contactsCollection,
        where("userId", "==", userId),
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Query for counting total documents that match the userId
    const countQuery = query(contactsCollection, where("userId", "==", userId));
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
    console.error("Error fetching paginated contacts:", error);
    throw new Error("Unable to fetch paginated contacts.");
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