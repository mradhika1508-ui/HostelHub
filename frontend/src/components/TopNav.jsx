import { useState } from "react";
import { Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

const getInitials = (name) =>
  name?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";

const TopNav = ({ title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-[#1a1a2e]/90 border-b border-gray-200 dark:border-[#313155]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold text-[#1D9E75] font-[Outfit] tracking-tight">
            HostelHub
          </span>
          {title && (
            <span className="hidden md:flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
              <span>/</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{title}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#23233E] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <div className="relative">
            <button
              data-testid="profile-avatar"
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-[#23233E] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-sm font-bold">
                {getInitials(user?.name)}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showProfile && (
              <div
                className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#23233E] rounded-2xl shadow-xl border border-gray-100 dark:border-[#313155] overflow-hidden"
                data-testid="profile-dropdown"
              >
                <div className="px-4 py-3">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm font-[Outfit]">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                  {user?.reg_number && (
                    <span className="inline-block mt-1 text-xs bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded-full font-medium">
                      {user.reg_number}
                    </span>
                  )}
                  {user?.role === "warden" && (
                    <span className="inline-block mt-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      Warden
                    </span>
                  )}
                </div>
                <div className="border-t border-gray-100 dark:border-[#313155]">
                  <button
                    data-testid="logout-button"
                    onClick={() => {
                      logout();
                      navigate("/login");
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
