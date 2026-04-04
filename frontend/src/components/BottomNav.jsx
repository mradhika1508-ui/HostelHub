import { Link, useLocation } from "react-router-dom";
import { Home, Wrench, Search, UtensilsCrossed, AlertCircle } from "lucide-react";

const links = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/maintenance", icon: Wrench, label: "Repair" },
  { to: "/lost-found", icon: Search, label: "Lost" },
  { to: "/mess", icon: UtensilsCrossed, label: "Mess" },
  { to: "/issues", icon: AlertCircle, label: "Issues" },
];

const BottomNav = () => {
  const location = useLocation();
  return (
    <nav
      data-testid="bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a2e] border-t border-gray-100 dark:border-[#313155] safe-area-bottom"
    >
      <div className="flex">
        {links.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                active ? "text-[#1D9E75]" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
