import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { StatusBadge } from "../../components/StatusTracker";
import { toast } from "sonner";
import { Camera, MapPin, Clock, PawPrint, AlertTriangle, Plus, ChevronRight, Check } from "lucide-react";
const ISSUE_TYPES = [
  { value: "Injured", emoji: "🩹", color: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600" },
  { value: "Aggressive", emoji: "⚠️", color: "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600" },
  { value: "Hungry or Malnourished", emoji: "🍖", color: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700" },
  { value: "Pregnant", emoji: "🐾", color: "border-pink-400 bg-pink-50 dark:bg-pink-900/20 text-pink-600" },
  { value: "Sick", emoji: "🤒", color: "border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-600" },
  { value: "Lost", emoji: "🔍", color: "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
  { value: "Other", emoji: "📋", color: "border-gray-300 bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400" },
];

const STATUS_STYLES = {
  reported: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  being_handled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};
const STATUS_LABELS = { reported: "Reported", being_handled: "Being Handled", resolved: "Resolved" };

const StrayAnimals = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | form | confirm
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [form, setForm] = useState({
    issue_type: "",
    description: "",
    photo_url: "",
    location_meta: "",
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await api.get("/stray");
      setReports(data);
    } catch { toast.error("Failed to load reports"); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Try to get location metadata from browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setForm((f) => ({ ...f, location_meta: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        },
        () => {} // silently fail if denied
      );
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setForm((f) => ({ ...f, photo_url: reader.result }));
  };

  const handleSubmit = async () => {
    if (!form.photo_url) { toast.error("Please upload a photo — it's required"); return; }
    if (!form.issue_type) { toast.error("Please select the issue type"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/stray", form);
      setSubmittedReport(data);
      setReports((prev) => [data, ...prev]);
      setView("confirm");
      toast.success("Report submitted! Thank you for caring.");
    } catch { toast.error("Failed to submit report"); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setView("list");
    setForm({ issue_type: "", description: "", photo_url: "", location_meta: "" });
    setSubmittedReport(null);
  };

  // Confirm screen
  if (view === "confirm" && submittedReport) {
    return (
      <Layout title="Stray Animals">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-2">Report Submitted!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The warden will be notified and take appropriate action.</p>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5 text-left mb-6">
            <p className="text-xs text-gray-400 mb-1">Ticket Number</p>
            <p className="font-mono text-base font-bold text-[#1D9E75] mb-4">{submittedReport.ticket_number}</p>
            {submittedReport.photo_url && (
              <img src={submittedReport.photo_url} alt="Stray" className="w-full h-40 object-cover rounded-xl mb-4" />
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400 text-xs">Issue Type</p><p className="font-medium dark:text-white">{submittedReport.issue_type}</p></div>
              <div><p className="text-gray-400 text-xs">Status</p><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES.reported}`}>Reported</span></div>
            </div>
            {submittedReport.location_meta && (
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" /> {submittedReport.location_meta}
              </div>
            )}
          </div>
          <button onClick={resetForm}
            className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold hover:bg-[#15825E] transition-colors">
            Back to Reports
          </button>
        </div>
      </Layout>
    );
  }

  // Form view
  if (view === "form") {
    return (
      <Layout title="Stray Animals">
        <div className="max-w-xl mx-auto">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-snug">
              Feeding stray animals on campus is strictly not allowed. Please only use this page to report animal welfare concerns.
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit]">Report a Stray Animal</h2>
            <button onClick={resetForm} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
          </div>

          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6 space-y-5">
            {/* Photo upload - mandatory */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Photo <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-1">(required — location tag auto-captured if allowed)</span>
              </label>
              <label
                data-testid="photo-upload-area"
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${
                  form.photo_url
                    ? "border-[#1D9E75]"
                    : "border-gray-200 dark:border-[#313155] hover:border-[#1D9E75]"
                }`}
              >
                {form.photo_url ? (
                  <img src={form.photo_url} alt="preview" className="max-h-48 object-contain rounded-xl" />
                ) : (
                  <div className="text-center text-gray-400">
                    <Camera className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Tap to take photo or upload</p>
                    <p className="text-xs mt-0.5">JPG, PNG up to 10MB</p>
                  </div>
                )}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
                data-testid="photo-input"
              />
              {form.location_meta && (
                <div className="flex items-center gap-1 text-xs text-[#1D9E75] mt-2">
                  <MapPin className="w-3 h-3" /> Location captured: {form.location_meta}
                </div>
              )}
            </div>

            {/* Issue type */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ISSUE_TYPES.map(({ value, emoji, color }) => (
                  <button
                    key={value}
                    data-testid={`issue-type-${value.toLowerCase().replace(/ /g, "-")}`}
                    onClick={() => setForm((f) => ({ ...f, issue_type: value }))}
                    className={`py-2.5 px-2 rounded-xl border-2 text-center text-xs font-semibold transition-all ${
                      form.issue_type === value ? color : "border-gray-200 dark:border-[#313155] text-gray-500 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg block mb-0.5">{emoji}</span>
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Description
                <span className="text-xs font-normal text-gray-400 ml-1">(max 150 characters)</span>
              </label>
              <textarea
                rows={3}
                maxLength={150}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                data-testid="stray-description"
                placeholder="Briefly describe what you observed..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 focus:border-[#1D9E75]"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{form.description.length}/150</p>
            </div>

            <button
              data-testid="submit-stray-btn"
              onClick={handleSubmit}
              disabled={submitting || !form.photo_url || !form.issue_type}
              className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold hover:bg-[#15825E] transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // List view
  return (
    <Layout title="Stray Animals">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl mb-6" data-testid="stray-warning-banner">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium leading-snug">
          <span className="font-bold">Feeding stray animals on campus is strictly not allowed.</span>{" "}
          Please only use this page to report animal welfare concerns.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Stray Animal Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Report stray animals that need attention</p>
        </div>
        <button
          data-testid="new-stray-report-btn"
          onClick={() => setView("form")}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors"
        >
          <Plus className="w-4 h-4" /> Report Animal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No reports submitted yet</p>
          <p className="text-sm mt-1">Use the button above to report an animal in need</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const issueInfo = ISSUE_TYPES.find((t) => t.value === r.issue_type);
            return (
              <div key={r.id} data-testid={`stray-report-${r.id}`}
                className="card-hover bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] overflow-hidden">
                <div className="h-44 bg-gray-100 dark:bg-[#1a1a2e] relative overflow-hidden">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="Stray animal" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PawPrint className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full ${issueInfo?.color || "bg-gray-100 text-gray-600"}`}>
                    {issueInfo?.emoji} {r.issue_type}
                  </span>
                </div>
                <div className="p-4">
                  {r.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{r.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || STATUS_STYLES.reported}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(r.created_at)}
                    </span>
                  </div>
                  {r.location_meta && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" /> {r.location_meta}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default StrayAnimals;
