# Weather App

A small, dependency-free weather app built with plain HTML, CSS, and JavaScript.

## Features

- Search any city worldwide
- Use your current location (browser permission required)
- Current conditions: temperature, feels-like, humidity, wind, precipitation
- 7-day forecast with rain chance and high/low temperatures
- °C / °F toggle, remembered between visits
- Light and dark theme that follows your system setting

## Data source

Weather and geocoding come from [Open-Meteo](https://open-meteo.com/), an open-source
weather API. It is free for non-commercial use and needs no API key:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

## Running it

There is no build step. Serve the folder with any static file server, because browsers
restrict some features (such as geolocation) on `file://` pages.

```bash
cd weather-app
python3 -m http.server 8000
# open http://localhost:8000
```

Or with Node: `npx serve weather-app`.

## Files

| File         | Purpose                                    |
| ------------ | ------------------------------------------ |
| `index.html` | Page structure                             |
| `styles.css` | Layout, theming, responsive styles         |
| `app.js`     | API calls, rendering, and UI behaviour     |

## Customising

- Add or change weather fields by editing the `current` and `daily` parameters in `forecastUrl()` in `app.js`.
- Weather icons and descriptions come from the WMO code table at the top of `app.js`.
