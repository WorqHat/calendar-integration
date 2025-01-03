import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [events, setEvents] = useState([]);
  const [inputString, setInputString] = useState('');

  const backendUrl = 'http://localhost:5000'; // Base URL for backend API

  const handleLogin = async () => {
    const response = await axios.get(`${backendUrl}/auth/google`);
    window.location.href = response.data.url;
  };

  const handleCallback = async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      try {
        const response = await axios.post(`${backendUrl}/auth/google/callback`, { code });
        setTokens(response.data.tokens);
        setIsAuthenticated(true);
        localStorage.setItem('refresh_token', response.data.tokens.refresh_token); // Store refresh token securely
      } catch (error) {
        console.error('Error during token exchange', error);
        alert('Authentication failed. Please try again.');
      }
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.error('No refresh token available');
        alert('Session expired. Please log in again.');
        return;
      }
      const response = await axios.post(`${backendUrl}/auth/refresh-token`, { refresh_token: refreshToken });
      setTokens(response.data.tokens);
      return response.data.tokens.access_token;
    } catch (error) {
      console.error('Error refreshing access token', error);
      alert('Failed to refresh session. Please log in again.');
      setIsAuthenticated(false);
      localStorage.removeItem('refresh_token');
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    const accessToken = tokens?.access_token || (await refreshAccessToken());
    try {
      await axios.post(
        `${backendUrl}/create-event`,
        { inputString },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const fetchEvents = async () => {
    const accessToken = tokens?.access_token || (await refreshAccessToken());
    try {
      const response = await axios.post(
        `${backendUrl}/events`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events', error);
      alert('Failed to fetch events. Please try again.');
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
        <div>
          <form onSubmit={handleEventSubmit}>
            <textarea
              placeholder="Enter the event details (e.g., Meeting with John on 25th Dec 2024 from 10 AM to 11 AM)"
              value={inputString}
              onChange={(e) => setInputString(e.target.value)}
            ></textarea>
            <button type="submit">Create Event</button>
          </form>
          <button onClick={fetchEvents}>Fetch Events</button>
          {events.length > 0 && (
            <table border="1">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.summary}</td>
                    <td>{new Date(event.start.dateTime).toLocaleString()}</td>
                    <td>{new Date(event.end.dateTime).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
