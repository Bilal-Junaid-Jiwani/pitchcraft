import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { motion, AnimatePresence } from "framer-motion"

export default function MyPitches({ user }) {
  const [pitches, setPitches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPitch, setSelectedPitch] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterIndustry, setFilterIndustry] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  // 🔹 Fetch user pitches from Supabase
  useEffect(() => {
    async function fetchPitches() {
      setLoading(true)
      const { data, error } = await supabase
        .from("pitches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error fetching pitches:", error)
        showNotification("❌ Failed to load pitches", "error")
      } else {
        setPitches(data)
      }
      setLoading(false)
    }

    fetchPitches()
  }, [user.id])

  // 🔹 Delete pitch
  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this pitch?")) return
    const { error } = await supabase.from("pitches").delete().eq("id", id)
    if (error) {
      console.error("❌ Delete Error:", error)
      showNotification("❌ Failed to delete pitch", "error")
    } else {
      setPitches(pitches.filter((p) => p.id !== id))
      showNotification("✅ Pitch deleted successfully!", "success")
      setSelectedPitch(null)
    }
  }

  // 🔹 Filter and sort pitches
  const filteredPitches = pitches
    .filter(pitch => {
      const matchesSearch = pitch.generated_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pitch.generated_data?.tagline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pitch.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesIndustry = filterIndustry === "all" || pitch.industry === filterIndustry
      
      return matchesSearch && matchesIndustry
    })
    .sort((a, b) => {
      switch(sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at)
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at)
        case "name":
          return a.generated_data?.name?.localeCompare(b.generated_data?.name)
        default:
          return 0
      }
    })

  // 🔹 Get unique industries for filter
  const industries = ["all", ...new Set(pitches.map(p => p.industry).filter(Boolean))]

  // 🔹 Notification function
  const showNotification = (message, type) => {
    const el = document.createElement("div")
    el.className = `fixed top-4 right-4 px-6 py-3 rounded-xl shadow-2xl z-50 font-semibold backdrop-blur-sm border ${
      type === "success" 
        ? "bg-green-500/90 text-white border-green-400" 
        : "bg-red-500/90 text-white border-red-400"
    }`
    el.innerText = message
    document.body.appendChild(el)
    setTimeout(() => {
      el.style.opacity = "0"
      el.style.transform = "translateX(100%)"
      setTimeout(() => el.remove(), 300)
    }, 3000)
  }

  // 🔹 Preview landing page
  const previewLandingPage = (pitch) => {
    if (!pitch.landing_code) {
      showNotification("❌ No landing page code available", "error")
      return
    }
    
    const blob = new Blob([pitch.landing_code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600 text-lg">Loading your pitches...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8"
        >
          <div className="flex items-center space-x-4 mb-6 lg:mb-0">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-2xl"
            >
              <span className="text-white text-2xl">📋</span>
            </motion.div>
            <div>
              <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                My Pitches
              </h1>
              <p className="text-gray-600">Manage and review your generated startup pitches</p>
            </div>
          </div>
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/40 shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Total Pitches:</span>
              <span className="font-bold text-blue-600 text-xl">{pitches.length}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-lg border border-white/40"
        >
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Search Pitches</label>
              <input
                type="text"
                placeholder="Search by name, tagline, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
              />
            </div>

            {/* Industry Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🏢 Filter by Industry</label>
              <select
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
              >
                {industries.map(industry => (
                  <option key={industry} value={industry}>
                    {industry === "all" ? "All Industries" : industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        {searchTerm || filterIndustry !== "all" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 text-center"
          >
            <p className="text-gray-600">
              Showing {filteredPitches.length} of {pitches.length} pitches
              {searchTerm && ` for "${searchTerm}"`}
              {filterIndustry !== "all" && ` in ${filterIndustry}`}
            </p>
          </motion.div>
        ) : null}

        {/* Pitches Grid */}
        {filteredPitches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-12 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">💡</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">No Pitches Found</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {pitches.length === 0 
                ? "You haven't generated any startup pitches yet. Create your first pitch to see it here!"
                : "No pitches match your search criteria. Try adjusting your filters."
              }
            </p>
            {pitches.length === 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.hash = "#generate"}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Create Your First Pitch
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredPitches.map((pitch, index) => (
              <PitchCard 
                key={pitch.id} 
                pitch={pitch} 
                index={index}
                onView={() => setSelectedPitch(pitch)}
                onDelete={() => handleDelete(pitch.id)}
                onPreview={() => previewLandingPage(pitch)}
              />
            ))}
          </motion.div>
        )}

        {/* Pitch Detail Modal */}
        <AnimatePresence>
          {selectedPitch && (
            <PitchModal 
              pitch={selectedPitch} 
              onClose={() => setSelectedPitch(null)}
              onDelete={() => handleDelete(selectedPitch.id)}
              onPreview={() => previewLandingPage(selectedPitch)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Enhanced Pitch Card Component
function PitchCard({ pitch, index, onView, onDelete, onPreview }) {
  const data = pitch.generated_data
  const createdDate = new Date(pitch.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden"
    >
      <div 
        className="p-6"
        onClick={onView}
      >
        {/* Header with gradient */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 mb-2">{data.name}</h3>
            <p className="text-gray-600 text-sm line-clamp-2 italic">{data.tagline}</p>
          </div>
          <motion.span 
            whileHover={{ scale: 1.1 }}
            className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap ml-2"
          >
            {createdDate}
          </motion.span>
        </div>
        
        {/* Industry and Stats */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {pitch.industry || "General"}
          </span>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>🎯 {data.target_audience?.segments?.length || 0} segments</span>
            <span>🎨 {data.colors ? Object.keys(data.colors).length : 0} colors</span>
          </div>
        </div>

        {/* Preview snippet */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200">
          <p className="text-gray-600 text-sm line-clamp-3">{data.elevator_pitch}</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50/50">
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 transition-colors"
              title="Preview Landing Page"
            >
              <span>👁️</span>
              <span>Preview</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
              className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1 transition-colors"
            >
              <span>📊</span>
              <span>Details</span>
            </motion.button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
            title="Delete Pitch"
          >
            🗑️ Delete
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Enhanced Pitch Modal Component
function PitchModal({ pitch, onClose, onDelete, onPreview }) {
  const d = pitch.generated_data

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-black mb-2">{d.name}</h2>
              <p className="text-blue-100 text-xl italic mb-4">{d.tagline}</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  🏢 {pitch.industry || "General"}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  📅 {new Date(pitch.created_at).toLocaleDateString()}
                </span>
                {d.target_audience?.segments && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    🎯 {d.target_audience.segments.length} segments
                  </span>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors text-xl"
            >
              ✕
            </motion.button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Elevator Pitch */}
          <section>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
              <span className="text-3xl">🎯</span>
              <span>Elevator Pitch</span>
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <p className="text-gray-700 text-lg leading-relaxed">{d.elevator_pitch}</p>
            </div>
          </section>

          {/* Problem & Solution */}
          <div className="grid lg:grid-cols-2 gap-8">
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                <span className="text-3xl">🧩</span>
                <span>The Problem</span>
              </h3>
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border border-red-100 h-full">
                <p className="text-gray-700 leading-relaxed">{d.problem}</p>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                <span className="text-3xl">💡</span>
                <span>Our Solution</span>
              </h3>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 h-full">
                <p className="text-gray-700 leading-relaxed">{d.solution}</p>
              </div>
            </section>
          </div>

          {/* Unique Value Proposition */}
          {d.unique_value_proposition && (
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                <span className="text-3xl">💎</span>
                <span>Unique Value Proposition</span>
              </h3>
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
                <p className="text-gray-700 text-lg font-semibold">{d.unique_value_proposition}</p>
              </div>
            </section>
          )}

          {/* Target Audience */}
          {d.target_audience && (
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                <span className="text-3xl">🎯</span>
                <span>Target Audience</span>
              </h3>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <p className="text-gray-700 mb-4 text-lg">{d.target_audience.description}</p>
                {Array.isArray(d.target_audience.segments) && (
                  <div className="flex flex-wrap gap-3">
                    {d.target_audience.segments.map((seg, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-indigo-500 text-white px-4 py-2 rounded-full font-medium shadow-lg"
                      >
                        {seg}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Branding Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Colors */}
            {d.colors && (
              <section>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                  <span className="text-3xl">🎨</span>
                  <span>Color Palette</span>
                </h3>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(d.colors).map(([name, color]) => (
                      <div key={name} className="text-center">
                        <div
                          className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white mx-auto mb-2"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-semibold text-gray-700 capitalize">{name}</p>
                        <p className="text-xs text-gray-500 font-mono">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Logo Ideas */}
            {d.logo_ideas && (
              <section>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                  <span className="text-3xl">🚀</span>
                  <span>Logo Concepts</span>
                </h3>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <ul className="space-y-3">
                    {d.logo_ideas.map((idea, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center space-x-3 bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100"
                      >
                        <span className="text-orange-500 text-xl">✦</span>
                        <span className="text-gray-700">{idea}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          {/* Landing Copy */}
          {d.landing_copy && (
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
                <span className="text-3xl">🌐</span>
                <span>Landing Page Copy</span>
              </h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-purple-700 mb-2">Headline</p>
                  <p className="text-2xl font-bold text-gray-800">{d.landing_copy.headline}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-700 mb-2">Subheadline</p>
                  <p className="text-lg text-gray-700">{d.landing_copy.subheadline}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-700 mb-2">Call to Action</p>
                  <p className="text-xl text-blue-600 font-semibold">{d.landing_copy.call_to_action}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPreview}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <span>👁️</span>
                <span>Preview Landing Page</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (pitch.landing_code) {
                    navigator.clipboard.writeText(pitch.landing_code)
                    const el = document.createElement("div")
                    el.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50"
                    el.innerText = "✅ Code copied to clipboard!"
                    document.body.appendChild(el)
                    setTimeout(() => el.remove(), 3000)
                  }
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Copy Code</span>
              </motion.button>
            </div>
            
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDelete}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <span>🗑️</span>
                <span>Delete Pitch</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Close
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}