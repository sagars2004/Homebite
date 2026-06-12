import { useRef, useState, type ComponentType } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cookingSession } from "@/lib/cooking-session";
import { extractIngredients } from "@/lib/vision.functions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type PhotoUploadButtonProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  source: "receipt" | "fridge";
  note?: string;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read that photo."));
    reader.readAsDataURL(file);
  });
}

export function PhotoUploadButton({ icon: Icon, label, source, note }: PhotoUploadButtonProps) {
  const navigate = useNavigate();
  const extract = useServerFn(extractIngredients);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That photo is a bit large — try a smaller one or just type what you have.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      const result = await extract({
        data: { imageBase64: base64, mimeType: file.type || "image/jpeg", source },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const existing = cookingSession.getInput();
      cookingSession.setInput({
        ingredients: Array.from(new Set([...(existing?.ingredients ?? []), ...result.ingredients])),
        time: existing?.time ?? "Normal (40 min)",
        vibe: existing?.vibe ?? "Comfort food",
      });
      cookingSession.clearRecipe();
      navigate({ to: "/ingredients" });
    } catch {
      setError(
        source === "fridge"
          ? "Couldn't read that fridge photo — try better lighting or just type what you have."
          : "Couldn't read that receipt — try better lighting or just type what you have.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="h-16 w-full justify-start rounded-xl px-5 text-base shadow-none disabled:opacity-70"
      >
        {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Icon className="mr-2 size-5" />}
        {busy ? "Reading your photo…" : label}
        {busy ? null : note ? (
          <small className="ml-auto text-xs font-normal opacity-70">{note}</small>
        ) : (
          <ChevronRight className="ml-auto size-5" />
        )}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 px-1 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
