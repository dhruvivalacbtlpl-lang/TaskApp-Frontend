import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// ── Response interceptor ───────────────────────────────────────────────────────
// Handles subscription/limit errors globally so every page gets them for free.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const code    = err.response?.data?.code;
    const message = err.response?.data?.message || "Something went wrong";

    if (code === "SUBSCRIPTION_EXPIRED") {
      // Redirect to expired page — avoid redirect loop if already there
      if (!window.location.pathname.includes("/subscription/expired")) {
        window.location.href = "/admin/subscription/expired";
      }
    }

    if (code === "ACCOUNT_DEACTIVATED") {
      // Clear session and send to login with a message
      localStorage.setItem("deactivated_msg", message);
      window.location.href = "/login";
    }

    // LIMIT_REACHED is handled per-page (the calling component shows the error)
    // We just re-throw so the component's catch block still fires
    return Promise.reject(err);
  }
);

export default api;