import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ProfileDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [includeAI, setIncludeAI] = useState(false);
  const [format, setFormat] = useState('1');

  useEffect(() => {
    // Hämta profilens data från backend
    fetch(`/api/profiles/${id}`)
      .then(response => response.json())
      .then(data => setProfile(data))
      .catch(err => console.error('Error fetching profile:', err));
  }, [id]);

  const handleDownload = () => {
    const url = `/api/profiles/${id}/generate-document?includeAI=${includeAI ? 'true' : 'false'}&format=${format}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const fileName = profile 
          ? profile.name.replace(/\s+/g, '_') + '_Profile.pdf' 
          : 'profile_document.pdf';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => console.error('Error downloading document:', err));
  };

  if (!profile) {
    return <div style={{ padding: '16px' }}>Laddar...</div>;
  }

  // Dela upp lång beskrivning i stycken
  const paragraphs = profile.longDescription 
    ? profile.longDescription.split('\n\n') 
    : [];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      <p><Link to="/">← Tillbaka till profiler</Link></p>
      <h2>{profile.name}</h2>
      {paragraphs.map((para, idx) => (
        <p key={idx}>{para}</p>
      ))}
      <div style={{ margin: '16px 0' }}>
        <label>
          <input 
            type="checkbox" 
            checked={includeAI} 
            onChange={e => setIncludeAI(e.target.checked)} 
          /> Inkludera AI-kommando
        </label>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <div>Format på AI-svar:</div>
        <label>
          <input 
            type="radio" 
            name="format" 
            value="1" 
            checked={format === '1'} 
            onChange={e => setFormat(e.target.value)} 
          /> Löpande text
        </label><br/>
        <label>
          <input 
            type="radio" 
            name="format" 
            value="2" 
            checked={format === '2'} 
            onChange={e => setFormat(e.target.value)} 
          /> Punktform
        </label><br/>
        <label>
          <input 
            type="radio" 
            name="format" 
            value="3" 
            checked={format === '3'} 
            onChange={e => setFormat(e.target.value)} 
          /> Expertstruktur
        </label>
      </div>
      <button onClick={handleDownload}>Generera dokument</button>
    </div>
  );
}

export default ProfileDetail;
