import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import StatusTracker, { StatusBadge } from "../../components/StatusTracker";
import api from "../../api/axios";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { toast } from "sonner";
import {
  Wifi, Volume2, Lightbulb, Wind, UserX, Shield, Tv, Thermometer, Users, HelpCircle,
  AlertCircle, Clock, Check, ChevronRight, Plus, ImagePlus
} from "lucide-react";

const CATEGORIES = [
  { name: "Room problem", icon: HelpCircle, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-500" },
  { name: "WiFi issue", icon: Wifi, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
  { name: "Washroom (common)", icon: AlertCircle, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  { name: "Noise complaint", icon: Volume2, color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500" },
  { name: "Common area lights", icon: Lightbulb, color: "bg-amber-50 dark:bg-amber-900/20 text-amber-500" },
  { name: "Lift issue", icon: Tv, color: "bg-gray-100 dark:bg-gray-700/50 text-gray-500" },
  { name: "Temperature or AC", icon: Thermometer, color: "bg-sky-50 dark:bg-sky-900/20 text-sky-500" },
  { name: "Feeling unsafe", icon: Shield, color: "bg-red-50 dark:bg-red-900/20 text-red-500" },
  { name: "Roommate concern", icon: Users, color: "bg-pink-50 dark:bg-pink-900/20 text-pink-500" },
  { name: "Other", icon: HelpCircle, color: "bg-green-50 dark:bg-green-900/20 text-green-500" },
];

const URGENCY = [
  { value: "urgent", label: "Urgent", color: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600" },
  { value: "soon", label: "Soon", color: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700" },
  { value: "minor", label: "Minor", color: "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700" },
];

const OtherIssues = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | form | detail
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "", description: "", urgency: "soon",
    anonymous: true, photo_url: null,
  });
  const [submittedIssue, setSubmittedIssue] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const { data } = await api.get("/issues");
      setIssues(data);
    } catch { toast.error("Failed to load issues"); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setForm((f) => ({ ...f, photo_url: reader.result }));
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description) { toast.error("Please fill all required fields"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/issues", form);
      setSubmittedIssue(data);
      setIssues((prev) => [data, ...prev]);
      setView("confirm");
      toast.success("Issue reported successfully!");
    } catch { toast.error("Failed to submit issue"); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setView("list");
    setForm({ category: "", description: "", urgency: "soon", anonymous: true, photo_url: null });
    setSubmittedIssue(null);
  };

  // Confirm screen
  if (view === "confirm" && submittedIssue) {
    return (
      <Layout title="Other Issues">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-2">Issue Reported!</h2>
          <p className="text-gray-500 mb-6">
            {submittedIssue.anonymous ? "Your identity is protected. The warden will see your floor number only." : "Your issue has been reported to the warden."}
          </p>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-1">Ticket Number</p>
            <p className="font-mono text-lg font-bold text-[#1D9E75] mb-4">{submittedIssue.ticket_number}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div><p className="text-gray-400">Category</p><p className="font-medium dark:text-white">{submittedIssue.category}</p></div>
              <div><p className="text-gray-400">Urgency</p><p className="font-medium capitalize dark:text-white">{submittedIssue.urgency}</p></div>
            </div>
            <StatusTracker status={submittedIssue.status} />
          </div>
          <button onClick={reset} className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold hover:bg-[#15825E] transition-colors">
            Back to Issues
          </button>
        </div>
      </Layout>
    );
  }

  // Detail view
  if (view === "detail" && selectedIssue) {
    return (
      <Layout title="Other Issues">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView("list")} className="text-sm text-[#1D9E75] mb-4 flex items-center gap-1">← Back</button>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono text-gray-400">{selectedIssue.ticket_number}</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit]">{selectedIssue.category}</h2>
              </div>
              <StatusBadge status={selectedIssue.status} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{selectedIssue.description}</p>
            {selectedIssue.photo_url && <img src={selectedIssue.photo_url} alt="Issue" className="w-full h-48 object-cover rounded-xl mb-4" />}
            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div><p className="text-gray-400">Urgency</p><p className="font-medium capitalize dark:text-white">{selectedIssue.urgency}</p></div>
              <div><p className="text-gray-400">Anonymous</p><p className="font-medium dark:text-white">{selectedIssue.anonymous ? "Yes" : "No"}</p></div>
            </div>
            <div className="mb-4 pb-4 border-b dark:border-[#313155]">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">Progress</p>
              <StatusTracker status={selectedIssue.status} />
            </div>
            {selectedIssue.warden_notes && (
              <div className="p-3 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-xl">
                <p className="text-xs font-semibold text-[#1D9E75] mb-1">Warden Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedIssue.warden_notes}</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Form view
  if (view === "form") {
    return (
      <Layout title="Other Issues">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit]">Report an Issue</h2>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Category</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORIES.map(({ name, icon: Icon, color }) => (
                  <button key={name} data-testid={`issue-cat-${name.replace(/ /g, "-").toLowerCase()}`}
                    onClick={() => setForm((f) => ({ ...f, category: name }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.category === name ? "border-[#1D9E75]" : "border-gray-100 dark:border-[#313155]"
                    } bg-white dark:bg-[#1a1a2e]/50`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-tight">{name}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description *</label>
              <textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                data-testid="issue-description"
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Urgency</label>
              <div className="flex gap-2">
                {URGENCY.map(({ value, label, color }) => (
                  <button key={value} data-testid={`issue-urgency-${value}`}
                    onClick={() => setForm((f) => ({ ...f, urgency: value }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.urgency === value ? color : "border-gray-200 dark:border-[#313155] text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-100 dark:border-[#313155] hover:border-[#1D9E75]/30 transition-colors">
              <input type="checkbox" data-testid="anonymous-toggle" checked={form.anonymous}
                onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))}
                className="w-4 h-4 accent-[#1D9E75]" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Submit anonymously</p>
                <p className="text-xs text-gray-400">Warden will see "Anonymous, Floor X" instead of your name</p>
              </div>
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[#313155] rounded-xl p-3 cursor-pointer hover:border-[#1D9E75] transition-colors">
              {form.photo_url ? <img src={form.photo_url} alt="" className="h-16 object-contain rounded" /> : (
                <div className="text-center text-gray-400"><ImagePlus className="w-5 h-5 mx-auto mb-0.5" /><span className="text-xs">Add photo (optional)</span></div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <button onClick={handleSubmit} disabled={submitting || !form.category || !form.description}
              data-testid="submit-issue-btn"
              className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold hover:bg-[#15825E] transition-colors disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Issue"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Other Issues">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Other Issues</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Report hostel-related concerns</p>
        </div>
        <button data-testid="new-issue-btn" onClick={() => setView("form")}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No issues reported</p>
          <p className="text-sm mt-1">Everything seems fine!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const Cat = CATEGORIES.find((c) => c.name === issue.category);
            const Icon = Cat?.icon || HelpCircle;
            return (
              <div key={issue.id} data-testid={`issue-${issue.id}`}
                onClick={() => { setSelectedIssue(issue); setView("detail"); }}
                className="card-hover bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-4 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${Cat?.color || "bg-gray-100 text-gray-500"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{issue.category}</p>
                      <StatusBadge status={issue.status} />
                      {issue.anonymous && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">Anon</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{issue.ticket_number} · {timeAgo(issue.created_at)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default OtherIssues;
