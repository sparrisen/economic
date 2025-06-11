// frontend/src/App.jsx (React)
import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [profileFiles, setProfileFiles] = useState([]);

  // Fetch profiles on component mount
  useEffect(() => {
    axios.get("http://localhost:5000/api/profiles")
      .then(res => {
        setProfiles(res.data);
      })
      .catch(err => console.error("Failed to fetch profiles:", err));
  }, []);

  // Handle creating a new profile
  const createProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      const res = await axios.post("http://localhost:5000/api/profiles", { name: newProfileName });
      const profile = res.data;
      setProfiles(prev => [...prev, profile]);
      setSelectedProfile(profile);
      setProfileFiles([]);  // new profile has no files yet
      setNewProfileName("");
    } catch (err) {
      console.error("Create profile failed:", err.response?.data || err);
      // Optionally handle name conflict or error feedback
    }
  };

  const deleteFile = async (index) => {
    if (!window.confirm("Är du säker på att du vill ta bort detta dokument?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/profiles/${selectedProfile.id}/files/${index}`);
      const res = await axios.get(`http://localhost:5000/api/profiles/${selectedProfile.id}`);
      setProfileFiles(res.data.files);
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };


  // Handle selecting a profile from the list
  const selectProfile = async (profile) => {
    setSelectedProfile(profile);
    try {
      const res = await axios.get(`http://localhost:5000/api/profiles/${profile.id}`);
      setProfileFiles(res.data.files || []);
    } catch (err) {
      console.error("Failed to load profile data:", err);
      setProfileFiles([]);
    }
  };

  const updateFile = async (index, updateData) => {
  try {
    await axios.put(
      `http://localhost:5000/api/profiles/${selectedProfile.id}/files/${index}`,
      updateData
    );
    const res = await axios.get(
      `http://localhost:5000/api/profiles/${selectedProfile.id}`
    );
    setProfileFiles(res.data.files);
  } catch (err) {
    console.error("Failed to update file:", err);
  }
};


  // Handle file upload (drag & drop or file input selection)
  const handleFilesUpload = async (fileList) => {
    if (!selectedProfile) {
      alert("Please select a profile first.");
      return;
    }
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;
    const formData = new FormData();
    filesArray.forEach(file => {
      formData.append("files", file);
    });
    try {
      const res = await axios.post(
        `http://localhost:5000/api/profiles/${selectedProfile.id}/files`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      // Update the file list with response data
      setProfileFiles(res.data.files);
    } catch (err) {
      console.error("File upload failed:", err.response?.data || err);
    }
  };

  // Drag-and-drop event handlers
  const onDrop = (e) => {
    e.preventDefault();
    handleFilesUpload(e.dataTransfer.files);
  };
  const onDragOver = (e) => {
    e.preventDefault();
  };

  // Trigger document generation (opens the compiled PDF in a new tab)
  const generateDocument = () => {
    if (!selectedProfile) return;
    window.open(`http://localhost:5000/api/profiles/${selectedProfile.id}/compile`, "_blank");
  };

  return (
    <div style={{ display: "flex", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {/* Profile list and creation form */}
      <div style={{ width: "250px", marginRight: "40px" }}>
        <h2>Profiler</h2>
        <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
          {profiles.map((p) => (
            <li 
              key={p.id} 
              onClick={() => selectProfile(p)} 
              style={{
                cursor: "pointer", 
                margin: "5px 0", 
                fontWeight: selectedProfile?.id === p.id ? "bold" : "normal"
              }}>
              {p.name}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: "20px" }}>
          <input 
            type="text" 
            placeholder="Nytt profilnamn" 
            value={newProfileName} 
            onChange={(e) => setNewProfileName(e.target.value)} 
            style={{ width: "70%" }} 
          />
          <button onClick={createProfile} style={{ marginLeft: "5px" }}>Skapa</button>
        </div>
      </div>

      {/* Selected profile details and file upload section */}
      <div style={{ flex: 1 }}>
        {selectedProfile ? (
          <div>
            <h2>{selectedProfile.name}</h2>
            {/* File upload drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById("fileInput").click()}
              style={{
                border: "2px dashed #aaa",
                padding: "30px",
                textAlign: "center",
                marginBottom: "15px",
                cursor: "pointer",
              }}
            >
              Släpp filer här eller klicka för att välja
              <input
                id="fileInput"
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFilesUpload(e.target.files)}
              />
            </div>
            {profileFiles.length > 0 ? (
              <ul>
                {profileFiles.map((file, idx) => (
                  <div key={idx} style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                    <strong>{file.title}</strong> – {file.type}<br />
                    
                    <label>
                      Datum:
                      <input
                        type="date"
                        defaultValue={file.date.split('T')[0]}
                        onBlur={(e) =>
                          updateFile(idx, { date: e.target.value })
                        }
                      />
                    </label>
                    <br />
                    
                    <label>
                      Tags:
                      <input
                        type="text"
                        defaultValue={file.tags ? file.tags.join(', ') : ''}
                        onBlur={(e) => {
                          const tagArray = e.target.value
                            .split(',')
                            .map(t => t.trim())
                            .filter(Boolean);
                          updateFile(idx, { tags: tagArray });
                        }}
                      />
                    </label>
                    <button
                      style={{ marginTop: '8px', color: 'red' }}
                      onClick={() => deleteFile(idx)}
                    >
                      🗑 Ta bort
                    </button>

                  </div>
                ))}

              </ul>
            ) : (
              <p><em>Inga uppladdade filer ännu.</em></p>
            )}
            {/* Generate document button */}
            <button onClick={generateDocument} style={{ marginTop: "15px" }}>
              Generera sammansatt dokument
            </button>
          </div>
        ) : (
          <p>Välj en profil för att se detaljer och ladda upp filer.</p>
        )}
      </div>
    </div>
  );
}

export default App;
