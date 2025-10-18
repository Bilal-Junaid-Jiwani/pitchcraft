import { useState, useEffect } from "react"
import { supabase } from "./lib/supabaseClient"
import Auth from "./components/Auth"
import PitchForm from "./components/PitchForm"
import MyPitches from "./components/MyPitches"
import "./App.css"

export default function App() {
  const [user, setUser] = useState(null)
  const [currentView, setCurrentView] = useState("generate")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚀</span>
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                PitchCraft AI
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView("generate")}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  currentView === "generate"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/60"
                }`}
              >
                Generate Pitch
              </button>
              <button
                onClick={() => setCurrentView("my-pitches")}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  currentView === "my-pitches"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/60"
                }`}
              >
                My Pitches
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 text-gray-600 hover:text-red-600 font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "generate" ? (
          <PitchForm user={user} />
        ) : (
          <MyPitches user={user} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-xl border-t border-white/40 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Built with ❤️ by Bilal using React + Supabase + Gemini</p>
            <p className="text-sm mt-2 text-gray-500">
              Transform your ideas into compelling startup pitches with AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}