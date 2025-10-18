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
      alert("✅ Pitch deleted successfully!")
    }
  }

  // 🔹 Render pitch card
  function renderPitchCard(pitch) {
    const data = pitch.generated_data
    return (
      <div
        key={pitch.id}
        className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer border"
        onClick={() => setSelectedPitch(pitch)}
      >
        <h3 className="text-lg font-bold text-blue-600">{data.name}</h3>
        <p className="text-sm text-gray-600">{data.tagline}</p>
        <p className="text-gray-500 text-xs mt-1">{pitch.industry}</p>
      </div>
    )
  }

  // 🔹 Detailed pitch modal
  function renderPitchDetails(pitch) {
    const d = pitch.generated_data
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative overflow-y-auto max-h-[90vh]">
          <button
            onClick={() => setSelectedPitch(null)}
            className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold text-blue-700">{d.name}</h2>
          <p className="italic text-gray-600">{d.tagline}</p>
          <p className="mt-2 text-gray-700">{d.elevator_pitch}</p>

          <div className="mt-4">
            <h4 className="font-semibold">🧩 Problem</h4>
            <p>{d.problem}</p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">💡 Solution</h4>
            <p>{d.solution}</p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">🎯 Target Audience</h4>
            <p>{d.target_audience?.description}</p>
            {Array.isArray(d.target_audience?.segments) && (
              <ul className="list-disc ml-5 mt-1 text-sm">
                {d.target_audience.segments.map((seg, i) => (
                  <li key={i}>{seg}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">🚀 Logo Ideas</h4>
            <ul className="list-disc ml-5 mt-1 text-sm">
              {Array.isArray(d.logo_ideas) &&
                d.logo_ideas.map((idea, i) => <li key={i}>{idea}</li>)}
            </ul>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold">🎨 Colors</h4>
            <div className="flex gap-2 mt-2">
              {Object.entries(d.colors || {}).map(([name, color]) => (
                <div
                  key={name}
                  className="w-8 h-8 rounded-full border"
                  style={{ backgroundColor: color }}
                  title={`${name}: ${color}`}
                ></div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold">📢 Landing Copy</h4>
            <p className="font-semibold mt-1">{d.landing_copy?.headline}</p>
            <p>{d.landing_copy?.subheadline}</p>
            <p className="text-blue-600 mt-2">
              {d.landing_copy?.call_to_action}
            </p>
          </div>

          <button
            onClick={() => handleDelete(pitch.id)}
            className="bg-red-500 text-white px-4 py-2 rounded mt-6 hover:bg-red-600"
          >
            Delete Pitch
          </button>
        </div>
      </div>
    )
  }

  if (loading)
    return (
      <div className="text-center py-10 text-gray-500">
        Loading your pitches...
      </div>
    )

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">📋 My Pitches</h2>
      {pitches.length === 0 ? (
        <p className="text-gray-500">You haven’t generated any pitches yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pitches.map(renderPitchCard)}
        </div>
      )}

      {selectedPitch && renderPitchDetails(selectedPitch)}
    </div>
  )
}
