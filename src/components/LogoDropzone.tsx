import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

async function fileToResizedDataUrl(file: File, maxSize = 480): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("File bukan gambar yang valid"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

export interface LogoDropzoneProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function LogoDropzone({ value, onChange, label = "Logo Penyelenggara", hint, className }: LogoDropzoneProps) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return toast.error("Hanya file gambar yang didukung");
      if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran maksimal 5MB");
      setBusy(true);
      try {
        onChange(await fileToResizedDataUrl(file));
        toast.success("Logo dimuat");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat logo");
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
          over ? "border-accent bg-accent/10" : "border-border bg-muted/30 hover:border-primary",
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : value ? (
          <>
            <img src={value} alt="Logo penyelenggara" className="max-h-24 max-w-full object-contain" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label="Hapus logo"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">Tarik & lepas gambar logo di sini</p>
            <p className="text-xs text-muted-foreground">{hint ?? "atau klik untuk memilih file (PNG/JPG, maks 5MB)"}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
