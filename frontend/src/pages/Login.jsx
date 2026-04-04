import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../api/axios";
import { toast } from "sonner";
import { Sun, Moon, Shield, Star, Clock } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/google", { credential: credentialResponse.credential });
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      navigate(data.user.role === "warden" ? "/warden" : "/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#1a1a2e]">
      {/* Left Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80"
          alt="VIT Hostel Campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/85 to-[#1a1a2e]/70" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <h1 className="text-5xl font-extrabold text-white font-[Outfit] mb-3">HostelHub</h1>
          <p className="text-xl text-white/90 font-[DM_Sans] mb-8">
            Your complete hostel management companion
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: Shield, text: "Secure Google Sign-in" },
              { icon: Star, text: "Rate & review your mess food" },
              { icon: Clock, text: "Track maintenance in real time" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Theme toggle */}
        <button
          data-testid="theme-toggle"
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#23233E] transition-colors"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-500" />}
        </button>

        <div className="w-full max-w-md space-y-8">
          {/* Logo (mobile only) */}
          <div className="lg:hidden text-center">
            <h1 className="text-4xl font-extrabold text-[#1D9E75] font-[Outfit]">HostelHub</h1>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-[Outfit]">
              Welcome back
            </h2>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              Sign in with your VIT Google account to continue
            </p>
          </div>

          <div
            className="bg-white dark:bg-[#23233E] rounded-2xl p-8 border border-gray-100 dark:border-[#313155] shadow-sm"
            data-testid="login-card"
          >
            {error && (
              <div
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Signing you in...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4" data-testid="google-login-btn">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setError("Google sign-in failed. Please try again.");
                    toast.error("Google sign-in failed");
                  }}
                  theme={theme === "dark" ? "filled_black" : "outline"}
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="280"
                />
              </div>
            )}

            <div className="mt-6 p-3 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-xl">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Only <span className="font-semibold text-[#1D9E75]">@vitstudent.ac.in</span> and{" "}
                <span className="font-semibold text-[#1D9E75]">@vit.ac.in</span> accounts are allowed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Students</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">@vitstudent.ac.in</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wardens</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">@vit.ac.in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
