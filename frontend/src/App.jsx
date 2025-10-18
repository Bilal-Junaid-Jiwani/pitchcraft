import { useState } from "react"
import { supabase } from "./lib/supabaseClient"


export default function PitchForm({ user }) {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        setResult("❌ Gemini API key not found. Please check your .env file.")
        setLoading(false)
        return
      }

      // 🔹 Gemini Prompt — smarter version
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `
You are an advanced startup pitch generator AI.
User will provide a single natural language idea or description.
From that, you must intelligently extract details such as:
- name
- tagline
- elevator_pitch
- problem
- solution
- target_audience
- landing_copy
- colors
- logo_ideas

User Input: """${prompt}"""

Return output ONLY in valid JSON (no commentary or text outside the JSON).
                `,
              },
            ],
          },
        ],
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      )

      const data = await res.json()
      console.log("Gemini API Raw Response:", data)

      const output =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify(data, null, 2)
      setResult(output.trim())

      // ✅ Try to extract JSON
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("⚠️ JSON block not found in Gemini output.")
        return
      }

      const parsed = JSON.parse(jsonMatch[0])

      // ✅ Save to Supabase
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: parsed.name || "Untitled Startup",
        short_description: parsed.tagline || "No tagline",
        industry: parsed.industry || "Unknown",
        tone: "auto",
        language: "auto",
        generated_data: parsed,
      })

      if (error) {
        console.error("❌ Supabase Insert Error:", error)
        alert("Supabase Error: " + error.message)
      } else {
        console.log("✅ Pitch successfully saved in Supabase!")
        alert("✅ Pitch saved successfully in Supabase!")
      }
    } catch (err) {
      console.error("Error generating pitch:", err)
      setResult("❌ Error generating pitch. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  function renderPretty(resultText) {
    try {
      const data = JSON.parse(resultText.match(/\{[\s\S]*\}/)[0])
      return (
        <div className="space-y-3 text-gray-800">
          <h2 className="text-2xl font-bold text-blue-600">{data.name}</h2>
          <p className="italic text-gray-600">{data.tagline}</p>
          <p className="mt-2">{data.elevator_pitch}</p>

          <div className="mt-3">
            <h4 className="font-semibold">🧩 Problem</h4>
            <p>{data.problem}</p>
          </div>
          <div className="mt-3">
            <h4 className="font-semibold">💡 Solution</h4>
            <p>{data.solution}</p>
          </div>

          {data.colors && (
            <div className="mt-3">
              <h4 className="font-semibold">🎨 Colors</h4>
              <div className="flex gap-2 mt-1">
                {Object.entries(data.colors).map(([name, color]) => (
                  <div
                    key={name}
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: color }}
                    title={`${name}: ${color}`}
                  ></div>
                ))}
              </div>
            </div>
          )}

          {data.logo_ideas && (
            <div className="mt-3">
              <h4 className="font-semibold">🚀 Logo Ideas</h4>
              <ul className="list-disc ml-5">
                {data.logo_ideas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    } catch {
      return (
        <pre className="text-sm whitespace-pre-wrap bg-gray-100 p-3 rounded">
          {resultText}
        </pre>
      )
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Generate Your Startup Pitch (Pro Mode 💼)
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          placeholder="Describe your startup idea in one paragraph. Example: 
I want to build a HealthTech app that tracks sleep, gives AI-based recommendations, and has a calm, friendly tone."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border p-3 w-full rounded-lg h-40 resize-none"
          required
        ></textarea>

        <button
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition w-full"
        >
          {loading ? "Generating..." : "Generate Pitch"}
        </button>
      </form>

      {result && (
        <div className="bg-white mt-6 p-6 rounded-2xl shadow border">
          <h3 className="text-xl font-bold mb-4">🎨 Your AI Generated Startup Pitch</h3>
          {renderPretty(result)}
        </div>
      )}
    </div>
  )
}
