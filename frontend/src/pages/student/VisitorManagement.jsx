import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { toast } from "sonner";
import { Users, Clock, CheckCircle, XCircle, Plus, X } from "lucide-react";
const RELATIONSHIPS = ["Parent", "Sibling", "Friend", "Guardian", "Other"];

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-[#1D9E75]/10 text-[#1D9E75]",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_ICONS = { pending: Clock, approved: CheckCircle, rejected: XCircle };

const VisitorManagement = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    visitor_name: "", visitor_phone: "", relationship: "Parent",
    visit_date: "", visit_time: "", purpose: "",
  });

  useEffect(() => {
    api.get("/visitors").then((r) => setVisits(r.data)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visitor_name || !form.visitor_phone || !form.visit_date || !form.visit_time || !form.purpose) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/visitors", form);
      setVisits((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ visitor_name: "", visitor_phone: "", relationship: "Parent", visit_date: "", visit_time: "", purpose: "" });
      toast.success("Visitor request submitted! Awaiting warden approval.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Layout title="Visitor Management">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Visitor Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Request approval for your visitors</p>
        </div>
        <button
          data-testid="add-visitor-btn"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Request"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5 mb-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Register Visitor</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Visitor Name *</label>
              <input
                value={form.visitor_name}
                onChange={(e) => setForm((f) => ({ ...f, visitor_name: e.target.value }))}
                data-testid="visitor-name-input"
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Phone Number *</label>
              <input
                value={form.visitor_phone}
                onChange={(e) => setForm((f) => ({ ...f, visitor_phone: e.target.value }))}
                data-testid="visitor-phone-input"
                placeholder="10-digit mobile number"
                type="tel"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Relationship *</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                data-testid="visitor-relationship-select"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              >
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Visit Date *</label>
              <input
                type="date"
                min={today}
                value={form.visit_date}
                onChange={(e) => setForm((f) => ({ ...f, visit_date: e.target.value }))}
                data-testid="visitor-date-input"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Visit Time *</label>
              <input
                type="time"
                value={form.visit_time}
                onChange={(e) => setForm((f) => ({ ...f, visit_time: e.target.value }))}
                data-testid="visitor-time-input"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">
                Purpose of Visit * <span className="normal-case font-normal text-gray-300 dark:text-gray-500">(max 100 chars)</span>
              </label>
              <textarea
                rows={2}
                maxLength={100}
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                data-testid="visitor-purpose-input"
                placeholder="e.g. Family visit, document pickup..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{form.purpose.length}/100</p>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                data-testid="visitor-submit-btn"
                className="w-full py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Past Requests */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">My Visitor Requests</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No visitor requests yet</p>
            <p className="text-xs mt-1">Click "New Request" to register a visitor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((v) => {
              const StatusIcon = STATUS_ICONS[v.status] || Clock;
              return (
                <div key={v.id} data-testid={`visitor-request-${v.id}`}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-[#1a1a2e]/50">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_STYLES[v.status]}`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{v.visitor_name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[v.status]}`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {v.relationship} · {v.visitor_phone}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {v.visit_date} at {v.visit_time} · {v.purpose}
                    </p>
                    {v.warden_notes && (
                      <p className="text-xs text-[#1D9E75] mt-1 font-medium">
                        Warden note: {v.warden_notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-1">{v.ticket_number}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VisitorManagement;
