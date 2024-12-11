import { collection, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

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

export const getConversationCount = async () => {
  const conversationsCollection = collection(db, "linkedinConversations");
  const snapshot = await getDocs(conversationsCollection);
  return snapshot.size; // Return only the count of documents
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