import { useState, useEffect } from "react"
import { supabase } from "../lib/supabaseClient"
import { motion, AnimatePresence } from "framer-motion"

export default function PitchForm({ user }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null)
  const [landingCode, setLandingCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("pitch")
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")

  // Generate preview URL when landing code changes
  useEffect(() => {
    if (landingCode && !previewUrl) {
      generatePreview()
    }
  }, [landingCode])

  const generatePreview = () => {
    if (!landingCode) return
    
    // Create blob from HTML code
    const blob = new Blob([landingCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
  }

  const openPreview = () => {
    if (!previewUrl) {
      generatePreview()
    }
    setShowPreview(true)
  }

  const closePreview = () => {
    setShowPreview(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setLandingCode(null)
    setPreviewUrl("")
    setShowPreview(false)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error("Gemini API key missing in .env")

      // Step 1: Get Pitch Data
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `
ACT AS A PROFESSIONAL STARTUP CONSULTANT. Generate a comprehensive startup pitch package from this idea: "${prompt}"

Return ONLY valid JSON with this exact structure:
{
  "name": "Creative startup name",
  "tagline": "Catchy one-liner",
  "elevator_pitch": "2-4 sentence compelling story",
  "problem": "Clear problem statement",
  "solution": "Innovative solution description", 
  "target_audience": {
    "description": "Primary customer description",
    "segments": ["segment 1", "segment 2", "segment 3"]
  },
  "unique_value_proposition": "What makes it unique vs competitors",
  "landing_copy": {
    "headline": "Attention-grabbing headline",
    "subheadline": "Supporting description",
    "call_to_action": "Action-oriented CTA"
  },
  "industry": "Relevant industry",
  "colors": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "neutral": "#hex"
  },
  "logo_ideas": ["creative idea 1", "creative idea 2", "creative idea 3"]
}

IMPORTANT: Return ONLY the JSON object, no other text.`
              },
            ],
          },
        ],
      }

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      if (!jsonMatch) throw new Error("Could not find JSON object in AI response.")

      const cleaned = jsonMatch[0]
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (err) {
        const attempt = cleaned
          .replace(/'\s*:\s*'/g, '": "')
          .replace(/([{\[,])\s*'([^']+?)'\s*(?=[:,\]}])/g, '$1"$2"')
          .replace(/,(\s*[}\]])/g, "$1")
        parsed = JSON.parse(attempt)
      }

      // Ensure basic structure
      parsed.name = parsed.name || "Untitled Startup"
      parsed.tagline = parsed.tagline || "Transforming ideas into reality"
      parsed.industry = parsed.industry || "Technology"

      setResult(parsed)

      // Generate landing page code
      const generatedCode = await generateLandingPageCode(parsed)
      setLandingCode(generatedCode)

      // Save to Supabase
      const { error } = await supabase.from("pitches").insert({
        user_id: user.id,
        title: parsed.name,
        short_description: parsed.tagline,
        industry: parsed.industry,
        tone: "auto",
        language: "auto",
        generated_data: parsed,
        landing_code: generatedCode,
      })

      if (error) throw error

      // Success notification
      showNotification("✅ Pitch + Website Code Generated!", "success")
    } catch (err) {
      console.error(err)
      showNotification("❌ " + (err.message || "Something went wrong"), "error")
    } finally {
      setLoading(false)
    }
  }

  async function generateLandingPageCode(pitchData) {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      const websitePrompt = `Create a stunning, modern landing page HTML for: ${pitchData.name} - ${pitchData.tagline}

Details:
- Problem: ${pitchData.problem}
- Solution: ${pitchData.solution} 
- UVP: ${pitchData.unique_value_proposition}
- Colors: ${JSON.stringify(pitchData.colors)}
- Audience: ${pitchData.target_audience?.description}

Requirements:
- Use Tailwind CSS CDN
- Modern glass morphism design
- Fully responsive layout
- Smooth animations
- Professional startup aesthetic
- Include: Hero, Features, Testimonials, CTA, Footer
- Add interactive elements

Return ONLY complete HTML code:`

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: websitePrompt }] }] }),
        }
      )

      const data = await resp.json()
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || generateFallbackTemplate(pitchData)
    } catch (error) {
      return generateFallbackTemplate(pitchData)
    }
  }

  function generateFallbackTemplate(pitchData) {
    const colors = pitchData.colors || { primary: "#3B82F6", secondary: "#8B5CF6", accent: "#06B6D4" }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pitchData.name} - ${pitchData.tagline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-bg { background: linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20); }
        .hero-gradient { background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); }
    </style>
