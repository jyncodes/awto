export const getBackendUrl = () => {
  let url = import.meta.env.VITE_BACKEND_URL;

  // Ensure no trailing slash (prevents "//send-email")
  return url.replace(/\/$/, "");
};
