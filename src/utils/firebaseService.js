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

export const searchContacts = async (searchQuery, userId) => {
  const contactsCollection = collection(db, "contacts");

  // Search query: filter by `connection` field (or adjust as needed)
  const q = query(
    contactsCollection, 
    where("userId", "==", userId),
    where("name", ">=", searchQuery), 
    where("name", "<=", searchQuery + "\uf8ff")
  );

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return data;
};

export const fetchPaginatedContacts = async (pageSize, lastVisibleDoc = null, userId) => {
  try {
    const contactsCollection = collection(db, "contacts");

    // Query for paginated data
    let q = query(contactsCollection, where("userId", "==", userId), orderBy("timestamp"), limit(pageSize));

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

    // Fetch total count of documents in the collection
    const totalSnapshot = await getCountFromServer(contactsCollection);
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