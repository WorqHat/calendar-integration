import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [event, setEvent] = useState({
    summary: '',
    start: { dateTime: '' },
    end: { dateTime: '' },
  });

  // Function to handle user login and redirect to Google's OAuth screen
  const handleLogin = async () => {
    const response = await axios.get('http://localhost:5000/auth/google');
    window.location.href = response.data.url;
  };

  // Function to handle callback and exchange code for tokens
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

  // Function to handle event creation
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/create-event', { tokens, event });
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event', error);
      alert('Failed to create event. Please try again.');
    }
  };

  // Automatically call handleCallback when the component mounts
  useEffect(() => {
    handleCallback();
  }, []);

  return (
    <div className="App">
      {!isAuthenticated ? (
        <button onClick={handleLogin}>Login with Google</button>
      ) : (
        <form onSubmit={handleEventSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={event.summary}
            onChange={(e) => setEvent({ ...event, summary: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="Start Time"
            onChange={(e) =>
              setEvent({
                ...event,
                start: { dateTime: new Date(e.target.value).toISOString() },
              })
            }
          />
          <input
            type="datetime-local"
            placeholder="End Time"
            onChange={(e) =>
              setEvent({
                ...event,
                end: { dateTime: new Date(e.target.value).toISOString() },
              })
            }
          />
          <button type="submit">Create Event</button>
        </form>
      )}
    </div>
  );
}

export default App;
