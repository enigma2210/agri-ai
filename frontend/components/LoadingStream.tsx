'use client'

export default function LoadingStream() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-center gap-2.5">
        {/* Agent avatar */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
          🌱
        </div>
        {/* Typing dots */}
        <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-float border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
