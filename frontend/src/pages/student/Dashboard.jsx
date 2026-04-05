import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api/axios";
import { timeAgo } from "../../utils/timeAgo";
import { StatusBadge } from "../../components/StatusTracker";
import { Wrench, Search, UtensilsCrossed, AlertCircle, ArrowRight, TrendingUp, PawPrint, Users } from "lucide-react";
const CircularRing = ({ value }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
      <circle
        cx="50" cy="50" r={radius} fill="none" stroke="#1D9E75" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1D9E75">{value}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#888">/ 100</text>
    </svg>
  );
};

const QUICK_ACTIONS = [
  { label: "Report Maintenance", icon: Wrench, to: "/maintenance", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-500", desc: "Plumbing, electrical, furniture" },
  { label: "Lost & Found", icon: Search, to: "/lost-found", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500", desc: "Post or find lost items" },
  { label: "Mess Corner", icon: UtensilsCrossed, to: "/mess", color: "bg-[#1D9E75]/10 text-[#1D9E75]", desc: "Menu, ratings & complaints" },
  { label: "Stray Animals", icon: PawPrint, to: "/stray", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-500", desc: "Report animal welfare concerns" },
  { label: "Visitor Requests", icon: Users, to: "/visitors", color: "bg-teal-50 dark:bg-teal-900/20 text-teal-500", desc: "Register & track visitor passes" },
  { label: "Other Issues", icon: AlertCircle, to: "/issues", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500", desc: "WiFi, noise, safety concerns" },
];

const MEAL_ICONS = { breakfast: "🍳", lunch: "🍛", snacks: "🫖", dinner: "🌙" };

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [healthScore, setHealthScore] = useState(0);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketsRes, scoreRes, menuRes] = await Promise.all([
          api.get("/maintenance"),
          api.get("/health-score"),
          api.get("/mess/menu"),
        ]);
        setTickets(ticketsRes.data.slice(0, 5));
        setHealthScore(Math.round(scoreRes.data.score));
        setMenu(menuRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getHealthLabel = (s) => s >= 75 ? "Excellent" : s >= 50 ? "Good" : "Needs Attention";

  if (loading) return (
    <Layout title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white font-[Outfit]">
          Hi, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Room {user?.room_number || "—"} · Floor {user?.floor_number || "—"} · {user?.reg_number}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 font-[Outfit]">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, to, color, desc }) => (
              <button
                key={to}
                data-testid={`quick-action-${label.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => navigate(to)}
                className="card-hover p-4 bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] text-left group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white font-[Outfit]">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5 flex flex-col items-center justify-center gap-2" data-testid="health-score-card">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Hostel Health</p>
          <CircularRing value={healthScore} />
          <p className="text-sm font-semibold text-[#1D9E75]">{getHealthLabel(healthScore)}</p>
          <p className="text-xs text-gray-400 text-center">Based on this week's ratings</p>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Issues Feed */}
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5" data-testid="issues-feed">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white font-[Outfit]">My Requests</h2>
            <button onClick={() => navigate("/maintenance")} className="text-xs text-[#1D9E75] flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a2e]/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.category}</p>
                    <p className="text-xs text-gray-400 truncate">{t.ticket_number} · {timeAgo(t.created_at)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Menu Preview */}
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5" data-testid="menu-preview">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white font-[Outfit]">Today's Mess Menu</h2>
            <button onClick={() => navigate("/mess")} className="text-xs text-[#1D9E75] flex items-center gap-1 hover:underline">
              Rate food <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {!menu ? (
            <div className="text-center py-8 text-gray-400">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No menu available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {["breakfast", "lunch", "snacks", "dinner"].map((meal) => (
                <div key={meal} className="flex gap-3">
                  <span className="text-lg mt-0.5">{MEAL_ICONS[meal]}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{meal}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{menu[meal] || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
