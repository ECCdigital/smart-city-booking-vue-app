import axios from "axios";

const API_CLIENT = axios.create({
  baseURL: `${process.env.VUE_APP_SERVER_BASE_URL}/`,
  withCredentials: false,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

export default API_CLIENT;
