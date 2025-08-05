// routes/calendar.js
const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

router.post('/create', async (req, res) => {
  const { accessToken, summary, startTime, endTime, attendees } = req.body;

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: summary || 'Reunión creada desde web / bot whatsapp',
      description: 'Creada desde web / bot whatsapp',
      start: {
        dateTime: startTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: attendees || [],
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Date.now(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    res.status(200).json({ meetLink: response.data.hangoutLink, event: response.data });
  } catch (err) {
    console.error('❌ Error creando evento:', err);
    res.status(500).json({ message: 'No se pudo crear el evento', error: err.message });
  }
});

module.exports = router;
