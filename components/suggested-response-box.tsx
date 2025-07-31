import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SuggestedResponseBoxProps {
  response: string
  onSelect: () => void
  disabled?: boolean
}

export function SuggestedResponseBox({ response, onSelect, disabled }: SuggestedResponseBoxProps) {
  return (
    <Card className={cn("cursor-pointer hover:bg-gray-100 shadow-sm hover:shadow-md transition-all duration-300", disabled && "opacity-50")} onClick={onSelect}>
      <CardContent>
        <p className="text-sm leading-relaxed">{response}</p>
      </CardContent>
    </Card>
  )
}
