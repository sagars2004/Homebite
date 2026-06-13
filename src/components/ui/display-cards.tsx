import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  cuisine?: string;
  title?: string;
  quote?: string;
  ingredients?: string[];
  meta?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-primary-foreground" />,
  cuisine = "Featured",
  title = "Discover amazing content",
  quote = "A little something for tonight.",
  ingredients = [],
  meta = "Just now",
  titleClassName = "text-foreground",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-[19rem] w-[18rem] -skew-y-[8deg] select-none flex-col justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 transition-all duration-700 hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary">
          {icon}
        </span>
        {cuisine ? (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-secondary-foreground">
            {cuisine}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 pr-4">
        <p className={cn("font-display text-2xl font-semibold leading-tight", titleClassName)}>
          {title}
        </p>
        {quote ? (
          <p className="line-clamp-2 text-sm italic leading-snug text-muted-foreground">
            “{quote}”
          </p>
        ) : null}
      </div>

      {ingredients.length ? (
        <div className="flex flex-wrap gap-1.5 pr-4">
          {ingredients.slice(0, 4).map((item) => (
            <span
              key={item}
              className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground/80"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-sm font-medium text-muted-foreground">{meta}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "[grid-area:stack] hover:-translate-y-12",
    },
    {
      className: "[grid-area:stack] translate-x-14 translate-y-14 hover:-translate-y-1",
    },
    {
      className: "[grid-area:stack] translate-x-28 translate-y-28 hover:translate-y-16",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid place-items-center opacity-100 duration-700 animate-in fade-in-0 [grid-template-areas:'stack']">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
