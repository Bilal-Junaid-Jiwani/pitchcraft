import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function PitchForm({ user }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `
You are a creative startup pitch generator AI.
User provides one paragraph describing their startup idea.
Return ONLY JSON with:
name, tagline, elevator_pitch, problem, solution, target_audience, landing_copy, colors, logo_ideas.

User Input: """${prompt}"""
                    `,
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await res.json()
      console.log("Gemini Response:", data)

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Invalid JSON format.")

      const parsed = JSON.parse(jsonMatch[0])
      setResult(parsed)

      // ✅ Save to Supabase
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: parsed.name || "Untitled",
        short_description: parsed.tagline || "",
        industry: parsed.industry || "N/A",
        tone: "auto",
        language: "auto",
        generated_data: parsed,
      })
      if (error) throw error

      // Success notification
      const notification = document.createElement("div")
      notification.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50"
      notification.innerHTML = "✅ Pitch saved successfully!"
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)

    } catch (err) {
      console.error("Error:", err)
      const errorNotification = document.createElement("div")
      errorNotification.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50"
      errorNotification.innerHTML = "❌ " + err.message
      document.body.appendChild(errorNotification)
      setTimeout(() => errorNotification.remove(), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-6">
          <span className="text-2xl">🚀</span>
        </div>
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
          PitchCraft AI
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Transform your startup idea into a compelling pitch deck with AI-powered insights and professional branding.
        </p>
      </div>

      {/* Form Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Describe Your Startup Idea
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I want to build an AI-powered health tracker that motivates users to stay fit with gamified rewards, personalized coaching, and social challenges for millennials and Gen Z..."
              className="w-full h-48 rounded-2xl p-6 text-gray-800 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none resize-none shadow-sm transition-all duration-200 bg-white/50 backdrop-blur-sm"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
              loading
                ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-500/25"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating Your Pitch...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>✨</span>
                <span>Generate Professional Pitch</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Your AI-Generated Pitch</h2>
          </div>

          {/* Main Pitch Info */}
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">{result.name}</h3>
              <p className="text-xl text-gray-600 italic">{result.tagline}</p>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-3 text-lg">Elevator Pitch</h4>
              <p className="text-gray-700 leading-relaxed">{result.elevator_pitch}</p>
            </div>

            {/* Problem & Solution Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-red-600 text-lg">🧩</span>
                  <h4 className="font-semibold text-red-900">The Problem</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">{result.problem}</p>
              </div>

              <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-green-600 text-lg">💡</span>
                  <h4 className="font-semibold text-green-900">Our Solution</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">{result.solution}</p>
              </div>
            </div>

            {/* Branding Elements */}
            {result.colors && (
              <div className="bg-purple-50/50 rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-purple-600 text-lg">🎨</span>
                  <h4 className="font-semibold text-purple-900">Brand Color Palette</h4>
                </div>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(result.colors).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg mb-2"
                        style={{ backgroundColor: val }}
                      ></div>
                      <p className="text-xs font-medium text-gray-700 capitalize">{key}</p>
                      <p className="text-xs text-gray-500">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logo Ideas */}
            {result.logo_ideas && (
              <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-orange-600 text-lg">🔥</span>
                  <h4 className="font-semibold text-orange-900">Logo Concepts</h4>
                </div>
                <div className="grid gap-3">
                  {result.logo_ideas.map((idea, i) => (
                    <div key={i} className="flex items-center space-x-3 bg-white/50 rounded-xl p-4 border border-orange-100">
                      <span className="text-orange-500">•</span>
                      <p className="text-gray-700">{idea}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}