import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function PitchForm({ user }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null) // parsed JSON object
  const [rawText, setRawText] = useState(null) // raw text from model (for debugging/fallback)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setRawText(null)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error("Gemini API key missing in .env")

      // Enhanced prompt — request UVP + landing hero + segments
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `
You are an advanced startup ideation AI. The user will provide a short paragraph describing a startup idea.
From that, generate a single VALID JSON object (no commentary, no extra text) with EXACT keys:

{
  "name": "Startup name",
  "tagline": "Short catchy tagline",
  "elevator_pitch": "3-5 sentence compelling pitch",
  "problem": "What problem this solves",
  "solution": "How it solves it",
  "target_audience": {
    "description": "Short description of main audience",
    "segments": ["segment 1", "segment 2"]
  },
  "unique_value_proposition": "1-2 sentence UVP (why unique)",
  "landing_copy": {
    "headline": "Hero headline for website",
    "subheadline": "Supporting subheadline",
    "call_to_action": "Short CTA text"
  },
  "industry": "Optional industry name",
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "neutral": "#hex"
  },
  "logo_ideas": ["idea 1", "idea 2"]
}

User Input: """${prompt}"""

Return ONLY valid JSON (single object). If you must add anything else, do NOT — return strictly the JSON object.
                `,
              },
            ],
          },
        ],
      }

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      )

      const data = await resp.json()
      console.log("Gemini Raw:", data)
      // Try to extract text from several common response shapes
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.content?.text ||
        (typeof data === "string" ? data : JSON.stringify(data, null, 2))

      setRawText(text)

      // Extract the first {...} block robustly
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Could not find JSON object in AI response.")
      }

      const cleaned = jsonMatch[0]
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (err) {
        // Attempt light fixes: replace single quotes with double, trailing commas removal, etc.
        const attempt = cleaned
          .replace(/'\s*:\s*'/g, '": "')
          .replace(/([{\[,])\s*'([^']+?)'\s*(?=[:,\]}])/g, '$1"$2"') // convert keys/values in single quotes
          .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
        try {
          parsed = JSON.parse(attempt)
        } catch (err2) {
          console.error("JSON parse failed:", err, err2)
          throw new Error("AI returned invalid JSON (parsing failed).")
        }
      }

      // Ensure some basic keys exist
      parsed.name = parsed.name || "Untitled Startup"
      parsed.tagline = parsed.tagline || parsed.tagline || ""
      parsed.industry = parsed.industry || parsed.industry || ""

      setResult(parsed)

      // Save to Supabase: match your table columns
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: parsed.name,
        short_description: parsed.tagline || parsed.elevator_pitch || "",
        industry: parsed.industry || null,
        tone: "auto",
        language: "auto",
        generated_data: parsed,
      })

      if (error) {
        console.error("Supabase insert error:", error)
        throw new Error("Failed to save pitch to database: " + error.message)
      } else {
        // small UI notification
        const el = document.createElement("div")
        el.className =
          "fixed top-4 right-4 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg z-50"
        el.innerText = "✅ Pitch saved to Supabase!"
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 3000)
      }
    } catch (err) {
      console.error(err)
      const el = document.createElement("div")
      el.className =
        "fixed top-4 right-4 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg z-50"
      el.innerText = "❌ " + (err.message || "Something went wrong")
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Helper: render parsed object into nice UI
  function RenderResult({ data }) {
    if (!data) return null
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
            {data.tagline && <p className="text-gray-600 italic">{data.tagline}</p>}
            {data.industry && (
              <p className="text-xs mt-2 text-gray-500">Industry: {data.industry}</p>
            )}
          </div>
        </div>

        {/* Elevator */}
        {data.elevator_pitch && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-blue-800">Elevator Pitch</h4>
            <p className="mt-2 text-gray-700">{data.elevator_pitch}</p>
          </div>
        )}

        {/* Problem / Solution */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {data.problem && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h5 className="font-semibold text-red-700">🧩 Problem</h5>
              <p className="mt-2 text-gray-700">{data.problem}</p>
            </div>
          )}
          {data.solution && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h5 className="font-semibold text-green-700">💡 Solution</h5>
              <p className="mt-2 text-gray-700">{data.solution}</p>
            </div>
          )}
        </div>

        {/* UVP */}
        {data.unique_value_proposition && (
          <div className="mt-4 bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <h5 className="font-semibold text-yellow-800">💎 Unique Value Proposition</h5>
            <p className="mt-2 text-gray-700">{data.unique_value_proposition}</p>
          </div>
        )}

        {/* Target Audience */}
        {data.target_audience && (
          <div className="mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <h5 className="font-semibold text-indigo-800">🎯 Target Audience</h5>
            <p className="mt-2 text-gray-700">{data.target_audience.description}</p>
            {Array.isArray(data.target_audience.segments) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {data.target_audience.segments.map((s, i) => (
                  <span
                    key={i}
                    className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Landing / hero */}
        {data.landing_copy && (
          <div className="mt-4 bg-gradient-to-r from-indigo-50 to-white rounded-xl p-4 border border-indigo-100">
            <h5 className="font-semibold text-indigo-800">🌐 Website Hero (landing)</h5>
            <div className="mt-2">
              <p className="font-semibold text-gray-900">{data.landing_copy.headline}</p>
              <p className="text-gray-700 mt-1">{data.landing_copy.subheadline}</p>
              <p className="mt-3 text-blue-600 font-medium">{data.landing_copy.call_to_action}</p>
            </div>
          </div>
        )}

        {/* Colors */}
        {data.colors && (
          <div className="mt-4">
            <h5 className="font-semibold text-gray-800">🎨 Colors</h5>
            <div className="flex gap-3 mt-2">
              {Object.entries(data.colors).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div
                    className="w-12 h-12 rounded-xl border shadow-sm"
                    style={{ backgroundColor: val }}
                    title={`${key}: ${val}`}
                  />
                  <p className="text-xs text-gray-600 mt-1 capitalize">{key}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logo ideas */}
        {Array.isArray(data.logo_ideas) && data.logo_ideas.length > 0 && (
          <div className="mt-4">
            <h5 className="font-semibold text-gray-800">🚀 Logo ideas</h5>
            <ul className="list-disc ml-6 mt-2 text-gray-700">
              {data.logo_ideas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">PitchCraft AI</h1>
        <p className="text-gray-600 mt-2">Describe your idea and get a complete pitch + website hero & UVP instantly.</p>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-md border border-white/30 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="text-sm font-medium text-gray-700">Describe your startup idea (one paragraph)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            placeholder="E.g. I want to build a FinTech app that helps students budget their pocket money, with gamified rewards and social sharing."
            required
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-white transition ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              }`}
            >
              {loading ? "Generating..." : "Generate Full Pitch"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPrompt("")
                setResult(null)
                setRawText(null)
              }}
              className="py-3 px-4 rounded-xl border border-gray-200"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Result area */}
      {result && (
        <div className="mb-8 animate-fade-in-up">
          <RenderResult data={result} />
        </div>
      )}

      {/* Raw / Debug area (toggleable if you want) */}
      {rawText && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700">
          <strong>Raw AI output (debug):</strong>
          <pre className="whitespace-pre-wrap mt-2">{rawText}</pre>
        </div>
      )}
    </div>
  )
}
