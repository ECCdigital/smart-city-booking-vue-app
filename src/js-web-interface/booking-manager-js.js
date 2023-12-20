/**
 * The Booking Manager class handles the integration of bookable and event objects into a website.
 */
class BookingManager {
  /**
   * Initialize the Booking Manager Integration.
   */
  init() {
    console.log("Initializing Booking Manager Integration.");
    this.addLibScripts([
      "https://cdn.jsdelivr.net/npm/fullcalendar@6.0.3/index.global.min.js",
    ])
      .then(() => {
        this.fetchBookableList();
        this.fetchBookableItem();
        this.fetchEventList();
        this.fetchEventItem();
        this.initializeCalendar();
        this.initializeOccupancyCalendar();
        this.initializeLoginForm();
        this.initializeLogoutButton();
        this.initializeBookingsTable();
        this.initializeUserProfile();
      })
      .catch((err) => {
        console.error("Could not load required scripts", err);
      });
  }

  /**
   * Dynamically load required Library Scripts.
   * @param scriptUrls List of script urls to load
   * @returns {Promise<unknown>}
   */
  addLibScripts(scriptUrls) {
    const promises = [];
    scriptUrls.forEach((scriptUrl) => {
      promises.push(
        new Promise((resolve, reject) => {
          let scriptEle = document.createElement("script");
          scriptEle.setAttribute("src", scriptUrl);
          document.body.appendChild(scriptEle);

          scriptEle.addEventListener("load", () => {
            resolve();
          });

          scriptEle.addEventListener("error", (err) => {
            reject(err);
          });
        })
      );
    });

    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * Get a URL parameter by name.
   * @param {string} name The name of the parameter.
   * @returns {string} The value of the parameter.
   * @private
   */
  _getUrlParameter(name) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(name);
  }

  /**
   * Fetch the list of bookables.
   */
  fetchBookableList() {
    if (document.getElementById("bm-bookable-list")) {
      console.log("Binding data to elements with id bm-bookable-list");

      const type =
        document.getElementById("bm-bookable-list").getAttribute("data-type") ||
        "";
      const fixedBookableIds =
        document.getElementById("bm-bookable-list").getAttribute("data-ids") ||
        "";

      const fetchUrl = `${this.url}/html/${this.tenant}/bookables?type=${type}&ids=${fixedBookableIds}`;
      fetch(fetchUrl)
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          document.getElementById("bm-bookable-list").innerHTML = html;
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
    }
  }

  /**
   * Fetch a single bookable object.
   */
  fetchBookableItem() {
    if (document.getElementById("bm-bookable-item")) {
      console.log("Binding data to elements with id bm-bookable-item");

      const fixedBookableId = document
        .getElementById("bm-bookable-item")
        .getAttribute("data-id");
      const bookableIdParameterName = document
        .getElementById("bm-bookable-item")
        .getAttribute("data-id-param");

      const bookableId =
        fixedBookableId || this._getUrlParameter(bookableIdParameterName);
      if (!bookableId) {
        console.warn("Could not get bookable id");
      } else {
        const fetchUrl = `${this.url}/html/${this.tenant}/bookables/${bookableId}`;
        fetch(fetchUrl)
          .then(function (response) {
            return response.text();
          })
          .then(function (html) {
            document.getElementById("bm-bookable-item").innerHTML = html;
          })
          .catch(function (err) {
            console.warn(`Could not fetch data from ${fetchUrl}`, err);
          });
      }
    }
  }

  /**
   * Fetch the list of events.
   */
  fetchEventList() {
    if (document.getElementById("bm-event-list")) {
      console.log("Binding data to elements with id bm-event-list");

      const fixedEventIds =
        document.getElementById("bm-event-list").getAttribute("data-ids") || "";

      const fetchUrl = `${this.url}/html/${this.tenant}/events?ids=${fixedEventIds}`;
      fetch(fetchUrl)
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          document.getElementById("bm-event-list").innerHTML = html;
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
    }
  }

