import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SuggestedResponseBoxProps {
  response: string;
  onSelect: () => void;
  disabled?: boolean;
}

export function SuggestedResponseBox({
  response,
  onSelect,
  disabled,
}: SuggestedResponseBoxProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full flex items-center",
        disabled && "opacity-50",
      )}
      onClick={onSelect}
    >
      <CardContent className="flex items-center w-full">
        <p className="text-sm leading-relaxed">{response}</p>
      </CardContent>
    </Card>
  );
}
