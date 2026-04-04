import { Navigate, Route, Routes, BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/student/Dashboard";
import Maintenance from "./pages/student/Maintenance";
import LostFound from "./pages/student/LostFound";
import MessCorner from "./pages/student/MessCorner";
import OtherIssues from "./pages/student/OtherIssues";
import WardenDashboard from "./pages/warden/WardenDashboard";
import "./App.css";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === "warden" ? "/warden" : "/dashboard"} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user, token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><Dashboard /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute requiredRole="student"><Maintenance /></ProtectedRoute>} />
      <Route path="/lost-found" element={<ProtectedRoute requiredRole="student"><LostFound /></ProtectedRoute>} />
      <Route path="/mess" element={<ProtectedRoute requiredRole="student"><MessCorner /></ProtectedRoute>} />
      <Route path="/issues" element={<ProtectedRoute requiredRole="student"><OtherIssues /></ProtectedRoute>} />
      <Route path="/warden" element={<ProtectedRoute requiredRole="warden"><WardenDashboard /></ProtectedRoute>} />
      <Route path="/" element={
        token
          ? <Navigate to={user?.role === "warden" ? "/warden" : "/dashboard"} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
