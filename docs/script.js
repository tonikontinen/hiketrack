"use strict";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const form = document.querySelector(".form");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const workoutsContainer = document.querySelector(".workouts");

class Workout {
  constructor(
    type,
    coords,
    distance,
    duration,
    rating,
    note,
    date = new Date(),
    id = (Date.now() + "").slice(-10)
  ) {
    this.type = type;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.rating = rating;
    this.note = note;
    this.date = date;
    this.id = id;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = {};
  #tempMarker = null;
  #welcomeEl = document.querySelector(".welcome-text");

  constructor() {
    this._getLocalStorage();
    this._getPosition();
    this._createCloseButton();
    this._addNoteField();
    this._toggleWelcome();

    form.addEventListener("submit", this._newWorkout.bind(this));
    workoutsContainer.addEventListener(
      "click",
      this._handleListClick.bind(this)
    );
  }

  _addNoteField() {
    const row = document.createElement("div");
    row.className = "form__row";
    const label = document.createElement("label");
    label.className = "form__label";
    label.textContent = "Note";
    const textarea = document.createElement("textarea");
    textarea.className = "form__input form__input--note";
    textarea.placeholder = "Add a note...";
    row.append(label, textarea);
    const submitBtn = form.querySelector(".form__btn");
    form.insertBefore(row, submitBtn);
  }

  _createCloseButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "form__close";
    btn.textContent = "✖";
    form.style.position = "relative";
    form.prepend(btn);
    btn.addEventListener("click", this._hideForm.bind(this));
  }

  _hideForm() {
    if (this.#tempMarker) {
      this.#tempMarker.remove();
      this.#tempMarker = null;
    }
    inputDistance.value = inputDuration.value = "";
    const ratingInput = document.querySelector(
      'input[name="enjoyment"]:checked'
    );
    if (ratingInput) ratingInput.checked = false;
    const noteInput = document.querySelector(".form__input--note");
    if (noteInput) noteInput.value = "";
    form.classList.add("hidden");
    this._toggleWelcome();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert("Could not get your position")
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map("map").setView([latitude, longitude], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.#map);

    this.#workouts.forEach((w) => this._renderWorkoutMarker(w));
    this.#map.on("click", this._showForm.bind(this));
  }

  _showForm(mapE) {
    this.#welcomeEl.classList.add("hidden");
    this.#mapEvent = mapE;
    const { lat, lng } = mapE.latlng;
    if (this.#tempMarker) this.#tempMarker.remove();
    this.#tempMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(this.#map);
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _newWorkout(e) {
    e.preventDefault();
    this.#welcomeEl.classList.add("hidden");

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const ratingInput = document.querySelector(
      'input[name="enjoyment"]:checked'
    );
    const rating = ratingInput ? +ratingInput.value : 0;
    const note = document.querySelector(".form__input--note").value.trim();

    if (
      !Number.isFinite(distance) ||
      distance <= 0 ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      rating < 1 ||
      rating > 5
    ) {
      return alert("Please enter valid numbers and select a rating.");
    }

    const { lat, lng } = this.#mapEvent.latlng;
    const workout = new Workout(
      type,
      [lat, lng],
      distance,
      duration,
      rating,
      note
    );
    this.#workouts.push(workout);

    if (this.#tempMarker) {
      this.#tempMarker.remove();
      this.#tempMarker = null;
    }

    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    const { coords, type, date, id } = workout;
    const month = months[new Date(date).getMonth()];
    const day = new Date(date).getDate();
    const label =
      type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");

    const marker = L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: "dark-popup",
        })
      )
      .setPopupContent(`${label} on ${month} ${day}`);

    this.#markers[id] = marker;
  }

  _renderWorkout(workout) {
    const { id, type, distance, duration, rating, date, note } = workout;
    const month = months[new Date(date).getMonth()];
    const day = new Date(date).getDate();
    const label =
      type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    const html = `
      <li class="workout workout--${type}" data-id="${id}">
        <h2 class="workout__title">${label} on ${month} ${day}</h2>
        <div class="workout__details"><span class="workout__icon">📏</span><span class="workout__value">${distance}</span><span class="workout__unit">km</span></div>
        <div class="workout__details"><span class="workout__icon">⏱️</span><span class="workout__value">${duration}</span><span class="workout__unit">min</span></div>
        <div class="workout__details"><span class="workout__icon">⭐</span><span class="workout__value">${stars}</span></div>
        <div class="workout__details"><span class="workout__icon">📝</span><span class="workout__value">${note}</span></div>
        <button class="workout__delete">✖</button>
      </li>
    `;

    workoutsContainer.insertAdjacentHTML("beforeend", html);
  }

  _handleListClick(e) {
    const deleteBtn = e.target.closest(".workout__delete");
    if (deleteBtn) {
      const workoutEl = deleteBtn.closest(".workout");
      const id = workoutEl.dataset.id;
      this._deleteWorkout(id, workoutEl);
      return;
    }
    this._moveToPopup(e);
  }

  _deleteWorkout(id, element) {
    this.#workouts = this.#workouts.filter((w) => w.id !== id);
    if (this.#markers[id]) {
      this.#markers[id].remove();
      delete this.#markers[id];
    }
    element.remove();
    this._setLocalStorage();
    this._toggleWelcome();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find((w) => w.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data.map(
      (w) =>
        new Workout(
          w.type,
          w.coords,
          w.distance,
          w.duration,
          w.rating,
          w.note,
          new Date(w.date),
          w.id
        )
    );
    this.#workouts.forEach((w) => this._renderWorkout(w));
  }

  _toggleWelcome() {
    if (this.#workouts.length === 0 && form.classList.contains("hidden")) {
      this.#welcomeEl.classList.remove("hidden");
    } else {
      this.#welcomeEl.classList.add("hidden");
    }
  }
}

const app = new App();
