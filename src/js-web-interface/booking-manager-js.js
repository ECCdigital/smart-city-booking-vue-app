/**
 * The Booking Manager class handles the integration of bookable and event objects into a website.
 * It is responsible for fetching data from the server, initializing various elements on the page,
 * and handling user interactions.
 *
 * @class
 * @param {string} url - The base URL of the server.
 * @param {string} tenant - The tenant identifier.
 * @param {string} calendarView - The initial view of the calendar ('month' or 'week').
 *
 * @example
 * // Include the Booking Manager script in your HTML file
 * <script src="https://demo1.smart-city-booking.de/cdn/current/booking-manager.min.js"></script>
 * <script>
 *   // Create a new instance of the Booking Manager
 *   const bm = new BookingManager();
 *   // Set the base URL of the server
 *   bm.url = <server-url>;
 *   // Set the tenant identifier
 *   bm.tenant = <tenant>;
 *   // Initialize the Booking Manager when the window loads
 *   window.addEventListener("load", () => {
 *     bm.init();
 *   });
 * </script>
 */
// eslint-disable-next-line no-unused-vars
class BookingManager {
  /**
   * Creates an instance of BookingManager.
   *
   * @constructor
   * @param {string} url - The base URL of the server.
   * @param {string} tenant - The tenant identifier.
   */
  constructor(url, tenant) {
    this.url = url;
    this.tenant = tenant;
  }
  /**
   * Initialize the Booking Manager Integration.
   */
  init() {
    console.log("Initializing Booking Manager Integration.");

    this.addLibScripts([
      "https://cdn.jsdelivr.net/npm/fullcalendar@6.0.3/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js",
    ])
      .then(async () => {
        await this.fetchBookableList();
        this.fetchBookableList_old();
        await this.fetchBookableItem();
        this.fetchBookableItem_old();
        await this.fetchEventList();
        this.fetchEventList_old();
        await this.fetchEventItem();
        this.fetchEventItem_old();
        this.initializeEventCalendars();
        this.initializeOccupancyCalendars();
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
  async addLibScripts(scriptUrls) {
    for (const scriptUrl of scriptUrls) {
      await new Promise((resolve, reject) => {
        let scriptEle = document.createElement("script");
        scriptEle.setAttribute("src", scriptUrl);
        document.body.appendChild(scriptEle);

        scriptEle.addEventListener("load", resolve);
        scriptEle.addEventListener("error", reject);
      });
    }
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
   * Asynchronously fetches the list of bookables and updates the corresponding elements on the page.
   *
   * This method selects all elements with the class ".bm-bookable-list" and for each element, it fetches the corresponding bookable data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and optional type and ids attributes of the element.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * All fetch operations are performed concurrently using Promise.all.
   *
   * @async
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  async fetchBookableList() {
    try {
      const elements = document.querySelectorAll(".bm-bookable-list");

      const fetchDataForElement = async (element) => {
        const type = element.getAttribute("data-type") || "";
        const fixedBookableIds = element.getAttribute("data-ids") || "";
        const fetchUrl = `${this.url}/html/${this.tenant}/bookables?type=${type}&ids=${fixedBookableIds}`;

        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          element.innerHTML = await response.text();
        } catch (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        }
      };

      const fetchPromises = Array.from(elements).map(fetchDataForElement);
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching bookable lists:", error);
    }
  }

  /**
   * Fetches the list of bookables and updates the corresponding elements on the page.
   * This is an older version of the method, hence the suffix "_old".
   *
   * This method selects the element with the id "bm-bookable-list" and fetches the corresponding bookable data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and optional type and ids attributes of the element.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * @method
   * @deprecated This method is deprecated and will be removed in future versions.
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  fetchBookableList_old() {
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
   * Asynchronously fetches a single bookable item and updates the corresponding elements on the page.
   *
   * This method selects all elements with the class ".bm-bookable-item" and for each element, it fetches the corresponding bookable data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and the bookable ID which is either fixed or retrieved from the URL parameters.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * All fetch operations are performed concurrently using Promise.all.
   *
   * @async
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  async fetchBookableItem() {
    try {
      const elements = document.querySelectorAll(".bm-bookable-item");

      const fetchDataForElement = async (element) => {
        const fixedBookableId = element.getAttribute("data-id");
        const bookableIdParameterName = element.getAttribute("data-id-param");
        const bookableId =
          fixedBookableId || this._getUrlParameter(bookableIdParameterName);

        if (!bookableId) {
          console.warn("Could not get bookable id");
          return;
        }

        const fetchUrl = `${this.url}/html/${this.tenant}/bookables/${bookableId}`;

        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          element.innerHTML = await response.text();
        } catch (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        }
      };

      const fetchPromises = Array.from(elements).map(fetchDataForElement);
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching bookable items:", error);
    }
  }

  /**
   * Fetches a single bookable object and updates the corresponding element on the page.
   * This is an older version of the method, hence the suffix "_old".
   *
   * This method selects the element with the id "bm-bookable-item" and fetches the corresponding bookable data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and the bookable ID which is either fixed or retrieved from the URL parameters.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * @method
   * @deprecated This method is deprecated and will be removed in future versions.
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  fetchBookableItem_old() {
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
   * Asynchronously fetches the list of events and updates the corresponding elements on the page.
   *
   * This method selects all elements with the class ".bm-event-list" and for each element, it fetches the corresponding event data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and optional ids attribute of the element.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * All fetch operations are performed concurrently using Promise.all.
   *
   * @async
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  async fetchEventList() {
    try {
      const elements = document.querySelectorAll(".bm-event-list");

      const fetchDataForElement = async (element) => {
        const fixedEventIds = element.getAttribute("data-ids") || "";
        const fetchUrl = `${this.url}/html/${this.tenant}/events?ids=${fixedEventIds}`;

        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          element.innerHTML = await response.text();
        } catch (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        }
      };

      const fetchPromises = Array.from(elements).map(fetchDataForElement);
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching event lists:", error);
    }
  }

  /**
   * Fetches the list of events and updates the corresponding element on the page.
   * This is an older version of the method, hence the suffix "_old".
   *
   * This method selects the element with the id "bm-event-list" and fetches the corresponding event data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and optional ids attribute of the element.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * @method
   * @deprecated This method is deprecated and will be removed in future versions.
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  fetchEventList_old() {
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
   * Asynchronously fetches a single event item and updates the corresponding elements on the page.
   *
   * This method selects all elements with the class ".bm-event-item" and for each element, it fetches the corresponding event data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and the event ID which is either fixed or retrieved from the URL parameters.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * All fetch operations are performed concurrently using Promise.all.
   *
   * @async
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  async fetchEventItem() {
    try {
      const elements = document.querySelectorAll(".bm-event-item");

      const fetchDataForElement = async (element) => {
        const fixedEventId = element.getAttribute("data-id");
        const eventIdParameterName = element.getAttribute("data-id-param");
        const eventId =
          fixedEventId || this._getUrlParameter(eventIdParameterName);

        if (!eventId) {
          console.warn("Could not get event id");
          return;
        }

        const fetchUrl = `${this.url}/html/${this.tenant}/events/${eventId}`;

        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          element.innerHTML = await response.text();
        } catch (err) {
          console.warn(`Could not fetch data from ${fetchUrl}`, err);
        }
      };

      const fetchPromises = Array.from(elements).map(fetchDataForElement);
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching event items:", error);
    }
  }

  /**
   * Fetches a single event object and updates the corresponding element on the page.
   * This is an older version of the method, hence the suffix "_old".
   *
   * This method selects the element with the id "bm-event-item" and fetches the corresponding event data from the server.
   * The fetched data is then used to update the innerHTML of the element.
   *
   * The fetch URL is constructed using the base URL, tenant identifier, and the event ID which is either fixed or retrieved from the URL parameters.
   * If the fetch operation is successful, the innerHTML of the element is updated with the response text.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * @method
   * @deprecated This method is deprecated and will be removed in future versions.
   * @throws Will throw an error if there is an issue with selecting the elements or with the fetch operations.
   */
  fetchEventItem_old() {
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
   * Initializes calendars for all elements with the class "bm-calendar".
   *
   * This method iterates over all elements with the class "bm-calendar" and for each element, it fetches the corresponding event data from the server.
   * The fetched data is then used to initialize a calendar on the element.
   *
   * The initial view of the calendar is determined by the "data-view" attribute of the element. If no "data-view" attribute is present, the default view is "dayGridMonth".
   *
   * @method
   * @throws Will throw an error if there is an issue with fetching the events or initializing the calendar.
   */
  initializeEventCalendars() {
    const calendarEls = document.getElementsByClassName("bm-calendar");

    for (let i = 0; i < calendarEls.length; i++) {
      const calendarEl = calendarEls[i];
      const initialView =
        calendarEl.getAttribute("data-view") || "dayGridMonth";

      console.log(
        `Binding data to element with class bm-calendar and initial view ${initialView}`
      );

      this._fetchEvents().then((events) => {
        this._initCalendar(calendarEl, initialView, events);
      });
    }
  }

  /**
   * This method initializes occupancy calendars for all elements with the class "bm-occupancy-calendar".
   * It fetches occupancy data for each calendar based on the bookable IDs specified in the "data-id" attribute of the element.
   * The initial view of the calendar is determined by the "data-view" attribute of the element. If no "data-view" attribute is present, the default view is "dayGridMonth".
   */
  initializeOccupancyCalendars() {
    const calendarEls = document.getElementsByClassName(
      "bm-occupancy-calendar"
    );

    for (let i = 0; i < calendarEls.length; i++) {
      const calendarEl = calendarEls[i];
      const bookableIds = calendarEl.getAttribute("data-id")?.split(",");
      const initialView =
        calendarEl.getAttribute("data-view") || "dayGridMonth";

      console.log(
        `Binding data to element with class bm-occupancy-calendar and initial view ${initialView}`
      );

      this._fetchOccupancies(bookableIds).then((occupancy) => {
        this._initCalendar(calendarEl, initialView, occupancy);
      });
    }
  }

  /**
   * Initializes occupancy calendars for all elements with the class "bm-occupancy-calendar".
   *
   * This method iterates over all elements with the class "bm-occupancy-calendar" and for each element, it fetches the corresponding occupancy data from the server.
   * The fetched data is then used to initialize a calendar on the element.
   *
   * The initial view of the calendar is determined by the "data-view" attribute of the element. If no "data-view" attribute is present, the default view is "dayGridMonth".
   * The bookable IDs for which to fetch occupancy data are determined by the "data-id" attribute of the element. If present, this attribute is split into an array of IDs.
   *
   * @method
   * @throws Will throw an error if there is an issue with fetching the occupancy data or initializing the calendar.
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
   * Initializes the logout button functionality.
   *
   * This method selects the element with the id "bm-signout" and binds a click event listener to it.
   * When the logout button is clicked, a fetch request is sent to the server's signout endpoint.
   * If the fetch operation is successful, a message is logged to the console.
   * If the fetch operation fails, a warning message is logged to the console.
   *
   * @method
   * @throws Will throw an error if there is an issue with the fetch operation.
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
          .then(function () {
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

  /**
   * Asynchronously fetches event data from the server.
   *
   * This method sends a GET request to the server's /api/{tenant}/events endpoint and processes the response.
   * It maps the response data to an array of event objects, each with a title, start time, end time, and URL.
   *
   * @async
   * @returns {Promise<Array>} A promise that resolves to an array of event objects.
   * @throws Will throw an error if the fetch operation fails.
   */
  async _fetchEvents() {
    const fetchUrl = `${this.url}/api/${this.tenant}/events`;
    try {
      const response = await fetch(fetchUrl);
      const apiResponse = await response.json();
      return apiResponse.map((event) => ({
        title: event.information.name,
        start: `${event.information.startDate}T${event.information.startTime}`,
        end: `${event.information.endDate}T${event.information.endTime}`,
        url: this.calendarHref?.replace("{id}", event.id),
      }));
    } catch (err) {
      console.warn(`Could not fetch data from ${fetchUrl}`, err);
    }
  }

  /**
   * Asynchronously fetches occupancy data from the server.
   *
   * This method sends a GET request to the server's /api/{tenant}/calendar/occupancy endpoint and processes the response.
   * If the provided bookableIds array is defined, it is converted to a comma-separated string and included as a parameter in the fetch URL.
   * The response data is then mapped to an array of occupancy objects, each with a title, start time, and end time.
   *
   * @async
   * @param {Array} bookableIds - An array of bookable IDs. If defined, these IDs are included as a parameter in the fetch URL.
   * @returns {Promise<Array>} A promise that resolves to an array of occupancy objects.
   * @throws Will throw an error if the fetch operation fails.
   */
  async _fetchOccupancies(bookableIds) {
    let fetchUrl = `${this.url}/api/${this.tenant}/calendar/occupancy`;

    // Add ids to the URL only if bookableIds is defined
    if (bookableIds) {
      const ids = bookableIds.join(",");
      fetchUrl += `?ids=${ids}`;
    }

    try {
      const response = await fetch(fetchUrl);
      const apiResponse = await response.json();
      return apiResponse.map((occupancy) => ({
        title: occupancy.title,
        start: occupancy.timeBegin,
        end: occupancy.timeEnd,
      }));
    } catch (err) {
      console.warn(`Could not fetch data from ${fetchUrl}`, err);
    }
  }

  /**
   * Initializes a FullCalendar instance on the provided element.
   *
   * This method creates a new FullCalendar instance with the provided initial view and calendar items.
   * The calendar configuration is extended with the instance's own calendar configuration.
   *
   * @param {HTMLElement} calendarEl - The element to initialize the calendar on.
   * @param {string} initialView - The initial view of the calendar.
   * @param {Array} calenderItems - An array of calendar items to display on the calendar.
   */
  _initCalendar(calendarEl, initialView, calenderItems) {
    const config = {
      initialView: initialView,
      events: calenderItems,
      ...this.calendar,
    };
    // eslint-disable-next-line no-undef
    new FullCalendar.Calendar(calendarEl, config).render();
  }
}
