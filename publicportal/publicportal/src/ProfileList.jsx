import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ProfileList() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    // Hämta listan av profiler från backend
    fetch('/api/profiles')
      .then(response => response.json())
      .then(data => setProfiles(data))
      .catch(err => console.error('Error fetching profiles:', err));
  }, []);

  const cardStyle = {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0'
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      <h2>Profiler</h2>
      {profiles.map(profile => (
        <Link 
          key={profile.id} 
          to={`/profiles/${profile.id}`} 
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div style={cardStyle}>
            <h3>{profile.name}</h3>
            <p>{profile.shortDescription}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default ProfileList;
