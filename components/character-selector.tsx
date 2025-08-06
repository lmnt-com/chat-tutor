"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CharacterId, CHARACTERS } from "@/lib/characters";
import { CharacterAvatar } from "@/components/character-avatar";

interface CharacterTypeSelectorProps {
  selectedCharacter: CharacterId | null;
  onCharacterSelect: (character: CharacterId) => void;
  variant?: "compact" | "full";
}

export function CharacterTypeSelector({
  selectedCharacter,
  onCharacterSelect,
  variant = "full",
}: CharacterTypeSelectorProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "grid gap-3",
        isCompact
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-2 gap-6",
      )}
    >
      {Object.values(CHARACTERS).map((character) => {
        const themeClass = `theme-${character.id}`;
        return (
          <div key={character.id} className={themeClass}>
            <Card
              className={cn(
                "character-card cursor-pointer transition-all duration-300 h-full flex flex-col",
                selectedCharacter === character.id
                  ? "ring-2 ring-blue-500 ring-offset-2 selected cursor-default"
                  : "hover:shadow-md",
              )}
              onClick={() => onCharacterSelect(character.id)}
            >
              <CardHeader className="flex-shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-2",
                    !isCompact && "gap-3",
                  )}
                >
                  <CharacterAvatar
                    characterId={character.id}
                    size={isCompact ? "md" : "lg"}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle
                      className={cn(
                        "text-gray-900",
                        isCompact ? "text-sm" : "text-lg",
                      )}
                    >
                      {character.displayName}
                    </CardTitle>
                    <CardDescription
                      className={cn(
                        "font-medium text-gray-600",
                        isCompact ? "text-xs" : "text-sm",
                      )}
                    >
                      {character.subtitle}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p
                  className={cn(
                    "text-gray-600 leading-relaxed flex-1",
                    isCompact ? "text-sm" : "text-base",
                  )}
                >
                  {character.description}
                </p>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
