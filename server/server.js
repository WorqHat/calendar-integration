const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000'
);

// Function to extract event details from a string
async function extractDetails(inputString) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
    };

    const data = {
        question: inputString,
        model: "aicon-v4-nano-160824",
        randomness: 0.5,
        stream_data: false,
        training_data: "Extract event details such as title, summary, start date time, and end date time .Start and end times must either both be date or both be dateTime format. return in a format of only JSON with the keys title,summary,startDateTime,endDateTime ",
        response_type: "JSON",
    };

    try {
        const response = await axios.post("https://api.worqhat.com/api/ai/content/v4", data, { headers });
        console.log(JSON.stringify(response.data)); //This will show you the response from the API call.
        const eventDetails = JSON.parse(response.data.content); //Parse the JSON string in the content field.
        return eventDetails; // Return the parsed event details.
    } catch (error) {
        console.error('Error extracting details:', error);
        throw new Error('Failed to extract details');
    }
}

app.get('/auth/google', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
    res.send({ url });
});
app.post('/auth/refresh-token', async (req, res) => {
    const { refresh_token } = req.body;
    try {
        oauth2Client.setCredentials({ refresh_token });
        const { credentials } = await oauth2Client.refreshAccessToken();
        res.send({ tokens: credentials });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(401).send('Failed to refresh token');
    }
});
app.post('/auth/google/callback', async (req, res) => {
    const { code } = req.body;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        res.send({ tokens });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving access token');
    }
});

app.post('/create-event', async (req, res) => {
    const { tokens, inputString } = req.body;
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
        const eventDetails = await extractDetails(inputString);

        // Use Intl.DateTimeFormat to add timezone information
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'IST' }; //Specify your desired timezone here
        const startDateTime = new Date(eventDetails.startDateTime);
        const endDateTime = new Date(eventDetails.endDateTime);
        const formattedStart = startDateTime.toISOString();
        const formattedEnd = endDateTime.toISOString();


        const event = {
            summary: eventDetails.title,
            description: eventDetails.summary,
            start: {
                dateTime: formattedStart,
            },
            end: {
                dateTime: formattedEnd,
            },
        };
        console.log(JSON.stringify(event));
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).send('Error creating event: ' + error.message);
    }
});
app.post('/events', async (req, res) => {
    const { tokens } = req.body;
    console.log("entered backend")
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: firstDayOfMonth,
            timeMax: lastDayOfMonth,
            singleEvents: true,
            orderBy: 'startTime',
        });
        console.log(JSON.stringify(response.data.items));
        res.send(response.data.items);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Failed to fetch events');
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