  /**
   * Fetch a single event object.
   */
  fetchEventItem() {
    if (document.getElementById("bm-event-item")) {
      console.log("Binding data to elements with id bm-event-item");

      const eventIdParameterName = document
        .getElementById("bm-event-item")
        .getAttribute("data-id-param");
      const fixedEventId = document
        .getElementById("bm-event-item")
        .getAttribute("data-id");

      const eventId =
        fixedEventId || this._getUrlParameter(eventIdParameterName);
      if (!eventId) {
        console.warn(
          `Could not get event id from url parameter ${eventIdParameterName}.`
        );
      } else {
        const fetchUrl = `${this.url}/html/${this.tenant}/events/${eventId}`;
        fetch(fetchUrl)
          .then(function (response) {
            return response.text();
          })
          .then(function (html) {
            document.getElementById("bm-event-item").innerHTML = html;
          })
          .catch(function (err) {
            console.warn(`Could not fetch data from ${fetchUrl}`, err);
          });
      }
    }
  }

  /**
   * Initialize the a calendar showing events and bind it to the element with id bm-calendar.
   */
  initializeCalendar() {
    const self = this;
    if (document.getElementById("bm-calendar")) {
      console.log("Binding data to element with id bm-calendar");

      const calendarConfig = this.calendar;

      const fetchUrl = `${this.url}/api/${this.tenant}/events`;
      fetch(fetchUrl)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const apiResponse = JSON.parse(text);
          const events = apiResponse.map((event) => {
            const linkUrl = self.calendarHref.replace("{id}", event.id);
            return {
              title: event.information.name,
              start:
                event.information.startDate + "T" + event.information.startTime,
              end: event.information.endDate + "T" + event.information.endTime,
              url: linkUrl,
            };
          });

          var calendarEl = document.getElementById("bm-calendar");
          let config = {
            events: events,
            ...calendarConfig,
          };
          var calendar = new FullCalendar.Calendar(calendarEl, config);
          calendar.render();
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
    }
  }

  /**
   * Initialize the a calendar showing occupancy and bind it to the element with id bm-occupancy-calendar.
   */
  initializeOccupancyCalendar() {
    const self = this;
    if (document.getElementById("bm-occupancy-calendar")) {
      console.log("Binding data to element with id bm-occupancy-calendar");

      const calendarConfig = this.calendar;

      const bookableIds = document
        .getElementById("bm-occupancy-calendar")
        .getAttribute("data-id")
        .split(",");

      const fetchUrl = `${this.url}/api/${this.tenant}/calendar/occupancy`;
      fetch(fetchUrl)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const apiResponse = JSON.parse(text);
          const events = apiResponse
            .filter((occupancy) => bookableIds.includes(occupancy.bookableId))
            .map((occupancy) => {
              return {
                title: occupancy.title,
                start: occupancy.timeBegin,
                end: occupancy.timeEnd,
              };
            });

          var calendarEl = document.getElementById("bm-occupancy-calendar");
          let config = {
            events: events,
            ...calendarConfig,
          };
          var calendar = new FullCalendar.Calendar(calendarEl, config);
          calendar.render();
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
    }
  }

