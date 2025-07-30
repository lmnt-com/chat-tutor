"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Separator } from "@/components/ui/separator"
import { CharacterId } from "@/lib/characters"
import { CharacterTypeSelector } from "@/components/character-selector"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCharacter: CharacterId
  onCharacterSelect: (character: CharacterId) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  currentCharacter,
  onCharacterSelect
}: SettingsDialogProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(currentCharacter)

  useEffect(() => {
    if (selectedCharacter !== currentCharacter) {
      onCharacterSelect(selectedCharacter)
    }
  }, [selectedCharacter, currentCharacter, onCharacterSelect])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your learning experience by adjusting your preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose your guide</h3>
            <CharacterTypeSelector
              selectedCharacter={selectedCharacter}
              onCharacterSelect={setSelectedCharacter}
              variant="compact"
            />
          </div>
          
          <Separator />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              You can change your guide at any time.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
