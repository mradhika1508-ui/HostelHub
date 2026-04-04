import { Check } from "lucide-react";

const STATUSES = ["submitted", "seen", "assigned", "in_progress", "resolved"];
const LABELS = ["Submitted", "Seen", "Assigned", "In Progress", "Resolved"];

const STATUS_COLORS = {
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  seen: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  assigned: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
    {LABELS[STATUSES.indexOf(status)] || status}
  </span>
);

const StatusTracker = ({ status }) => {
  const currentStep = STATUSES.indexOf(status);
  return (
    <div className="flex items-center w-full" data-testid="status-tracker">
      {STATUSES.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
              i < currentStep
                ? "bg-[#1D9E75] border-[#1D9E75] text-white"
                : i === currentStep
                ? "bg-[#1D9E75] border-[#1D9E75] text-white ring-2 ring-[#1D9E75]/30"
                : "bg-white dark:bg-[#23233E] border-gray-200 dark:border-[#313155] text-gray-400"
            }`}>
              {i < currentStep ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </div>
            <span className="text-xs text-center text-gray-500 dark:text-gray-400 hidden sm:block w-14 leading-tight">{LABELS[i]}</span>
          </div>
          {i < STATUSES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? "bg-[#1D9E75]" : "bg-gray-200 dark:bg-[#313155]"}`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default StatusTracker;
