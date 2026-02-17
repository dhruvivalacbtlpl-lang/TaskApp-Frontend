import { Navigate } from "react-router-dom";

function PrivateRoute({ children, role }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("role");

  // Not logged in → go to login
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Role check (optional)
  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;
