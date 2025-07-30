"use client"

import { useState } from "react"
import { CharacterId } from "@/lib/characters"
import { CharacterTypeSelector } from "@/components/character-selector"

interface CharacterSelectionModalProps {
  onSelect: (character: CharacterId) => void
}

export function CharacterSelectionModal({ onSelect }: CharacterSelectionModalProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId | null>(null)

  const handleCharacterSelect = (character: CharacterId) => {
    setSelectedCharacter(character)
    onSelect(character)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Time Travel Academy
              </h1>
              <p className="text-xl text-gray-600">
                Your personal history tutor
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Select your guide for an unforgettable journey through time. Each character brings their unique style and expertise to make history come alive!
          </p>
        </div>

        <div className="mb-8">
          <CharacterTypeSelector
            selectedCharacter={selectedCharacter}
            onCharacterSelect={handleCharacterSelect}
            variant="full"
          />
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            You can change your selection at any time in the sidebar.
          </p>
        </div>
      </div>
    </div>
  )
}
