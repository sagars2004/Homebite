import { X } from "lucide-react";

export function IngredientChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
      {name}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
