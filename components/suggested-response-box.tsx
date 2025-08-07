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
        "cursor-pointer hover:bg-muted bg-transparent shadow-sm hover:shadow-md transition-all duration-300 h-full flex items-center justify-center",
        disabled && "opacity-50",
      )}
      onClick={onSelect}
    >
      <CardContent className="flex items-center w-full">
        <p
          className="text-sm leading-relaxed"
          style={{ fontFamily: "var(--font-lato)" }}
        >
          {response}
        </p>
      </CardContent>
    </Card>
  );
}
