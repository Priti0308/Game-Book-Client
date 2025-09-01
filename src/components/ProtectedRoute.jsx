import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role"); // should be "admin" or "vendor"

  // 1. Not logged in
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Logged in but role not allowed
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If role doesn’t match, send them to their correct dashboard
    if (userRole === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (userRole === "vendor") {
      return <Navigate to="/vendor" replace />;
    }
    // fallback if unknown role
    return <Navigate to="/" replace />;
  }

  // 3. Everything okay
  return children;
};

export default ProtectedRoute;
