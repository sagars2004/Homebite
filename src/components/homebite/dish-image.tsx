import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type DishImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Shows a real photo of the dish when we have one. If there's no image, or the
 * URL fails to load, it renders a clean branded placeholder rather than a
 * random unrelated food photo — so the picture never misrepresents the recipe.
 */
export function DishImage({ src, alt, className, width, height }: DishImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} — no photo available`}
        className={cn(
          "flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-muted text-muted-foreground",
          className,
        )}
      >
        <UtensilsCrossed className="size-9" />
        <span className="px-6 text-center text-sm font-medium">
          No photo for this one — but the recipe’s all here.
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
}