</head>
<body class="bg-white">
    <!-- Navigation -->
    <nav class="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-[${colors.primary}] to-[${colors.secondary}] rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold">🚀</span>
                    </div>
                    <span class="text-xl font-bold text-gray-900">${pitchData.name}</span>
                </div>
                <button class="bg-[${colors.primary}] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[${colors.secondary}] transition-colors">
                    Get Started
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-gradient text-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 class="text-5xl font-bold mb-6">${pitchData.landing_copy?.headline || pitchData.name}</h1>
            <p class="text-xl opacity-90 mb-8 max-w-3xl mx-auto">${pitchData.landing_copy?.subheadline || pitchData.tagline}</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="bg-white text-[${colors.primary}] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg">
                    ${pitchData.landing_copy?.call_to_action || "Get Started Free"}
                </button>
                <button class="border border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
                    Learn More
                </button>
            </div>
        </div>
    </section>

    <!-- Problem Section -->
    <section class="py-20 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-6">The Problem We Solve</h2>
            <p class="text-lg text-gray-600 leading-relaxed">${pitchData.problem}</p>
        </div>
    </section>

    <!-- Solution Section -->
    <section class="py-20 gradient-bg">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-6">Our Innovative Solution</h2>
            <p class="text-lg text-gray-600 leading-relaxed">${pitchData.solution}</p>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gray-900 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p class="text-gray-300 mb-8 text-lg">Join the future with ${pitchData.name}</p>
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
        // Smooth scroll for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    </script>
