const API_KEY = "18cdb72e5f20a9335b149fb6c6acf017";
async function getWeather(city) {
    const url =
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("City not found");
    }
    const data = await response.json();
    return {
        city: data.name,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed
    };
}
async function getForecast(city) {
    const url =
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Forecast not found");
    }
    const data = await response.json();
    const forecastList = document.getElementById("forecastList");
    forecastList.innerHTML = "";
    const dates = [];
    data.list.forEach(function (item) {
        const date = item.dt_txt.split(" ")[0];
        if (!dates.includes(date) && dates.length < 5) {
            dates.push(date);
            const card = document.createElement("div");
            card.className = "forecast-card";
            const heading = document.createElement("h4");
            heading.textContent = date;
            const temperature = document.createElement("p");
            temperature.textContent = `${Math.round(item.main.temp)}°C`;
            const description = document.createElement("p");
            description.textContent = item.weather[0].description;
            card.append(heading, temperature, description);
            forecastList.appendChild(card);
        }
    });
}


function showSkeletons() {
    document.getElementById("weatherSkeleton").style.display = "block";
    document.getElementById("forecastSkeleton").style.display = "block";
}
function hideSkeletons() {
    document.getElementById("weatherSkeleton").style.display = "none";
    document.getElementById("forecastSkeleton").style.display = "none";
}
async function searchWeather(city) {
    if (typeof city !== "string" || !city.trim()) {
        city = document.getElementById("cityInput").value.trim();
    } else {
        city = city.trim();
    }
    const weatherCard = document.getElementById("weatherCard");
    const errorMsg = document.getElementById("errorMsg");
    const loading = document.getElementById("loading");
    const forecastList = document.getElementById("forecastList");
    errorMsg.style.display = "none";
    if (city === "") {
        errorMsg.textContent = "Please enter a city name.";
        errorMsg.style.display = "block";
        return;
    }
    loading.style.display = "block";
    weatherCard.style.display = "none";
    showSkeletons();
    try {
        const weather = await getWeather(city);
        weatherCard.innerHTML = `
            <h2>${weather.city}</h2>
            <h3>${weather.temp}°C</h3>
            <p>Feels like: ${weather.feelsLike}°C</p>
            <p>Condition: ${weather.description}</p>
            <p>Humidity: ${weather.humidity}%</p>
            <p>Wind Speed: ${weather.windSpeed} m/s</p>
            <button id="favoriteBtn">Add to Favorites</button>
        `;
        weatherCard.style.display = "block";
        document.getElementById("weatherSkeleton").style.display = "none";
        document.getElementById("favoriteBtn").addEventListener("click", function () {
            addFavorite(weather.city);
        });
        try {
            await getForecast(weather.city);
        } catch (error) {
            console.error("Forecast error:", error.message);
            forecastList.innerHTML =
                "<p>Unable to load the forecast. Please try again.</p>";
        }
    } catch (error) {
        errorMsg.textContent =
            "Unable to find weather. Check the city name or API key.";
        errorMsg.style.display = "block";
        console.error("Weather error:", error.message);
    } finally {
        loading.style.display = "none";
        hideSkeletons();
    }
}
function addFavorite(city) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.includes(city)) {
        return;
    }
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    loadFavorites();
}
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const favoritesList = document.getElementById("favoritesList");
    favoritesList.innerHTML = "";
    favorites.forEach(function (city) {
        const item = document.createElement("div");
        item.className = "favorite-item";
        const searchButton = document.createElement("button");
        searchButton.textContent = city;
        searchButton.addEventListener("click", function () {
            clearTimeout(timer);
            searchWeather(city);
        });
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", function () {
            removeFavorite(city);
        });
        item.append(searchButton, removeButton);
        favoritesList.appendChild(item);
    });
}
function removeFavorite(city) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(function (item) {
        return item !== city;
    });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    loadFavorites();
}
let timer;
function debounceSearch() {
    clearTimeout(timer);
    timer = setTimeout(function () {
        const city = document.getElementById("cityInput").value.trim();
        if (city !== "") {
            searchWeather(city);
        }
    }, 500);
}
let suggestionTimer;
let suggestionRequestId = 0;
function debounceSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(function () {
        loadSuggestions();
    }, 300);
}

async function loadSuggestions() {
    const cityInput = document.getElementById("cityInput");
    const suggestionsList = document.getElementById("suggestionsList");
    const query = cityInput.value.trim();
    const requestId = ++suggestionRequestId;
    suggestionsList.innerHTML = "";
    if (query.length < 2) {
        suggestionsList.style.display = "none";
        return;
    }
    try {
        const url =
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Unable to load suggestions");
        }
        const cities = await response.json();
        if (
            requestId !== suggestionRequestId ||
            cityInput.value.trim() !== query
        ){
            return;
        }
        suggestionsList.innerHTML = "";
        if (cities.length === 0) {
            const message = document.createElement("div");
            message.className = "suggestion-message";
            message.textContent = "No cities found";
            suggestionsList.appendChild(message);
            suggestionsList.style.display = "block";
            return;
        }
        cities.forEach(function (city) {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.textContent = city.state
                ? `${city.name}, ${city.state}, ${city.country}`
                : `${city.name}, ${city.country}`;
            item.setAttribute("role", "option");
            item.tabIndex = 0;
            function selectCity() {
                clearTimeout(timer);
                clearTimeout(suggestionTimer);
                cityInput.value = city.name;
                suggestionsList.style.display = "none";
                searchWeather(city.name);
            }
            item.addEventListener("click", selectCity);
            item.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    selectCity();
                }
            });
            suggestionsList.appendChild(item);
        });
        suggestionsList.style.display = "block";
    } catch (error) {
        console.error("Suggestion error:", error.message);
        if (requestId === suggestionRequestId) {
            suggestionsList.style.display = "none";
        }
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const cityInput = document.getElementById("cityInput");
    const suggestionsList = document.getElementById("suggestionsList");
    document.getElementById("searchBtn").addEventListener("click", function () {
        clearTimeout(timer);
        clearTimeout(suggestionTimer);
        suggestionsList.style.display = "none";
        searchWeather();
    });
    cityInput.addEventListener("input", function () {
        debounceSearch();
        debounceSuggestions();
    });
    cityInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            clearTimeout(timer);
            clearTimeout(suggestionTimer);
            suggestionsList.style.display = "none";
            searchWeather();
        }
        if (event.key === "Escape") {
            suggestionsList.style.display = "none";
        }
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".search-input-wrapper")) {
            suggestionsList.style.display = "none";
        }
    });
    document.getElementById("themeBtn").addEventListener("click", function () {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            this.textContent = "Light";
        } else {
            this.textContent = "Dark";
        }
    });
    loadFavorites();
});
