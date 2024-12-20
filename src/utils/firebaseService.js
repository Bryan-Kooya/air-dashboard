import { collection, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const getConversationCount = async () => {
  const conversationsCollection = collection(db, "linkedinConversations");
  const snapshot = await getDocs(conversationsCollection);
  return snapshot.size; // Return only the count of documents
};

export const fetchPaginatedConversations = async (pageSize, lastVisibleDoc = null) => {
  const conversationsCollection = collection(db, "linkedinConversations");

  // Query for paginated data
  let q = query(conversationsCollection, orderBy("timestamp"), limit(pageSize));

  if (lastVisibleDoc) {
    q = query(conversationsCollection, orderBy("timestamp"), startAfter(lastVisibleDoc), limit(pageSize));
  }

  const snapshot = await getDocs(q);

  // Fetch total count of documents in the collection
  const totalSnapshot = await getCountFromServer(conversationsCollection);
  const totalDocuments = totalSnapshot.data().count;

  // Get the last visible document for pagination
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { data, lastVisible, total: totalDocuments };
};

export const searchConversations = async (searchQuery) => {
  const conversationsCollection = collection(db, "linkedinConversations");

  // Search query: filter by `connection` field (or adjust as needed)
  const q = query(conversationsCollection, where("connection", ">=", searchQuery), where("connection", "<=", searchQuery + "\uf8ff"));

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return data;
};

export const fetchPaginatedCandidates = async (pageSize, lastVisibleDoc = null) => {
  try {
    const candidatesCollection = collection(db, "candidates");

    // Query for paginated data
    let q = query(candidatesCollection, orderBy("timestamp"), limit(pageSize));

    if (lastVisibleDoc) {
      q = query(
        candidatesCollection,
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Fetch total count of documents in the collection
    const totalSnapshot = await getCountFromServer(candidatesCollection);
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

export const searchCandidates = async (searchQuery) => {
  const candidatesCollection = collection(db, "candidates");

  // Transform the search query to lowercase for case-insensitive search
  const lowercasedQuery = searchQuery.toLowerCase();

  // Query to search in `searchKeywords` field
  const q = query(
    candidatesCollection,
    where("searchKeywords", "array-contains", lowercasedQuery)
  );

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return data;
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

export const searchResumes = async (searchQuery) => {
  const resumesCollection = collection(db, "applicants");

  // Search query: filter by `connection` field (or adjust as needed)
  const q = query(resumesCollection, where("name", ">=", searchQuery), where("name", "<=", searchQuery + "\uf8ff"));

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return data;
};

export const fetchPaginatedResumes = async (pageSize, lastVisibleDoc = null) => {
  try {
    const resumesCollection = collection(db, "applicants");

    // Query for paginated data
    let q = query(resumesCollection, orderBy("timestamp"), limit(pageSize));

    if (lastVisibleDoc) {
      q = query(
        resumesCollection,
        orderBy("timestamp"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    // Fetch paginated data
    const snapshot = await getDocs(q);

    // Fetch total count of documents in the collection
    const totalSnapshot = await getCountFromServer(resumesCollection);
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
    console.error("Error fetching paginated resumes:", error);
    throw new Error("Unable to fetch paginated resumes.");
  }
};