</body>
</html>`
  }

  function showNotification(message, type) {
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

  // ✅ COMPLETE PITCH DETAILS COMPONENT
  const RenderPitchDetails = ({ data }) => {
    if (!data) return null
    
    return (
      <div className="space-y-6">
        {/* Startup Header */}
        <motion.div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <h2 className="text-4xl font-black mb-3">{data.name}</h2>
          <p className="text-xl opacity-90 mb-4">{data.tagline}</p>
          <div className="flex items-center space-x-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              🏢 {data.industry}
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              🎯 {data.target_audience?.segments?.length || 0} Target Segments
            </span>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Elevator Pitch */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="p-6 rounded-2xl backdrop-blur-sm border bg-blue-50/50 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">🎯</div>
              <h3 className="font-bold text-lg text-gray-800">Elevator Pitch</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">{data.elevator_pitch}</p>
          </motion.div>

          {/* Unique Value Proposition */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="p-6 rounded-2xl backdrop-blur-sm border bg-purple-50/50 border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">💎</div>
              <h3 className="font-bold text-lg text-gray-800">Unique Value Proposition</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">{data.unique_value_proposition}</p>
          </motion.div>

          {/* Problem */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="p-6 rounded-2xl backdrop-blur-sm border bg-red-50/50 border-red-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">🧩</div>
              <h3 className="font-bold text-lg text-gray-800">The Problem</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">{data.problem}</p>
          </motion.div>

          {/* Solution */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="p-6 rounded-2xl backdrop-blur-sm border bg-green-50/50 border-green-100 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">💡</div>
              <h3 className="font-bold text-lg text-gray-800">Our Solution</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">{data.solution}</p>
          </motion.div>
        </div>

        {/* Target Audience */}
        <motion.div
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-lg"
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-xl font-bold text-indigo-800 mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            Target Audience
          </h3>
          <p className="text-gray-700 mb-4">{data.target_audience?.description}</p>
          <div className="flex flex-wrap gap-2">
            {data.target_audience?.segments?.map((segment, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg"
              >
                {segment}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Landing Copy */}
        {data.landing_copy && (
          <motion.div
            className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100 shadow-lg"
            whileHover={{ scale: 1.01 }}
          >
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">🌐</span>
              Website Landing Copy
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">Headline</p>
                <p className="text-lg font-bold text-gray-800">{data.landing_copy.headline}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">Subheadline</p>
                <p className="text-gray-700">{data.landing_copy.subheadline}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">Call to Action</p>
                <p className="text-green-600 font-semibold">{data.landing_copy.call_to_action}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Branding Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Color Palette */}
          <motion.div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg"
            whileHover={{ y: -5 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🎨</span>
              Brand Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data.colors && Object.entries(data.colors).map(([name, color]) => (
                <motion.div key={name} whileHover={{ scale: 1.1 }} className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white mx-auto mb-2"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-sm font-medium text-gray-700 capitalize">{name}</p>
                  <p className="text-xs text-gray-500 font-mono">{color}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Logo Ideas */}
          <motion.div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg"
            whileHover={{ y: -5 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🚀</span>
              Logo Concepts
            </h3>
            <ul className="space-y-3">
              {data.logo_ideas?.map((idea, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-200"
                >
                  <span className="text-yellow-500">✦</span>
                  <span className="text-gray-700">{idea}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    )
  }

  // ✅ RENDER WEBSITE CODE COMPONENT
  const RenderWebsiteCode = ({ code }) => {
    if (!code) return null

    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <h3 className="font-bold text-gray-800 text-lg">Generated Landing Page Code</h3>
          </div>
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openPreview}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <span>👁️</span>
              <span>Preview Website</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                navigator.clipboard.writeText(code)
                showNotification("✅ Code copied to clipboard!", "success")
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Copy Code
            </motion.button>
          </div>
        </div>
        <div className="p-6 bg-gray-900 max-h-96 overflow-auto">
          <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
            {code}
          </pre>
        </div>
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 <strong>Pro Tip:</strong> Click "Preview Website" to see your landing page in action, or copy the code to deploy instantly!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && landingCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-400 rounded-full cursor-pointer" onClick={closePreview}></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <h3 className="font-bold text-gray-800 text-lg">Website Preview - {result?.name}</h3>
                </div>
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      navigator.clipboard.writeText(landingCode)
                      showNotification("✅ Code copied to clipboard!", "success")
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    Copy Code
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closePreview}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    Close
                  </motion.button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-gray-100 rounded-b-3xl overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Website Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl mb-8"
          >
            <span className="text-3xl text-white">🚀</span>
          </motion.div>
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6">
            PitchCraft AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transform your startup idea into a complete business package with AI-powered pitch generation and professional website code.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 mb-12"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs mr-2">STEP 1</span>
                Describe Your Startup Vision
              </label>
              <motion.textarea
                whileFocus={{ scale: 1.005 }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="💡 Example: I want to build an AI-powered fitness app that creates personalized workout plans with real-time form correction using computer vision, targeting busy professionals who want effective home workouts..."
                className="w-full min-h-[200px] p-6 rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none resize-none shadow-inner bg-white/50 backdrop-blur-sm text-gray-700 placeholder-gray-400 transition-all duration-300"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-bold text-white shadow-2xl transition-all duration-300 relative overflow-hidden ${
                loading
                  ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 hover:shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>AI is crafting your startup...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨
                  </motion.span>
                  <span>Generate Complete Startup Package</span>
                </div>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="mb-12"
            >
              {/* Enhanced Tabs */}
              <motion.div 
                className="flex space-x-2 mb-8 bg-white/50 backdrop-blur-sm rounded-2xl p-2 w-fit mx-auto border border-white/30 shadow-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[
                  { id: "pitch", label: "📊 Pitch Details", icon: "💼" },
                  { id: "website", label: "🌐 Website Code", icon: "🚀" }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? "bg-white text-blue-600 shadow-lg"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </motion.button>
                ))}
              </motion.div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === "pitch" && (
                  <motion.div
                    key="pitch"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <RenderPitchDetails data={result} />
                  </motion.div>
                )}

                {activeTab === "website" && landingCode && (
                  <motion.div
                    key="website"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <RenderWebsiteCode code={landingCode} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}