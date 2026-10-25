const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO weather interpretation codes used by Open-Meteo: [description, emoji]
const WMO = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Depositing rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'],
  57: ['Heavy freezing drizzle', '🌧️'],
  61: ['Light rain', '🌦️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'],
  67: ['Heavy freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '❄️'],
  80: ['Light rain showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent rain showers', '⛈️'],
  85: ['Snow showers', '🌨️'],
  86: ['Heavy snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm with hail', '⛈️'],
  99: ['Thunderstorm with heavy hail', '⛈️'],
};

const UNITS = {
  metric: { temp: 'celsius', wind: 'kmh', precip: 'mm', tempSymbol: '°C', windLabel: 'km/h', precipLabel: 'mm' },
  imperial: { temp: 'fahrenheit', wind: 'mph', precip: 'inch', tempSymbol: '°F', windLabel: 'mph', precipLabel: 'in' },
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const els = {
  form: document.getElementById('search-form'),
  city: document.getElementById('city'),
  locate: document.getElementById('locate'),
  status: document.getElementById('status'),
  current: document.getElementById('current'),
  daily: document.getElementById('daily'),
  dailyList: document.getElementById('daily-list'),
  place: document.getElementById('place'),
  updated: document.getElementById('updated'),
  icon: document.getElementById('icon'),
  temp: document.getElementById('temp'),
  condition: document.getElementById('condition'),
  feels: document.getElementById('feels'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  precip: document.getElementById('precip'),
  unitButtons: document.querySelectorAll('[data-unit]'),
};

const state = {
  unit: loadUnit(),
  place: null,
  controller: null,
};

function loadUnit() {
  try {
    return localStorage.getItem('weather-unit') === 'imperial' ? 'imperial' : 'metric';
  } catch {
    // Storage can be blocked (private mode, disabled cookies); fall back to the default.
    return 'metric';
  }
}

function saveUnit(unit) {
  try {
    localStorage.setItem('weather-unit', unit);
  } catch {
    // Not persisting the preference is harmless.
  }
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle('error', isError);
}

function errorMessage(err) {
  if (err instanceof TypeError) return 'Network error. Check your connection and try again.';
  return err.message || 'Something went wrong.';
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Weather service returned an error (${res.status}).`);
  return res.json();
}

async function searchCity(query) {
  const url = new URL(GEOCODE_URL);
  url.search = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
  const data = await getJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`No place found for "${query}".`);
  }
  const r = data.results[0];
  return {
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  };
}

function forecastUrl(place) {
  const units = UNITS[state.unit];
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: units.temp,
    wind_speed_unit: units.wind,
    precipitation_unit: units.precip,
  });
  return url;
}

async function loadWeather(place) {
  state.place = place;
  if (state.controller) state.controller.abort();
  const controller = new AbortController();
  state.controller = controller;

  setStatus('Loading weather…');
  try {
    const data = await getJson(forecastUrl(place), controller.signal);
    render(place, data);
    setStatus('');
  } catch (err) {
    if (err.name === 'AbortError') return;
    els.current.hidden = true;
    els.daily.hidden = true;
    setStatus(errorMessage(err), true);
  }
}

function describe(code) {
  return WMO[code] || ['Unknown conditions', '🌡️'];
}

function compass(degrees) {
  return COMPASS[Math.round(degrees / 45) % 8];
}

function render(place, data) {
  const units = UNITS[state.unit];
  const c = data.current;
  const [condition, icon] = describe(c.weather_code);

  els.place.textContent = place.name;
  els.updated.textContent = `Updated ${c.time.slice(11, 16)} ${data.timezone_abbreviation || ''}`.trim();
  els.icon.textContent = icon;
  els.temp.textContent = `${Math.round(c.temperature_2m)}${units.tempSymbol}`;
  els.condition.textContent = condition;
  els.feels.textContent = `${Math.round(c.apparent_temperature)}${units.tempSymbol}`;
  els.humidity.textContent = `${c.relative_humidity_2m}%`;
  els.wind.textContent = `${Math.round(c.wind_speed_10m)} ${units.windLabel} ${compass(c.wind_direction_10m)}`;
  els.precip.textContent = `${c.precipitation} ${units.precipLabel}`;
  els.current.hidden = false;

  renderDaily(data.daily, units);
}

function renderDaily(daily, units) {
  els.dailyList.replaceChildren();
  daily.time.forEach((date, i) => {
    const [condition, icon] = describe(daily.weather_code[i]);
    const day = i === 0
      ? 'Today'
      : new Date(`${date}T00:00`).toLocaleDateString([], { weekday: 'short' });

    const row = document.createElement('li');
    row.append(
      element('span', 'day', day),
      element('span', 'day-icon', icon, condition),
      element('span', 'chance', `💧 ${daily.precipitation_probability_max[i] ?? 0}%`),
      rangeElement(daily.temperature_2m_max[i], daily.temperature_2m_min[i], units.tempSymbol),
    );
    els.dailyList.append(row);
  });
  els.daily.hidden = false;
}

function element(tag, className, text, title) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  if (title) node.title = title;
  return node;
}

function rangeElement(high, low, symbol) {
  const node = document.createElement('span');
  node.className = 'range';
  node.append(
    element('span', 'high', `${Math.round(high)}${symbol}`),
    ' / ',
    element('span', 'low', `${Math.round(low)}${symbol}`),
  );
  return node;
}

function updateUnitButtons() {
  els.unitButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.unit === state.unit));
  });
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  // Open-Meteo matches on the place name only, so "London, UK" should search "London".
  const query = els.city.value.split(',')[0].trim();
  if (!query) return;

  setStatus('Searching…');
  try {
    const place = await searchCity(query);
    await loadWeather(place);
  } catch (err) {
    setStatus(errorMessage(err), true);
  }
});

els.locate.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser.', true);
    return;
  }
  setStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather({
      name: 'Your location',
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
    }),
    () => setStatus('Location access was denied or unavailable.', true),
    { timeout: 10000 },
  );
});

els.unitButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.unit === state.unit) return;
    state.unit = btn.dataset.unit;
    saveUnit(state.unit);
    updateUnitButtons();
    if (state.place) loadWeather(state.place);
  });
});

updateUnitButtons();
