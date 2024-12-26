import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [inputString, setInputString] = useState('');

  const handleLogin = async () => {
    const response = await axios.get('http://localhost:5000/auth/google');
    window.location.href = response.data.url;
  };

  const handleCallback = async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      try {
        const response = await axios.post('http://localhost:5000/auth/google/callback', { code });
        setTokens(response.data.tokens);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error during token exchange', error);
        alert('Authentication failed. Please try again.');
      }
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/create-event', { tokens, inputString });
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event', error);
      alert('Failed to create event. Please try again.');
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  return (
    <div className="App">
      {!isAuthenticated ? (
        <button onClick={handleLogin}>Login with Google</button>
      ) : (
        <form onSubmit={handleEventSubmit}>
          <textarea
            placeholder="Enter the event details (e.g., Meeting with John on 25th Dec 2024 from 10 AM to 11 AM)"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
          ></textarea>
          <button type="submit">Create Event</button>
        </form>
      )}
    </div>
  );
}

export default App;