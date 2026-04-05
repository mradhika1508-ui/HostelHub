import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { timeAgo } from "../../utils/timeAgo";
import { toast } from "sonner";
import { Star, TrendingUp, AlertTriangle, Plus, X } from "lucide-react";
const MEAL_ICONS = { breakfast: "🍳", lunch: "🍛", snacks: "🫖", dinner: "🌙" };
const MEALS = ["breakfast", "lunch", "snacks", "dinner"];
const NEGATIVE_REASONS = ["Too spicy", "Not fresh", "Less quantity", "Tasteless", "Other"];
const COMPLAINT_CATEGORIES = ["Hygiene", "Food quality", "Timing", "Staff behaviour", "Quantity", "Other"];

const MessCorner = () => {
  const [menu, setMenu] = useState(null);
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(null); // meal type
  const [ratingForm, setRatingForm] = useState({ rating: "", negative_reasons: [] });
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    category: "", description: "", meal_type: "lunch",
    date: new Date().toISOString().split("T")[0], photo_url: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [menuRes, statsRes, ratingsRes] = await Promise.all([
        api.get("/mess/menu"),
        api.get("/mess/stats"),
        api.get("/mess/ratings"),
      ]);
      setMenu(menuRes.data);
      setStats(statsRes.data);
      setRatings(ratingsRes.data);
    } catch { toast.error("Failed to load mess data"); }
    finally { setLoading(false); }
  };

  const submitRating = async () => {
    if (!ratingForm.rating) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    try {
      await api.post("/mess/rating", {
        meal_type: ratingModal,
        date: new Date().toISOString().split("T")[0],
        rating: ratingForm.rating,
        negative_reasons: ratingForm.negative_reasons,
      });
      toast.success("Rating submitted! Thank you.");
      setRatingModal(null);
      setRatingForm({ rating: "", negative_reasons: [] });
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit rating");
    } finally { setSubmitting(false); }
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.category || !complaintForm.description) { toast.error("Please fill all fields"); return; }
    setSubmitting(true);
    try {
      await api.post("/mess/complaint", complaintForm);
      toast.success("Complaint submitted successfully!");
      setShowComplaintForm(false);
      setComplaintForm({ category: "", description: "", meal_type: "lunch", date: new Date().toISOString().split("T")[0], photo_url: null });
    } catch { toast.error("Failed to submit complaint"); }
    finally { setSubmitting(false); }
  };

  const getRatedMeals = () => ratings.map((r) => r.meal_type);

  const EMOJI_OPTIONS = [
    { value: "loved", emoji: "😍", label: "Loved it" },
    { value: "okay", emoji: "😐", label: "Okay" },
    { value: "disliked", emoji: "😤", label: "Didn't like it" },
  ];

  if (loading) return (
    <Layout title="Mess Corner">
      <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" /></div>
    </Layout>
  );

  return (
    <Layout title="Mess Corner">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-[Outfit]">Mess Corner</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Today's menu, ratings & complaints</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Menu + Ratings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Menu */}
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6" data-testid="mess-menu-section">
            <h2 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">Today's Menu</h2>
            {!menu ? (
              <p className="text-sm text-gray-400 text-center py-4">Menu not available</p>
            ) : (
              <div className="space-y-4">
                {MEALS.map((meal) => {
                  const alreadyRated = getRatedMeals().includes(meal);
                  return (
                    <div key={meal} className="flex items-start gap-4 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a2e]/50">
                      <span className="text-2xl">{MEAL_ICONS[meal]}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{meal}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{menu[meal] || "—"}</p>
                      </div>
                      <button
                        data-testid={`rate-${meal}-btn`}
                        onClick={() => !alreadyRated && setRatingModal(meal)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          alreadyRated
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default"
                            : "bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75] hover:text-white"
                        }`}
                      >
                        {alreadyRated ? "Rated" : "Rate"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complaint Form */}
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit]">File a Complaint</h2>
              {!showComplaintForm && (
                <button
                  data-testid="open-complaint-form"
                  onClick={() => setShowComplaintForm(true)}
                  className="flex items-center gap-1 text-sm text-[#1D9E75] font-medium hover:underline"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              )}
            </div>
            {showComplaintForm && (
              <form onSubmit={submitComplaint} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                  <select required value={complaintForm.category}
                    onChange={(e) => setComplaintForm((f) => ({ ...f, category: e.target.value }))}
                    data-testid="complaint-category"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50">
                    <option value="">Select category</option>
                    {COMPLAINT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Meal</label>
                    <select value={complaintForm.meal_type}
                      onChange={(e) => setComplaintForm((f) => ({ ...f, meal_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50">
                      {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Date</label>
                    <input type="date" value={complaintForm.date}
                      onChange={(e) => setComplaintForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                  <textarea required rows={3} value={complaintForm.description}
                    onChange={(e) => setComplaintForm((f) => ({ ...f, description: e.target.value }))}
                    data-testid="complaint-description"
                    placeholder="Describe the issue in detail..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#313155] rounded-xl bg-white dark:bg-[#1a1a2e]/50 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowComplaintForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-[#313155] rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} data-testid="submit-complaint-btn"
                    className="flex-1 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#15825E] transition-colors disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit Complaint"}
                  </button>
                </div>
              </form>
            )}
            {!showComplaintForm && <p className="text-sm text-gray-400 text-center py-2">Click "New" to file a mess complaint</p>}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] p-5" data-testid="mess-stats">
            <h2 className="text-base font-bold text-gray-900 dark:text-white font-[Outfit] mb-4">This Week's Stats</h2>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`w-5 h-5 ${i <= Math.round((stats?.health_score || 0) / 20) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white font-[Outfit] mt-1">{stats?.health_score || 0}%</p>
              <p className="text-xs text-gray-400">Average satisfaction</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { emoji: "😍", label: "Loved", count: stats?.rating_counts?.loved || 0, color: "bg-green-50 dark:bg-green-900/20" },
                { emoji: "😐", label: "Okay", count: stats?.rating_counts?.okay || 0, color: "bg-yellow-50 dark:bg-yellow-900/20" },
                { emoji: "😤", label: "Disliked", count: stats?.rating_counts?.disliked || 0, color: "bg-red-50 dark:bg-red-900/20" },
              ].map(({ emoji, label, count, color }) => (
                <div key={label} className={`${color} rounded-xl p-3 text-center`}>
                  <p className="text-xl">{emoji}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {stats?.best_meal && (
              <div className="p-3 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10 rounded-xl mb-2">
                <p className="text-xs text-gray-400 mb-0.5">Most loved meal</p>
                <p className="text-sm font-semibold text-[#1D9E75] capitalize">{MEAL_ICONS[stats.best_meal]} {stats.best_meal}</p>
              </div>
            )}
            {stats?.worst_meal && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Most complaints</p>
                <p className="text-sm font-semibold text-red-500 capitalize">{MEAL_ICONS[stats.worst_meal]} {stats.worst_meal}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23233E] rounded-2xl border border-gray-100 dark:border-[#313155] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-[Outfit]">
                Rate {ratingModal.charAt(0).toUpperCase() + ratingModal.slice(1)}
              </h3>
              <button onClick={() => { setRatingModal(null); setRatingForm({ rating: "", negative_reasons: [] }); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex justify-center gap-4 mb-6">
              {EMOJI_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  data-testid={`rating-${value}`}
                  onClick={() => setRatingForm((f) => ({ ...f, rating: value, negative_reasons: [] }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    ratingForm.rating === value ? "border-[#1D9E75] bg-[#1D9E75]/5 scale-110" : "border-gray-200 dark:border-[#313155]"
                  }`}
                  style={{ transition: "transform 0.2s ease, border-color 0.2s ease" }}
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                </button>
              ))}
            </div>

            {ratingForm.rating === "disliked" && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">What went wrong? (select all that apply)</p>
                <div className="flex flex-wrap gap-2">
                  {NEGATIVE_REASONS.map((r) => (
                    <button key={r}
                      onClick={() => setRatingForm((f) => ({
                        ...f,
                        negative_reasons: f.negative_reasons.includes(r)
                          ? f.negative_reasons.filter((x) => x !== r)
                          : [...f.negative_reasons, r]
                      }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        ratingForm.negative_reasons.includes(r)
                          ? "border-red-400 bg-red-50 text-red-600"
                          : "border-gray-200 dark:border-[#313155] text-gray-500"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={submitRating} disabled={!ratingForm.rating || submitting}
              data-testid="submit-rating-btn"
              className="w-full py-3 bg-[#1D9E75] text-white rounded-xl font-semibold text-sm hover:bg-[#15825E] transition-colors disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MessCorner;