  /**
   * Initialize a login formular and bind it to the element with id bm-signin. Add a button that posts a login request
   * to the backend.
   */
  initializeLoginForm() {
    if (document.getElementById("bm-signin")) {
      console.log("Binding data to element with id bm-signin");
      const loginForm = document.getElementById("bm-signin");
      const loginButton = document.getElementById("bm-submit-signin");

      const successRedirectUrl = document
        .getElementById("bm-signin")
        .getAttribute("data-success-redirect-url");

      const errorRedirectUrl = document
        .getElementById("bm-signin")
        .getAttribute("data-error-redirect-url");

      loginButton.addEventListener("click", () => {
        const username = loginForm.querySelector("input[name=username]").value;
        const password = loginForm.querySelector("input[name=password]").value;
        const fetchUrl = `${this.url}/auth/${this.tenant}/signin`;
        fetch(fetchUrl, {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            id: username,
            password: password,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(function (response) {
            if (response.status === 200 && successRedirectUrl) {
              location.href = successRedirectUrl;
            } else if (errorRedirectUrl) {
              location.href = errorRedirectUrl;
            }
          })
          .catch(function (err) {
            console.warn(`Could not fetch data from ${fetchUrl}`, err);
          });
      });
    }
  }

  /**
   * Bind logout to the element with id bm-signout.
   */
  initializeLogoutButton() {
    if (document.getElementById("bm-signout")) {
      console.log("Binding data to element with id bm-signout");
      const logoutButton = document.getElementById("bm-signout");
      logoutButton.addEventListener("click", () => {
        const fetchUrl = `${this.url}/auth/${this.tenant}/signout`;
        fetch(fetchUrl)
          .then(function (response) {
            return response.text();
          })
          .then(function (text) {
            console.log("Signout successful");
          })
          .catch(function (err) {
            console.warn(`Could not fetch data from ${fetchUrl}`, err);
          });
      });
    }
  }

  initializeBookingsTable() {
    if (document.getElementById("bm-booking-table")) {
      const tableHeader = document.getElementById("bm-booking-table-header");
      const tableBody = document.getElementById("bm-booking-table-body");
      const fetchUrl = `${this.url}/api/${this.tenant}/mybookings?populate=true`;
      fetch(fetchUrl, {
        credentials: "include",
      })
        .then(function (response) {
          return response.text();
        })
        .then((text) => {
          const apiResponse = JSON.parse(text);
          const bookings = apiResponse.map((booking) => {
            return {
              id: booking.id,
              bookable: booking.bookableItems,
              timeCreated: new Date(booking.timeCreated).toLocaleDateString(
                "de-DE"
              ),
              isCommitted: booking.isCommitted,
              isPayed: booking.isPayed,
            };
          });
          bookings.forEach((booking) => {
            if (booking.isPayed && booking.isCommitted) {
              booking.status = "Freigegeben / Bezahlt";
            } else if (booking.isPayed && !booking.isCommitted) {
              booking.status = "Nicht freigegeben / Bezahlt";
            } else if (!booking.isPayed && booking.isCommitted) {
              booking.status = "Freigegeben / Nicht bezahlt";
            } else {
              booking.status = "Nicht freigegeben / Nicht bezahlt";
            }
            booking.title = booking.bookable.map((bookable) => {
              return bookable._bookableUsed.title;
            });
          });

          tableHeader.innerHTML = `<tr>
                    <th>Buchungsobjekt</th>
                    <th>Datum</th>
                    <th>Status</th>
                </tr>`;
          tableBody.innerHTML = bookings
            .map(
              (booking) => `<tr>
                    <td>${booking.title}</td>
                    <td>${booking.timeCreated}</td>
                    <td>${booking.status}</td>
                </tr>`
            )
            .join("");
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
    }
  }

  initializeUserProfile() {
    if (document.getElementById("bm-user-profile")) {
      const profileForm = document.getElementById("bm-user-profile");
      const userFirstName = profileForm.querySelector("input[name=firstname]");
      const userLastName = profileForm.querySelector("input[name=lastname]");
      const userEmail = profileForm.querySelector("input[name=email]");
      const userPhone = profileForm.querySelector("input[name=phone]");
      const userAddress = profileForm.querySelector("input[name=address]");
      const userZip = profileForm.querySelector("input[name=zip]");
      const userCity = profileForm.querySelector("input[name=city]");
      const submitButton = document.getElementById("bm-submit-profile");
      const fetchUrl = `${this.url}/auth/${this.tenant}/me`;
      fetch(fetchUrl, {
        credentials: "include",
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const apiResponse = JSON.parse(text);
          userFirstName.value = apiResponse.firstName;
          userLastName.value = apiResponse.lastName;
          userEmail.value = apiResponse.id;
          userPhone.value = apiResponse.phone;
          userAddress.value = apiResponse.address;
          userZip.value = apiResponse.zipCode;
          userCity.value = apiResponse.city;
        })
        .catch(function (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        });
      submitButton.addEventListener("click", () => {
        const firstName = profileForm.querySelector(
          "input[name=firstname]"
        ).value;
        const lastName = profileForm.querySelector(
          "input[name=lastname]"
        ).value;
        const phone = profileForm.querySelector("input[name=phone]").value;
        const address = profileForm.querySelector("input[name=address]").value;
        const zip = profileForm.querySelector("input[name=zip]").value;
        const city = profileForm.querySelector("input[name=city]").value;
        const updateUrl = `${this.url}/api/${this.tenant}/user`;
        fetch(updateUrl, {
          method: "PUT",
          credentials: "include",
          body: JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            address: address,
            zipCode: zip,
            city: city,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(function () {
            console.log("Profile update successful");
          })
          .catch(function (err) {
            console.warn(`Could not fetch data from ${fetchUrl}`, err);
          });
      });
    }
  }

  async isSignedIn() {
    const fetchUrl = `${this.url}/auth/${this.tenant}/me`;
    try {
      const response = await fetch(fetchUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.status === 200;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
