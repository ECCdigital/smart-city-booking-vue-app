import TypeService from "./TypeService";

export default {
  getFromLocalStorage(key) {
    let value = localStorage.getItem(key);

    if (!TypeService.isSet(value)) {
      value = undefined;
    }

    try {
      // Parse arrays, objects, booleans, numbers or stringified number
      value = JSON.parse(value);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error.message;
      }
    }

    return value;
  },
  writeToLocalStorage(key, value) {
    if (TypeService.isSet(value)) {
      // Only stringify non string values and stringified number
      localStorage.setItem(key, !_.isString(value) || !isNaN(value) ? JSON.stringify(value) : value);
    }
  },
  removeFromLocalStorage(key) {
    localStorage.removeItem(key);
  },
};
