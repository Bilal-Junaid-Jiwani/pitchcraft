import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function PitchForm({ user }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // raw text result from Gemini
  const [inputs, setInputs] = useState({
    title: "",
    description: "",
    industry: "",
    tone: "fun",
    language: "English",
  })

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

      // Gemini request (use your currently working model name)
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
You are an AI startup pitch creator.
Generate a startup pitch ONLY in valid JSON format like this:
{
  "name": "",
  "tagline": "",
  "elevator_pitch": "",
  "problem": "",
  "solution": "",
  "target_audience": {},
  "landing_copy": {},
  "colors": {},
  "logo_ideas": []
}
Tone: ${inputs.tone}
Language: ${inputs.language}
Idea Title: ${inputs.title}
Description: ${inputs.description}
Industry: ${inputs.industry}
Return ONLY JSON — no explanation or extra text.
`,
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await res.json()
      console.log("Gemini API Raw Response:", data)

      // extract text safely (handles different response shapes)
      let output =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.content?.text ||
        JSON.stringify(data, null, 2)

      const pitchText = output.trim()
      setResult(pitchText)

      // Try to extract first JSON object in the text (in case model added extra words)
      const jsonMatch = pitchText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("⚠️ JSON block not found in Gemini output.")
        return
      }

      const onlyJson = jsonMatch[0]
      let parsedData
      try {
        parsedData = JSON.parse(onlyJson)
      } catch (err) {
        console.error("⚠️ Still invalid JSON after cleanup:", err)
        return
      }

      // Save to Supabase (table: pitches). Adjust column names if your schema differs.
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: inputs.title,
        short_description: inputs.description,
        industry: inputs.industry,
        tone: inputs.tone,
        language: inputs.language,
        generated_data: parsedData,
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

  // Helper to render parsed JSON in nice UI
  function renderPretty(resultText) {
    try {
      const data = JSON.parse(resultText.match(/\{[\s\S]*\}/)[0])

      return (
        <div className="space-y-4 text-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-blue-600">{data.name}</h2>
            {data.tagline && <p className="italic text-gray-600">{data.tagline}</p>}
            {data.elevator_pitch && <p className="mt-2">{data.elevator_pitch}</p>}
          </div>

          {data.problem && (
            <div>
              <h4 className="font-semibold text-gray-700">🧩 Problem</h4>
              <p>{data.problem}</p>
            </div>
          )}

          {data.solution && (
            <div>
              <h4 className="font-semibold text-gray-700">💡 Solution</h4>
              <p>{data.solution}</p>
            </div>
          )}

          {data.target_audience && (
            <div>
              <h4 className="font-semibold text-gray-700">🎯 Target Audience</h4>
              {data.target_audience.description && <p>{data.target_audience.description}</p>}
              {Array.isArray(data.target_audience.segments) && (
                <ul className="list-disc ml-6 text-sm mt-1">
                  {data.target_audience.segments.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {data.colors && Object.keys(data.colors).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700">🎨 Colors</h4>
              <div className="flex gap-2 mt-2">
                {Object.entries(data.colors).map(([name, hex]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border"
                      style={{ backgroundColor: hex }}
                      title={`${name}: ${hex}`}
                    />
                    <div className="text-sm text-gray-600">{name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(data.logo_ideas) && data.logo_ideas.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700">🚀 Logo Ideas</h4>
              <ul className="list-disc ml-6 text-sm">
                {data.logo_ideas.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {data.landing_copy && (
            <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
              {data.landing_copy.headline && <p className="font-semibold">{data.landing_copy.headline}</p>}
              {data.landing_copy.subheadline && <p>{data.landing_copy.subheadline}</p>}
              {data.landing_copy.call_to_action && <p className="text-blue-600 mt-2">{data.landing_copy.call_to_action}</p>}
            </div>
          )}
        </div>
      )
    } catch (err) {
      // Fallback: show raw text
      return (
        <pre className="text-sm whitespace-pre-wrap text-gray-700 bg-gray-100 p-2 rounded">
          {resultText}
        </pre>
      )
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Generate Your Startup Pitch</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Startup Title"
          value={inputs.title}
          onChange={(e) => setInputs({ ...inputs, title: e.target.value })}
          className="border p-2 w-full rounded"
          required
        />

        <textarea
          placeholder="Short Description"
          value={inputs.description}
          onChange={(e) => setInputs({ ...inputs, description: e.target.value })}
          className="border p-2 w-full rounded"
          required
        ></textarea>

        <input
          type="text"
          placeholder="Industry (e.g. FinTech, HealthTech)"
          value={inputs.industry}
          onChange={(e) => setInputs({ ...inputs, industry: e.target.value })}
          className="border p-2 w-full rounded"
        />

        <div className="flex gap-3">
          <select
            value={inputs.tone}
            onChange={(e) => setInputs({ ...inputs, tone: e.target.value })}
            className="border p-2 w-1/2 rounded"
          >
            <option value="fun">Fun</option>
            <option value="formal">Formal</option>
          </select>

          <select
            value={inputs.language}
            onChange={(e) => setInputs({ ...inputs, language: e.target.value })}
            className="border p-2 w-1/2 rounded"
          >
            <option value="English">English</option>
            <option value="Roman Urdu">Roman Urdu</option>
          </select>
        </div>

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
