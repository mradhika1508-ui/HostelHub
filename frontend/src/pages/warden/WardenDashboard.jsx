import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { StatusBadge } from "../../components/StatusTracker";
import api from "../../api/axios";
import { timeAgo } from "../../utils/timeAgo";
import { toast } from "sonner";
import {
  Wrench, Search, UtensilsCrossed, AlertCircle, TrendingUp,
  X, ChevronRight, Check, BarChart2, Star, Package
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const STATUSES = ["submitted", "seen", "assigned", "in_progress", "resolved"];
const STATUS_LABELS = ["Submitted", "Seen", "Assigned", "In Progress", "Resolved"];
const PIE_COLORS = ["#1D9E75", "#F4A261", "#E63946"];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SummaryCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className={`bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-extrabold text-gray-900 dark:text-white font-[Outfit]">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const StatusDropdown = ({ current, onChange }) => (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value)}
    data-testid="status-dropdown"
    className="px-3 py-1.5 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
  >
    {STATUSES.map((s, i) => (
      <option key={s} value={s}>{STATUS_LABELS[i]}</option>
    ))}
  </select>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const OverviewTab = ({ data }) => {
  if (!data) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>;

  const TYPE_COLORS = {
    maintenance: "bg-orange-100 text-orange-600 dark:bg-orange-900/20",
    issue: "bg-purple-100 text-purple-600 dark:bg-purple-900/20",
    complaint: "bg-red-100 text-red-600 dark:bg-red-900/20",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="New Maintenance" value={data.new_maintenance} icon={Wrench}
          color="bg-orange-50 dark:bg-orange-900/20 text-orange-500" sub="Awaiting review" />
        <SummaryCard title="Open Issues" value={data.open_issues} icon={AlertCircle}
          color="bg-purple-50 dark:bg-purple-900/20 text-purple-500" sub="Not yet resolved" />
        <SummaryCard title="Urgent Flags" value={data.urgent_flags} icon={TrendingUp}
          color="bg-red-50 dark:bg-red-900/20 text-red-500" sub="Needs attention" />
        <SummaryCard title="Mess Score Today" value={`${data.mess_score}%`} icon={UtensilsCrossed}
          color="bg-[#1D9E75]/10 text-[#1D9E75]" sub="Student satisfaction" />
      </div>

      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Recent Activity</h3>
        {data.recent_activity?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {data.recent_activity?.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a2e]/50">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${TYPE_COLORS[item.item_type] || "bg-gray-100"}`}>
                  {item.item_type === "maintenance" ? <Wrench className="w-4 h-4" /> :
                   item.item_type === "issue" ? <AlertCircle className="w-4 h-4" /> :
                   <UtensilsCrossed className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.category} — {item.student_name}
                  </p>
                  <p className="text-xs text-gray-400">{item.ticket_number || item.id?.slice(0, 8)} · {timeAgo(item.created_at)}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MaintenanceTab = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState({ status: "", urgency: "", category: "" });

  useEffect(() => {
    api.get("/maintenance").then((r) => setTickets(r.data)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/maintenance/${id}/status`, { status, warden_notes: notes });
      setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status, warden_notes: notes } : t));
      setSelected((s) => s ? { ...s, status, warden_notes: notes } : null);
      toast.success("Status updated!");
    } catch { toast.error("Failed to update"); }
  };

  const filtered = tickets.filter((t) =>
    (!filter.status || t.status === filter.status) &&
    (!filter.urgency || t.urgency === filter.urgency) &&
    (!filter.category || t.category === filter.category)
  );

  const URGENCY_COLORS = { urgent: "text-red-500", soon: "text-yellow-500", minor: "text-green-500" };

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex-1 min-w-0 ${selected ? "hidden lg:block" : ""}`}>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "status", options: ["", ...STATUSES], labels: ["All Status", ...STATUS_LABELS] },
            { key: "urgency", options: ["", "urgent", "soon", "minor"], labels: ["All Urgency", "Urgent", "Soon", "Minor"] },
          ].map(({ key, options, labels }) => (
            <select key={key} value={filter[key]}
              onChange={(e) => setFilter((f) => ({ ...f, [key]: e.target.value }))}
              data-testid={`filter-${key}`}
              className="px-3 py-1.5 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#23233E] text-gray-700 dark:text-gray-300 text-sm focus:outline-none">
              {options.map((o, i) => <option key={o} value={o}>{labels[i]}</option>)}
            </select>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a2e]/50">
                <tr>
                  {["Ticket", "Student", "Category", "Urgency", "Slot", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#313155]">
                {filtered.map((t) => (
                  <tr key={t.id} data-testid={`warden-ticket-${t.id}`}
                    onClick={() => { setSelected(t); setNotes(t.warden_notes || ""); }}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a2e]/50 transition-colors ${selected?.id === t.id ? "bg-[#1D9E75]/5 dark:bg-[#1D9E75]/5" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{t.ticket_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{t.student_name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.category}</td>
                    <td className={`px-4 py-3 font-semibold capitalize ${URGENCY_COLORS[t.urgency]}`}>{t.urgency}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{t.time_slot}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No tickets found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selected && (
        <div className="w-full lg:w-96 bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit]">Ticket Details</h3>
            <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="space-y-3 text-sm">
            <div><p className="text-gray-400 text-xs">Ticket</p><p className="font-mono font-bold text-[#1D9E75]">{selected.ticket_number}</p></div>
            <div><p className="text-gray-400 text-xs">Student</p><p className="font-medium dark:text-white">{selected.student_name}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-400 text-xs">Category</p><p className="font-medium dark:text-white">{selected.category}</p></div>
              <div><p className="text-gray-400 text-xs">Room</p><p className="font-medium dark:text-white">{selected.room_number} / Floor {selected.floor_number}</p></div>
            </div>
            <div><p className="text-gray-400 text-xs">Description</p><p className="dark:text-gray-300 leading-relaxed">{selected.description || "—"}</p></div>
            {selected.photo_url && <img src={selected.photo_url} alt="Issue" className="w-full h-36 object-cover rounded-xl" />}
            <div className="pt-3 border-t dark:border-[#313155]">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Update Status</p>
              <StatusDropdown current={selected.status} onChange={(s) => setSelected((t) => ({ ...t, status: s }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Warden Notes</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                data-testid="warden-notes-input"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                placeholder="Add notes for the student..." />
            </div>
            <button data-testid="save-status-btn"
              onClick={() => updateStatus(selected.id, selected.status)}
              className="w-full py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LostFoundTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/lost-found").then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  const resolve = async (id) => {
    await api.patch(`/lost-found/${id}`, { status: "resolved" });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "resolved" } : i));
    toast.success("Marked as resolved");
  };

  const active = items.filter((i) => i.status === "active");

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
        ) : active.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>No active lost/found items</p>
          </div>
        ) : active.map((item) => (
          <div key={item.id} data-testid={`warden-lf-${item.id}`}
            className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] overflow-hidden">
            <div className="h-36 bg-gray-100 dark:bg-[#1a1a2e] relative">
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.item_name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full"><Package className="w-10 h-10 text-gray-300" /></div>
              )}
              <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "lost" ? "bg-red-100 text-red-600" : "bg-[#1D9E75]/10 text-[#1D9E75]"}`}>
                {item.type}
              </span>
            </div>
            <div className="p-4">
              <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.item_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.location} · Floor {item.contact_floor} · {timeAgo(item.created_at)}</p>
              <button onClick={() => resolve(item.id)} data-testid={`warden-resolve-lf-${item.id}`}
                className="w-full py-1.5 text-xs font-semibold rounded-lg bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75] hover:text-white transition-colors">
                Mark Resolved
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessTab = () => {
  const [menu, setMenu] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [editMenu, setEditMenu] = useState(false);
  const [menuForm, setMenuForm] = useState({ breakfast: "", lunch: "", snacks: "", dinner: "" });
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      api.get("/mess/menu").then((r) => { setMenu(r.data); setMenuForm(r.data || {}); }),
      api.get("/mess/ratings").then((r) => setRatings(r.data)),
      api.get("/mess/complaints").then((r) => setComplaints(r.data)),
    ]);
  }, []);

  const saveMenu = async () => {
    try {
      await api.put("/mess/menu", { ...menuForm, date: today });
      setMenu({ ...menuForm, date: today });
      setEditMenu(false);
      toast.success("Menu updated!");
    } catch { toast.error("Failed to update menu"); }
  };

  const updateComplaintStatus = async (id, status) => {
    await api.patch(`/mess/complaints/${id}/status`, { status });
    setComplaints((cs) => cs.map((c) => c.id === id ? { ...c, status } : c));
    toast.success("Status updated");
  };

  const ratingData = [
    { name: "Loved", value: ratings.filter((r) => r.rating === "loved").length },
    { name: "Okay", value: ratings.filter((r) => r.rating === "okay").length },
    { name: "Disliked", value: ratings.filter((r) => r.rating === "disliked").length },
  ];

  const MEAL_ICONS = { breakfast: "🍳", lunch: "🍛", snacks: "🫖", dinner: "🌙" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu Editor */}
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit]">Today's Menu</h3>
            <button data-testid="edit-menu-btn" onClick={() => setEditMenu(!editMenu)}
              className="text-sm text-[#1D9E75] font-medium hover:underline">
              {editMenu ? "Cancel" : "Edit"}
            </button>
          </div>
          {editMenu ? (
            <div className="space-y-3">
              {["breakfast", "lunch", "snacks", "dinner"].map((meal) => (
                <div key={meal}>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{MEAL_ICONS[meal]} {meal}</label>
                  <input value={menuForm[meal] || ""}
                    onChange={(e) => setMenuForm((f) => ({ ...f, [meal]: e.target.value }))}
                    data-testid={`menu-${meal}-input`}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl text-sm bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                  />
                </div>
              ))}
              <button data-testid="save-menu-btn" onClick={saveMenu}
                className="w-full py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold">
                Save Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {menu && ["breakfast", "lunch", "snacks", "dinner"].map((meal) => (
                <div key={meal} className="flex gap-3">
                  <span className="text-xl">{MEAL_ICONS[meal]}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">{meal}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{menu[meal] || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ratings Pie */}
        <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
          <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Rating Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={ratingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {ratingData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-2">Based on {ratings.length} total ratings this week</p>
        </div>
      </div>

      {/* Complaints */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Mess Complaints</h3>
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No complaints</p>
          ) : complaints.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a2e]/50">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{c.category} — {c.meal_type}</p>
                <p className="text-xs text-gray-400 truncate">{c.description}</p>
                <p className="text-xs text-gray-400">{c.student_name} · {timeAgo(c.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                <select value={c.status}
                  onChange={(e) => updateComplaintStatus(c.id, e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-200 dark:border-[#313155] rounded-lg bg-white dark:bg-[#1a1a2e] dark:text-white focus:outline-none">
                  {STATUSES.map((s, i) => <option key={s} value={s}>{STATUS_LABELS[i]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const OtherIssuesTab = () => {
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/issues").then((r) => setIssues(r.data)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/issues/${id}/status`, { status, warden_notes: notes });
    setIssues((is) => is.map((i) => i.id === id ? { ...i, status, warden_notes: notes } : i));
    setSelected((s) => s ? { ...s, status, warden_notes: notes } : null);
    toast.success("Updated!");
  };

  const URGENCY_COLORS = { urgent: "text-red-500", soon: "text-yellow-500", minor: "text-green-500" };

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selected ? "hidden lg:block" : ""}`}>
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a2e]/50">
                <tr>{["Ticket", "Student", "Category", "Urgency", "Anon", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#313155]">
                {issues.map((i) => (
                  <tr key={i.id} data-testid={`warden-issue-${i.id}`}
                    onClick={() => { setSelected(i); setNotes(i.warden_notes || ""); }}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a2e]/50 transition-colors ${selected?.id === i.id ? "bg-[#1D9E75]/5" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{i.ticket_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{i.student_name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{i.category}</td>
                    <td className={`px-4 py-3 font-semibold capitalize ${URGENCY_COLORS[i.urgency]}`}>{i.urgency}</td>
                    <td className="px-4 py-3 text-center">{i.anonymous ? "✓" : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No issues found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="w-full lg:w-96 bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5 flex-shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit]">Issue Details</h3>
            <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="space-y-3 text-sm">
            <div><p className="text-gray-400 text-xs">Ticket</p><p className="font-mono font-bold text-[#1D9E75]">{selected.ticket_number}</p></div>
            <div><p className="text-gray-400 text-xs">Reported by</p>
              <p className="font-medium dark:text-white">{selected.student_name}</p>
              {selected.anonymous && <span className="text-xs text-gray-400">Anonymous submission</span>}
            </div>
            <div><p className="text-gray-400 text-xs">Category</p><p className="font-medium dark:text-white">{selected.category}</p></div>
            <div><p className="text-gray-400 text-xs">Description</p><p className="dark:text-gray-300 leading-relaxed">{selected.description}</p></div>
            {selected.photo_url && <img src={selected.photo_url} alt="Issue" className="w-full h-36 object-cover rounded-xl" />}
            <div className="pt-3 border-t dark:border-[#313155]">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Update Status</p>
              <StatusDropdown current={selected.status} onChange={(s) => setSelected((i) => ({ ...i, status: s }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Warden Notes</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50" />
            </div>
            <button onClick={() => updateStatus(selected.id, selected.status)}
              className="w-full py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const chartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#313155" },
    xAxisStyle: { fontSize: 11 },
    tooltip: { contentStyle: { background: "#23233E", border: "1px solid #313155", borderRadius: 12, color: "#fff", fontSize: 12 } },
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Health Score */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Weekly Hostel Health Score</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.weekly_health_scores || []}>
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis dataKey="day" tick={chartProps.xAxisStyle} />
            <YAxis domain={[0, 100]} tick={chartProps.xAxisStyle} />
            <Tooltip {...chartProps.tooltip} />
            <Line type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={2.5} dot={{ fill: "#1D9E75", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Issue Categories</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data?.category_distribution || []} layout="vertical">
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis type="number" tick={chartProps.xAxisStyle} />
            <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 10 }} />
            <Tooltip {...chartProps.tooltip} />
            <Bar dataKey="count" fill="#1D9E75" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mess Rating Trend */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Mess Rating Trend (7 days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.mess_rating_trend || []}>
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis dataKey="day" tick={chartProps.xAxisStyle} />
            <YAxis tick={chartProps.xAxisStyle} />
            <Tooltip {...chartProps.tooltip} />
            <Line type="monotone" dataKey="loved" stroke="#1D9E75" strokeWidth={2} dot={false} name="Loved" />
            <Line type="monotone" dataKey="okay" stroke="#F4A261" strokeWidth={2} dot={false} name="Okay" />
            <Line type="monotone" dataKey="disliked" stroke="#E63946" strokeWidth={2} dot={false} name="Disliked" />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resolution Time */}
      <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5">
        <h3 className="font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Avg. Resolution Time (days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data?.resolution_times || []}>
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} />
            <YAxis tick={chartProps.xAxisStyle} />
            <Tooltip {...chartProps.tooltip} />
            <Bar dataKey="avg_days" fill="#1D9E75" radius={[6, 6, 0, 0]} name="Avg Days" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Main Warden Dashboard ────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "lostfound", label: "Lost & Found", icon: Search },
  { id: "mess", label: "Mess", icon: UtensilsCrossed },
  { id: "issues", label: "Other Issues", icon: AlertCircle },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
];

const WardenDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/overview").then((r) => setOverviewData(r.data)).catch(console.error);
  }, []);

  return (
    <Layout title="Warden Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Warden Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage all hostel operations from here</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`warden-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-[#1D9E75] text-white shadow-sm"
                : "bg-white dark:bg-[#23233E] text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-[#313155] hover:border-[#1D9E75]/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={overviewData} />}
      {activeTab === "maintenance" && <MaintenanceTab />}
      {activeTab === "lostfound" && <LostFoundTab />}
      {activeTab === "mess" && <MessTab />}
      {activeTab === "issues" && <OtherIssuesTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
    </Layout>
  );
};

export default WardenDashboard;
