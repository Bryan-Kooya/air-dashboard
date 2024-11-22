import React, { useEffect, useState } from "react";
import "./DashboardPage.css"
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, storage } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";

const DashboardPage = () => {
  // const [user, setUser] = useState(null);
  // const [data, setData] = useState([]);
  // const [fileUrl, setFileUrl] = useState("");
  const navigate = useNavigate();

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
  //     if (currentUser) {
  //       setUser(currentUser);
  //     } else {
  //       navigate("/");
  //     }
  //   });

  //   return () => unsubscribe();
  // }, [navigate]);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (user) {
  //       const querySnapshot = await getDocs(collection(db, "your-collection-name"));
  //       const docsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  //       setData(docsData);

  //       const storageRef = ref(storage, "path/to/your/file");
  //       getDownloadURL(storageRef).then((url) => setFileUrl(url));
  //     }
  //   };

  //   fetchData();
  // }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>
      {/* <div>
        <h3>Your Data:</h3>
        <ul>
          {data.map((item) => (
            <li key={item.id}>{JSON.stringify(item)}</li>
          ))}
        </ul>
      </div>
      {fileUrl && (
        <div>
          <h3>File from Storage:</h3>
          <img src={fileUrl} alt="Uploaded File" style={{ maxWidth: "300px" }} />
        </div>
      )} */}
    </div>
  );
};

export default DashboardPage;