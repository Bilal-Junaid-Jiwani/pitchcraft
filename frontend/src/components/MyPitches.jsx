import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function MyPitches({ user }) {
  const [pitches, setPitches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPitch, setSelectedPitch] = useState(null)

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
    } else {
      setPitches(pitches.filter((p) => p.id !== id))
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50"
      notification.innerHTML = "✅ Pitch deleted successfully!"
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading your pitches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">📋</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Pitches</h2>
            <p className="text-gray-600">Manage and review your generated startup pitches</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200">
          <span className="text-sm text-gray-600">Total: </span>
          <span className="font-semibold text-blue-600">{pitches.length}</span>
        </div>
      </div>

      {/* Pitches Grid */}
      {pitches.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">💡</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-3">No Pitches Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            You haven't generated any startup pitches yet. Create your first pitch to see it here!
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {pitches.map((pitch) => (
            <PitchCard 
              key={pitch.id} 
              pitch={pitch} 
              onView={() => setSelectedPitch(pitch)}
              onDelete={() => handleDelete(pitch.id)}
            />
          ))}
        </div>
      )}

      {/* Pitch Detail Modal */}
      {selectedPitch && (
        <PitchModal 
          pitch={selectedPitch} 
          onClose={() => setSelectedPitch(null)}
          onDelete={() => handleDelete(selectedPitch.id)}
        />
      )}
    </div>
  )
}

// Pitch Card Component
function PitchCard({ pitch, onView, onDelete }) {
  const data = pitch.generated_data
  const createdDate = new Date(pitch.created_at).toLocaleDateString()

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
      <div 
        className="p-6"
        onClick={onView}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{data.name}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {createdDate}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{data.tagline}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {pitch.industry}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Details →
            </button>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50/50 rounded-b-2xl">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
        >
          Delete Pitch
        </button>
      </div>
    </div>
  )
}

// Pitch Modal Component
function PitchModal({ pitch, onClose, onDelete }) {
  const d = pitch.generated_data

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{d.name}</h2>
              <p className="text-blue-100 italic">{d.tagline}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Elevator Pitch */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Elevator Pitch</h3>
            <p className="text-gray-700 bg-gray-50 rounded-xl p-4">{d.elevator_pitch}</p>
          </section>

          {/* Problem & Solution */}
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span>🧩</span>
                <span>Problem</span>
              </h3>
              <p className="text-gray-700 bg-red-50 rounded-xl p-4">{d.problem}</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span>💡</span>
                <span>Solution</span>
              </h3>
              <p className="text-gray-700 bg-green-50 rounded-xl p-4">{d.solution}</p>
            </section>
          </div>

          {/* Target Audience */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <span>🎯</span>
              <span>Target Audience</span>
            </h3>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-gray-700 mb-3">{d.target_audience?.description}</p>
              {Array.isArray(d.target_audience?.segments) && (
                <div className="flex flex-wrap gap-2">
                  {d.target_audience.segments.map((seg, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {seg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Logo Ideas */}
          {d.logo_ideas && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span>🔥</span>
                <span>Logo Concepts</span>
              </h3>
              <div className="grid gap-2">
                {d.logo_ideas.map((idea, i) => (
                  <div key={i} className="flex items-center space-x-3 bg-orange-50 rounded-xl p-4">
                    <span className="text-orange-500">•</span>
                    <p className="text-gray-700">{idea}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Colors */}
          {d.colors && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span>🎨</span>
                <span>Color Palette</span>
              </h3>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(d.colors).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-white shadow-lg mb-2"
                      style={{ backgroundColor: color }}
                    ></div>
                    <p className="text-sm font-medium text-gray-700 capitalize">{name}</p>
                    <p className="text-xs text-gray-500">{color}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Landing Copy */}
          {d.landing_copy && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <span>📢</span>
                <span>Landing Page Copy</span>
              </h3>
              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Headline</p>
                  <p className="text-gray-800 font-semibold">{d.landing_copy.headline}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Subheadline</p>
                  <p className="text-gray-700">{d.landing_copy.subheadline}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Call to Action</p>
                  <p className="text-blue-600 font-medium">{d.landing_copy.call_to_action}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              Delete Pitch
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}