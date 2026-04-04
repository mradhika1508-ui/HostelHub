import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Layout from "../../components/Layout";
import StatusTracker, { StatusBadge } from "../../components/StatusTracker";
import api from "../../api/axios";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { toast } from "sonner";
import {
  Wrench, Droplets, Zap, Wifi, Lock, Wind, Sparkles, Bath, Square,
  ImagePlus, CheckCircle, AlertCircle, Clock, ChevronRight, Plus
} from "lucide-react";

const CATEGORIES = [
  { name: "Bathroom", icon: Bath, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  { name: "Water", icon: Droplets, color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500" },
  { name: "Electricity", icon: Zap, color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500" },
  { name: "WiFi", icon: Wifi, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
  { name: "Door/Lock", icon: Lock, color: "bg-red-50 dark:bg-red-900/20 text-red-500" },
  { name: "Window", icon: Square, color: "bg-green-50 dark:bg-green-900/20 text-green-500" },
  { name: "Fan/AC", icon: Wind, color: "bg-sky-50 dark:bg-sky-900/20 text-sky-500" },
  { name: "Cleaning", icon: Sparkles, color: "bg-pink-50 dark:bg-pink-900/20 text-pink-500" },
];

const URGENCY = [
  { value: "urgent", label: "Urgent", color: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600" },
  { value: "soon", label: "Soon", color: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700" },
  { value: "minor", label: "Minor", color: "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700" },
];

const TIME_SLOTS = ["8–10 AM", "10 AM–12 PM", "2–4 PM", "4–6 PM"];

const getNextDays = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const Maintenance = () => {
  const { user } = useAuth();
  const [step, setStep] = useState("list"); // list, 1, 2, 3, confirm
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    category: "", urgency: "soon", room_number: user?.room_number || "",
    floor_number: user?.floor_number || "", description: "", photo_url: null,
    scheduled_date: "", time_slot: "", confirmed: false,
  });
  const [submittedTicket, setSubmittedTicket] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get("/maintenance");
      setTickets(data);
    } catch (e) { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setFormData((f) => ({ ...f, photo_url: reader.result }));
  };

  const handleSubmit = async () => {
    if (!formData.confirmed) { toast.error("Please confirm your availability"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/maintenance", {
        category: formData.category,
        description: formData.description,
        photo_url: formData.photo_url,
        room_number: formData.room_number,
        floor_number: formData.floor_number,
        urgency: formData.urgency,
        scheduled_date: formData.scheduled_date,
        time_slot: formData.time_slot,
      });
      setSubmittedTicket(data);
      setTickets((t) => [data, ...t]);
      setStep("confirm");
      toast.success("Maintenance request submitted!");
    } catch (e) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("list");
    setFormData({ category: "", urgency: "soon", room_number: user?.room_number || "",
      floor_number: user?.floor_number || "", description: "", photo_url: null,
      scheduled_date: "", time_slot: "", confirmed: false });
    setSubmittedTicket(null);
  };

  // Ticket Detail View
  if (selectedTicket) {
    const t = selectedTicket;
    return (
      <Layout title="Maintenance">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setSelectedTicket(null)} className="text-sm text-[#1D9E75] mb-4 flex items-center gap-1">
            ← Back
          </button>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit]">{t.category}</h2>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t.description || "No description"}</p>
            {t.photo_url && <img src={t.photo_url} alt="Issue" className="w-full h-48 object-cover rounded-xl mb-4" />}
            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div><span className="text-gray-400">Room</span><p className="font-medium dark:text-white">{t.room_number}</p></div>
              <div><span className="text-gray-400">Floor</span><p className="font-medium dark:text-white">{t.floor_number}</p></div>
              <div><span className="text-gray-400">Urgency</span><p className="font-medium capitalize dark:text-white">{t.urgency}</p></div>
              <div><span className="text-gray-400">Slot</span><p className="font-medium dark:text-white">{t.time_slot}</p></div>
            </div>
            <div className="mb-4 pb-4 border-b dark:border-[#313155]">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">Progress</p>
              <StatusTracker status={t.status} />
            </div>
            {t.warden_notes && (
              <div className="p-3 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-xl">
                <p className="text-xs font-semibold text-[#1D9E75] mb-1">Warden Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.warden_notes}</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Step: Confirmation screen
  if (step === "confirm" && submittedTicket) {
    return (
      <Layout title="Maintenance">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-2">Request Submitted!</h2>
          <p className="text-gray-500 mb-6">Your maintenance request has been logged.</p>
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-1">Ticket Number</p>
            <p className="font-mono text-lg font-bold text-[#1D9E75] mb-4">{submittedTicket.ticket_number}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div><p className="text-gray-400">Category</p><p className="font-medium dark:text-white">{submittedTicket.category}</p></div>
              <div><p className="text-gray-400">Urgency</p><p className="font-medium capitalize dark:text-white">{submittedTicket.urgency}</p></div>
              <div><p className="text-gray-400">Date</p><p className="font-medium dark:text-white">{submittedTicket.scheduled_date}</p></div>
              <div><p className="text-gray-400">Slot</p><p className="font-medium dark:text-white">{submittedTicket.time_slot}</p></div>
            </div>
            <StatusTracker status={submittedTicket.status} />
          </div>
          <button onClick={reset} className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold hover:bg-[#15825E] transition-colors">
            Back to Maintenance
          </button>
        </div>
      </Layout>
    );
  }

  // New request form steps
  if (step !== "list") {
    return (
      <Layout title="Maintenance">
        <div className="max-w-xl mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s ? "bg-[#1D9E75] text-white" : s < step ? "bg-[#1D9E75] text-white" : "bg-gray-200 dark:bg-[#313155] text-gray-500"
                }`}>
                  {s < step ? "✓" : s}
                </div>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {["Category", "Details", "Schedule"][s - 1]}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? "bg-[#1D9E75]" : "bg-gray-200 dark:bg-[#313155]"}`} />}
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6">
            {/* Step 1: Category */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">What needs fixing?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.map(({ name, icon: Icon, color }) => (
                    <button
                      key={name}
                      data-testid={`category-${name.toLowerCase()}`}
                      onClick={() => { setFormData((f) => ({ ...f, category: name })); setStep(2); }}
                      className={`p-4 rounded-xl border-2 text-center card-hover transition-all ${
                        formData.category === name ? "border-[#1D9E75]" : "border-gray-100 dark:border-[#313155]"
                      } bg-white dark:bg-[#1a1a2e]/50`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Details</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Photo (optional)</label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[#313155] rounded-xl p-4 cursor-pointer hover:border-[#1D9E75] transition-colors">
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="preview" className="h-24 object-contain rounded" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-xs">Upload photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                  <textarea
                    data-testid="description-input"
                    rows={3} placeholder="Describe the issue..."
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 focus:border-[#1D9E75]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Room No.</label>
                    <input
                      data-testid="room-input"
                      value={formData.room_number}
                      onChange={(e) => setFormData((f) => ({ ...f, room_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 focus:border-[#1D9E75]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Floor No.</label>
                    <input
                      data-testid="floor-input"
                      value={formData.floor_number}
                      onChange={(e) => setFormData((f) => ({ ...f, floor_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 focus:border-[#1D9E75]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Urgency</label>
                  <div className="flex gap-2">
                    {URGENCY.map(({ value, label, color }) => (
                      <button
                        key={value}
                        data-testid={`urgency-${value}`}
                        onClick={() => setFormData((f) => ({ ...f, urgency: value }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          formData.urgency === value ? color : "border-gray-200 dark:border-[#313155] text-gray-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#313155] text-gray-600 dark:text-gray-300 text-sm font-semibold">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#15825E] transition-colors">
                    Next <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Schedule a Visit</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Date</label>
                  <select
                    data-testid="date-select"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData((f) => ({ ...f, scheduled_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                  >
                    <option value="">Select a date</option>
                    {getNextDays().map((d) => (
                      <option key={d} value={d}>{new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Time Slot</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        data-testid={`slot-${slot.replace(/\s/g, "-")}`}
                        onClick={() => setFormData((f) => ({ ...f, time_slot: slot }))}
                        className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          formData.time_slot === slot
                            ? "border-[#1D9E75] bg-[#1D9E75]/5 text-[#1D9E75]"
                            : "border-gray-200 dark:border-[#313155] text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="confirm-availability"
                    checked={formData.confirmed}
                    onChange={(e) => setFormData((f) => ({ ...f, confirmed: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#1D9E75]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I confirm I will be available during the selected time slot
                  </span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#313155] text-gray-600 dark:text-gray-300 text-sm font-semibold">Back</button>
                  <button
                    data-testid="submit-maintenance"
                    onClick={handleSubmit}
                    disabled={!formData.scheduled_date || !formData.time_slot || submitting}
                    className="flex-1 py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#15825E] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // List view
  return (
    <Layout title="Maintenance">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Maintenance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and report hostel maintenance issues</p>
        </div>
        <button
          data-testid="new-request-btn"
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No maintenance requests yet</p>
          <p className="text-sm mt-1">Tap the button above to report an issue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              data-testid={`ticket-${t.id}`}
              onClick={() => setSelectedTicket(t)}
              className="card-hover bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-4 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  CATEGORIES.find((c) => c.name === t.category)?.color || "bg-gray-100 text-gray-500"
                }`}>
                  {(() => { const C = CATEGORIES.find((c) => c.name === t.category)?.icon || Wrench; return <C className="w-5 h-5" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{t.category}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-gray-400 truncate">{t.ticket_number} · Room {t.room_number} · {timeAgo(t.created_at)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Maintenance;
