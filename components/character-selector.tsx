"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CharacterId, CHARACTERS } from "@/lib/characters"

interface CharacterTypeSelectorProps {
  selectedCharacter: CharacterId | null
  onCharacterSelect: (character: CharacterId) => void
  variant?: "compact" | "full"
}

export function CharacterTypeSelector({ 
  selectedCharacter, 
  onCharacterSelect, 
  variant = "full" 
}: CharacterTypeSelectorProps) {
  const isCompact = variant === "compact"
  
  return (
    <div className={cn(
      "grid gap-3",
      isCompact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 gap-6"
    )}>
      {Object.values(CHARACTERS).map((character) => {
        const Icon = character.icon
        return (
          <Card
            key={character.id}
            className={cn(
              "cursor-pointer transition-all duration-200 border-2 bg-gray-50 border-gray-200 hover:bg-gray-100",
              selectedCharacter === character.id && "ring-2 ring-blue-500 ring-offset-2"
            )}
            onClick={() => onCharacterSelect(character.id)}
          >
            <CardHeader>
              <div className={cn("flex items-center gap-2", !isCompact && "gap-3")}>
                <div className={cn(
                  "rounded-md bg-white", 
                  character.iconColor,
                  isCompact ? "p-1.5" : "p-2 rounded-lg"
                )}>
                  <Icon className={cn(isCompact ? "size-4" : "size-6")} />
                </div>
                <div>
                  <CardTitle className={cn(isCompact ? "text-sm" : "text-lg")}>
                    {character.displayName}
                  </CardTitle>
                  <CardDescription className={cn(
                    isCompact ? "text-xs" : "text-sm font-medium"
                  )}>
                    {character.subtitle}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={cn(
                "text-gray-600 leading-relaxed",
                isCompact ? "text-sm" : "text-base"
              )}>
                {character.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
