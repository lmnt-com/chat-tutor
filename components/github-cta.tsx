import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GithubCtaProps {
  variant?: "default" | "icon";
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

export function GithubCta({
  variant = "default",
  tooltipSide = "right",
}: GithubCtaProps) {
  const button = (
    <Button
      asChild
      variant="outline"
      className={`${variant === "icon" && "w-9"} animate-in fade-in`}
    >
      <a
        href="https://github.com/lmnt-com/chat-tutor"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Github className={`${variant === "default" && "mr-2"} size-4`} />
        {variant === "default" && "Fork this project"}
      </a>
    </Button>
  );

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>Fork this project</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
