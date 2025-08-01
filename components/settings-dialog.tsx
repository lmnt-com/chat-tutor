"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { Separator } from "@/components/ui/separator"
import { CharacterId } from "@/lib/characters"
import { CharacterTypeSelector } from "@/components/character-selector"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCharacter: CharacterId
  onCharacterSelect: (character: CharacterId) => void
  imageGenerationEnabled: boolean
  onImageGenerationToggle: (enabled: boolean) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  currentCharacter,
  onCharacterSelect,
  imageGenerationEnabled,
  onImageGenerationToggle
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
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="image-generation">Image Generation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate images to enhance learning
                  </p>
                </div>
                <Switch
                  id="image-generation"
                  checked={imageGenerationEnabled}
                  onCheckedChange={onImageGenerationToggle}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              You can change your guide and preferences at any time.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
