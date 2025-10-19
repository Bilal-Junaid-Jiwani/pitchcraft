import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function PitchForm({ user }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null)
  const [landingCode, setLandingCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("pitch") // "pitch" or "website"

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setLandingCode(null)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error("Gemini API key missing in .env")

      // Enhanced prompt - landing page code bhi mang rahe hain
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
      
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Could not find JSON object in AI response.")
      }

      const cleaned = jsonMatch[0]
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (err) {
        // Attempt light fixes
        const attempt = cleaned
          .replace(/'\s*:\s*'/g, '": "')
          .replace(/([{\[,])\s*'([^']+?)'\s*(?=[:,\]}])/g, '$1"$2"')
          .replace(/,(\s*[}\]])/g, "$1")
        try {
          parsed = JSON.parse(attempt)
        } catch (err2) {
          throw new Error("AI returned invalid JSON (parsing failed).")
        }
      }

      // Ensure basic keys exist
      parsed.name = parsed.name || "Untitled Startup"
      parsed.tagline = parsed.tagline || ""
      parsed.industry = parsed.industry || ""

      setResult(parsed)

      // ✅ AB LANDING PAGE CODE GENERATE KARENGE
      await generateLandingPageCode(parsed)

      // Save to Supabase
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: parsed.name,
        short_description: parsed.tagline || parsed.elevator_pitch || "",
        industry: parsed.industry || null,
        tone: "auto",
        language: "auto",
        generated_data: parsed,
        landing_code: landingCode, // Naya field add karo database mein
      })

      if (error) {
        console.error("Supabase insert error:", error)
        throw new Error("Failed to save pitch to database: " + error.message)
      } else {
        // Success notification
        const el = document.createElement("div")
        el.className = "fixed top-4 right-4 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg z-50"
        el.innerText = "✅ Pitch + Website Code Generated!"
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 3000)
      }
    } catch (err) {
      console.error(err)
      const el = document.createElement("div")
      el.className = "fixed top-4 right-4 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg z-50"
      el.innerText = "❌ " + (err.message || "Something went wrong")
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 5000)
    } finally {
      setLoading(false)
    }
  }

  // ✅ NAYA FUNCTION: LANDING PAGE CODE GENERATE KARNE KE LIYE
  async function generateLandingPageCode(pitchData) {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      const websitePrompt = `
Create a complete, professional landing page HTML/CSS/JS code for this startup:

STARTUP DETAILS:
- Name: ${pitchData.name}
- Tagline: ${pitchData.tagline}
- Elevator Pitch: ${pitchData.elevator_pitch}
- Problem: ${pitchData.problem}
- Solution: ${pitchData.solution}
- UVP: ${pitchData.unique_value_proposition}
- Colors: ${JSON.stringify(pitchData.colors)}
- Target Audience: ${pitchData.target_audience?.description}

REQUIREMENTS:
1. Create a MODERN, PROFESSIONAL landing page with Tailwind CSS
2. Include: Hero section, Problem/Solution, Features, Testimonials, CTA, Footer
3. Use the provided color palette: ${JSON.stringify(pitchData.colors)}
4. Make it fully responsive
5. Include interactive elements (hover effects, smooth scroll)
6. Use professional startup-style copywriting
7. Add placeholder images with relevant alt text
8. Include a working contact form

OUTPUT FORMAT:
Return ONLY the complete HTML code with embedded Tailwind CSS and JavaScript. No explanations, no markdown, just pure HTML file that I can copy-paste and use directly.

Generate the complete landing page code now:
      `

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: websitePrompt }] }]
          }),
        }
      )

      const data = await resp.json()
      const websiteCode = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
      
      setLandingCode(websiteCode)
    } catch (error) {
      console.error("Website code generation failed:", error)
      // Fallback basic template
      setLandingCode(generateFallbackTemplate(pitchData))
    }
  }

  // ✅ FALLBACK TEMPLATE AGAR AI FAIL HO JAYE
  function generateFallbackTemplate(pitchData) {
    const colors = pitchData.colors || {
      primary: "#3B82F6",
      secondary: "#8B5CF6", 
      accent: "#06B6D4",
      neutral: "#6B7280"
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pitchData.name} - ${pitchData.tagline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-white">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-[${colors.primary}] to-[${colors.secondary}] rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-lg">🚀</span>
                    </div>
                    <span class="ml-3 text-xl font-bold text-gray-900">${pitchData.name}</span>
                </div>
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-4">
                        <a href="#features" class="text-gray-600 hover:text-[${colors.primary}] px-3 py-2 rounded-md text-sm font-medium">Features</a>
                        <a href="#solution" class="text-gray-600 hover:text-[${colors.primary}] px-3 py-2 rounded-md text-sm font-medium">Solution</a>
                        <a href="#contact" class="text-gray-600 hover:text-[${colors.primary}] px-3 py-2 rounded-md text-sm font-medium">Contact</a>
                    </div>
                </div>
                <button class="bg-[${colors.primary}] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[${colors.secondary}] transition-colors">
                    Get Started
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-gray-50 to-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">${pitchData.landing_copy?.headline || pitchData.name}</h1>
                <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">${pitchData.landing_copy?.subheadline || pitchData.tagline}</p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button class="bg-[${colors.primary}] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[${colors.secondary}] transition-colors shadow-lg">
                        ${pitchData.landing_copy?.call_to_action || "Get Started Free"}
                    </button>
                    <button class="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- Problem Section -->
    <section id="problem" class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">The Problem We Solve</h2>
                <p class="text-lg text-gray-600 max-w-2xl mx-auto">${pitchData.problem}</p>
            </div>
        </div>
    </section>

    <!-- Solution Section -->
    <section id="solution" class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">Our Innovative Solution</h2>
                <p class="text-lg text-gray-600 max-w-2xl mx-auto">${pitchData.solution}</p>
            </div>
        </div>
    </section>

    <!-- UVP Section -->
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gradient-to-r from-[${colors.primary}] to-[${colors.secondary}] rounded-3xl p-12 text-center text-white">
                <h2 class="text-3xl font-bold mb-6">Why Choose ${pitchData.name}?</h2>
                <p class="text-xl opacity-90">${pitchData.unique_value_proposition}</p>
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20 bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
            <p class="text-gray-300 mb-8 text-lg">Join thousands of satisfied users today</p>
            <button class="bg-[${colors.accent}] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[${colors.primary}] transition-colors">
                Start Your Journey
            </button>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>&copy; 2024 ${pitchData.name}. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>
    `
  }

  // ✅ RENDER PITCH DETAILS
  function RenderPitchDetails({ data }) {
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

  // ✅ RENDER WEBSITE CODE
  function RenderWebsiteCode({ code }) {
    if (!code) return null

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">🌐 Generated Landing Page Code</h3>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code)
              const el = document.createElement("div")
              el.className = "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50"
              el.innerText = "✅ Code Copied!"
              document.body.appendChild(el)
              setTimeout(() => el.remove(), 2000)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Copy Code
          </button>
        </div>
        <div className="p-4 bg-gray-900 rounded-b-2xl">
          <pre className="text-green-400 text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {code}
          </pre>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            💡 <strong>How to use:</strong> Copy this code and save as <code>index.html</code>. 
            Open in browser or deploy to Netlify/Vercel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-6">
          <span className="text-2xl text-white">🚀</span>
        </div>
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
          PitchCraft AI
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Describe your startup idea and get a complete pitch deck + professional landing page code instantly.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Describe Your Startup Idea
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I want to build an AI-powered fitness app that creates personalized workout plans based on user goals, with video guidance and progress tracking for busy professionals..."
              className="w-full h-48 rounded-2xl p-6 text-gray-800 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none resize-none shadow-sm transition-all duration-200 bg-white/50 backdrop-blur-sm"
              required
            />
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
                <span>Generating Pitch + Website Code...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>✨</span>
                <span>Generate Complete Startup Package</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Results Tabs */}
      {result && (
        <div className="mb-8">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit mx-auto">
            <button
              onClick={() => setActiveTab("pitch")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "pitch"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 Pitch Details
            </button>
            <button
              onClick={() => setActiveTab("website")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "website"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🌐 Website Code
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "pitch" && <RenderPitchDetails data={result} />}
          {activeTab === "website" && <RenderWebsiteCode code={landingCode} />}
        </div>
      )}
    </div>
  )
}