"use client";

import { useState } from "react";
import { CharacterId } from "@/lib/characters";
import { CharacterTypeSelector } from "@/components/character-selector";

interface CharacterSelectionModalProps {
  onSelect: (character: CharacterId) => void;
}

export function CharacterSelectionModal({
  onSelect,
}: CharacterSelectionModalProps) {
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterId | null>(null);

  const handleCharacterSelect = (character: CharacterId) => {
    setSelectedCharacter(character);
    onSelect(character);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1
              className="text-4xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-medieval-sharp)" }}
            >
              Time Travel Academy
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your guide for an unforgettable journey through time.
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
          <p className="text-sm text-muted-foreground">
            You can change your selection at any time in the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}
