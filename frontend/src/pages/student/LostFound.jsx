import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { toast } from "sonner";
import { Search, Plus, Package, MapPin, Clock, X, ImagePlus } from "lucide-react";

const LOCATIONS = ["Mess", "Floor 1", "Floor 2", "Floor 3", "Floor 4", "Bathroom", "Common Room", "Other"];

const LostFound = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("lost");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("lost");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    item_name: "", description: "", location: "", where_kept: "", date_reported: new Date().toISOString().split("T")[0], photo_url: null
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await api.get("/lost-found");
      setItems(data.filter((i) => i.status === "active"));
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setForm((f) => ({ ...f, photo_url: reader.result }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name || !form.location) { toast.error("Please fill in required fields"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/lost-found", { ...form, type: formType });
      setItems((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ item_name: "", description: "", location: "", where_kept: "", date_reported: new Date().toISOString().split("T")[0], photo_url: null });
      toast.success(`${formType === "lost" ? "Lost" : "Found"} item posted!`);
    } catch { toast.error("Failed to post item"); }
    finally { setSubmitting(false); }
  };

  const markResolved = async (id) => {
    try {
      await api.patch(`/lost-found/${id}`, { status: "resolved" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item marked as resolved!");
    } catch { toast.error("Failed to update"); }
  };

  const filtered = items.filter((i) => i.type === activeTab);

  return (
    <Layout title="Lost & Found">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Lost & Found</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Help each other find lost belongings</p>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="post-lost-btn"
            onClick={() => { setFormType("lost"); setShowForm(true); }}
            className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl border-2 border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> Lost
          </button>
          <button
            data-testid="post-found-btn"
            onClick={() => { setFormType("found"); setShowForm(true); }}
            className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-xl bg-[#1D9E75] text-white hover:bg-[#15825E] transition-colors"
          >
            <Plus className="w-4 h-4" /> Found
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#23233E] rounded-xl mb-6 w-fit">
        {[["lost", "Lost"], ["found", "Found"]].map(([val, label]) => (
          <button
            key={val}
            data-testid={`tab-${val}`}
            onClick={() => setActiveTab(val)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === val ? "bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {val === "lost" ? "Lost" : "Found"} ({items.filter((i) => i.type === val).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No {activeTab} items posted</p>
          <p className="text-sm mt-1">Be the first to post!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div key={item.id} data-testid={`item-${item.id}`}
              className="card-hover bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] overflow-hidden">
              <div className="h-40 bg-gray-100 dark:bg-[#1a1a2e] relative overflow-hidden">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.item_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.type === "lost" ? "bg-red-100 text-red-600" : "bg-[#1D9E75]/10 text-[#1D9E75]"
                }`}>
                  {item.type === "lost" ? "Lost" : "Found"}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.item_name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{item.description}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <MapPin className="w-3 h-3" /> {item.location}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                  <Clock className="w-3 h-3" /> {timeAgo(item.created_at)} · Floor {item.contact_floor}
                </div>
                {item.type === "found" && item.where_kept && (
                  <p className="text-xs text-[#1D9E75] mb-3">Kept at: {item.where_kept}</p>
                )}
                {item.student_id === user?.id ? (
                  <button
                    data-testid={`resolve-${item.id}`}
                    onClick={() => markResolved(item.id)}
                    className="w-full py-1.5 text-xs font-semibold rounded-lg border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75] hover:text-white transition-colors"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <button
                    data-testid={`contact-${item.id}`}
                    onClick={() => toast.info(`Contact the person on Floor ${item.contact_floor}`)}
                    className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      item.type === "found"
                        ? "bg-[#1D9E75] text-white hover:bg-[#15825E]"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {item.type === "found" ? "This is mine!" : "I found this!"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-[Outfit]">
                Post {formType === "lost" ? "Lost" : "Found"} Item
              </h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Item Name *</label>
                <input required value={form.item_name} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  data-testid="item-name-input"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                  placeholder="e.g. Blue water bottle"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                  placeholder="Describe the item..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Location *</label>
                <select required value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  data-testid="location-select"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                >
                  <option value="">Select location</option>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              {formType === "found" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Where is it kept?</label>
                  <input value={form.where_kept} onChange={(e) => setForm((f) => ({ ...f, where_kept: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                    placeholder="e.g. Warden office"
                  />
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[#313155] rounded-xl p-3 cursor-pointer hover:border-[#1D9E75] transition-colors">
                {form.photo_url ? <img src={form.photo_url} alt="" className="h-16 object-contain rounded" /> : (
                  <div className="text-center text-gray-400"><ImagePlus className="w-5 h-5 mx-auto mb-0.5" /><span className="text-xs">Add photo</span></div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <button type="submit" disabled={submitting} data-testid="submit-lf-btn"
                className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold text-sm hover:bg-[#15825E] transition-colors disabled:opacity-50">
                {submitting ? "Posting..." : `Post ${formType === "lost" ? "Lost" : "Found"} Item`}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LostFound;
