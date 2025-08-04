"use client"

import { CharacterId } from "@/lib/characters"

interface CharacterAvatarProps {
  characterId: CharacterId
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function CharacterAvatar({ characterId, size = "md", className = "" }: CharacterAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  }

  const avatars = {
    [CharacterId.Fiona]: (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200 flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="fiona-hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="fiona-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
          </defs>
          
          {/* Hair */}
          <path d="M20 45 Q20 20 50 20 Q80 20 80 45 Q85 50 80 60 L75 50 Q70 45 50 45 Q30 45 25 50 L20 60 Q15 50 20 45" fill="url(#fiona-hair)" />
          
          {/* Face */}
          <ellipse cx="50" cy="55" rx="22" ry="25" fill="url(#fiona-face)" />
          
          {/* Eyes */}
          <ellipse cx="42" cy="48" rx="4" ry="5" fill="#3B82F6" />
          <ellipse cx="58" cy="48" rx="4" ry="5" fill="#3B82F6" />
          <ellipse cx="42" cy="47" rx="2" ry="2" fill="white" />
          <ellipse cx="58" cy="47" rx="2" ry="2" fill="white" />
          
          {/* Smile */}
          <path d="M40 60 Q50 68 60 60" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Sparkles */}
          <g fill="#FBBF24" opacity="0.8">
            <polygon points="25,35 27,39 31,37 27,41 25,45 23,41 19,37 23,39" />
            <polygon points="75,32 76,35 79,34 76,37 75,40 74,37 71,34 74,35" />
            <polygon points="15,65 16,67 18,66 16,68 15,70 14,68 12,66 14,67" />
          </g>
        </svg>
      </div>
    ),

    [CharacterId.Merlin]: (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-purple-400 via-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="merlin-beard" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E5E7EB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </linearGradient>
            <linearGradient id="merlin-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#F3E8FF" />
            </linearGradient>
            <linearGradient id="merlin-hat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4C1D95" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          
          {/* Wizard Hat */}
          <path d="M35 25 L50 5 L65 25 Q68 30 65 35 L35 35 Q32 30 35 25" fill="url(#merlin-hat)" />
          
          {/* Hat Stars */}
          <g fill="#FBBF24" opacity="0.9">
            <polygon points="45,15 46,17 48,16 46,18 45,20 44,18 42,16 44,17" />
            <polygon points="55,20 56,22 58,21 56,23 55,25 54,23 52,21 54,22" />
          </g>
          
          {/* Face */}
          <ellipse cx="50" cy="50" rx="20" ry="22" fill="url(#merlin-face)" />
          
          {/* Beard */}
          <path d="M30 60 Q35 65 50 68 Q65 65 70 60 Q72 70 65 75 Q50 80 35 75 Q28 70 30 60" fill="url(#merlin-beard)" />
          
          {/* Eyes */}
          <ellipse cx="43" cy="45" rx="3" ry="4" fill="#1E40AF" />
          <ellipse cx="57" cy="45" rx="3" ry="4" fill="#1E40AF" />
          <ellipse cx="43" cy="44" rx="1.5" ry="1.5" fill="white" />
          <ellipse cx="57" cy="44" rx="1.5" ry="1.5" fill="white" />
          
          {/* Eyebrows */}
          <path d="M38 40 Q43 38 48 40" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M52 40 Q57 38 62 40" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Mustache */}
          <path d="M42 55 Q50 58 58 55" stroke="#9CA3AF" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),

    [CharacterId.Cassian]: (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-slate-300 via-blue-200 to-slate-400 flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="cassian-hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6B7280" />
              <stop offset="100%" stopColor="#4B5563" />
            </linearGradient>
            <linearGradient id="cassian-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          
          {/* Hair */}
          <path d="M25 40 Q25 25 50 25 Q75 25 75 40 Q78 45 75 50 Q70 45 65 42 Q60 40 50 40 Q40 40 35 42 Q30 45 25 50 Q22 45 25 40" fill="url(#cassian-hair)" />
          
          {/* Face */}
          <ellipse cx="50" cy="55" rx="22" ry="24" fill="url(#cassian-face)" />
          
          {/* Glasses */}
          <g stroke="#374151" strokeWidth="2" fill="none">
            <circle cx="42" cy="48" r="8" />
            <circle cx="58" cy="48" r="8" />
            <path d="M50 48 L50 48" strokeWidth="3" />
            <path d="M34 46 Q30 44 26 46" />
            <path d="M66 46 Q70 44 74 46" />
          </g>
          
          {/* Eyes behind glasses */}
          <ellipse cx="42" cy="48" rx="3" ry="4" fill="#1F2937" />
          <ellipse cx="58" cy="48" rx="3" ry="4" fill="#1F2937" />
          <ellipse cx="42" cy="47" rx="1.5" ry="1.5" fill="white" />
          <ellipse cx="58" cy="47" rx="1.5" ry="1.5" fill="white" />
          
          {/* Subtle smile */}
          <path d="M44 62 Q50 66 56 62" stroke="#D97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          
          {/* Bow tie suggestion */}
          <path d="M45 75 Q50 78 55 75" stroke="#7C2D12" strokeWidth="2" fill="none" />
        </svg>
      </div>
    ),

    [CharacterId.Brody]: (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-cyan-200 via-blue-300 to-teal-300 flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="brody-hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="brody-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="100%" stopColor="#FDBA74" />
            </linearGradient>
          </defs>
          
          {/* Messy surfer hair */}
          <path d="M22 42 Q25 20 35 25 Q40 15 50 20 Q60 15 65 25 Q75 20 78 42 Q80 50 75 55 Q70 50 65 48 Q55 45 50 48 Q45 45 35 48 Q30 50 25 55 Q20 50 22 42" fill="url(#brody-hair)" />
          
          {/* Face with tan */}
          <ellipse cx="50" cy="58" rx="20" ry="22" fill="url(#brody-face)" />
          
          {/* Eyes - relaxed/sleepy */}
          <ellipse cx="43" cy="52" rx="3" ry="3" fill="#16A34A" />
          <ellipse cx="57" cy="52" rx="3" ry="3" fill="#16A34A" />
          <ellipse cx="43" cy="51" rx="1.5" ry="1.5" fill="white" />
          <ellipse cx="57" cy="51" rx="1.5" ry="1.5" fill="white" />
          
          {/* Chill smile */}
          <path d="M42 65 Q50 70 58 65" stroke="#EA580C" strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Sunglasses on forehead */}
          <g stroke="#1F2937" strokeWidth="1.5" fill="none" opacity="0.7">
            <ellipse cx="45" cy="35" rx="5" ry="3" />
            <ellipse cx="55" cy="35" rx="5" ry="3" />
            <path d="M50 35 L50 35" strokeWidth="2" />
          </g>
          
          {/* Beach vibes - small wave */}
          <path d="M15 80 Q25 75 35 80 Q45 85 55 80 Q65 75 75 80 Q85 85 95 80" stroke="#0EA5E9" strokeWidth="2" fill="none" opacity="0.6" />
        </svg>
      </div>
    )
  }

  return avatars[characterId] || null
}