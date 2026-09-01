import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface DecisionNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export function DecisionNoteField({
  value,
  onChange,
  minLength = 6,
  maxLength = 500,
  label = "Catatan Keputusan",
  placeholder = "Jelaskan alasan keputusan ini...",
  required = true,
  error,
  helperText,
  disabled = false,
}: DecisionNoteFieldProps) {
  const isValid = value.trim().length >= minLength;
  const characterCount = value.length;

  return (
    <div className="space-y-2">
      <Label htmlFor="decision-note">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        id="decision-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("min-h-[120px]", error && "border-destructive")}
      />
      <div className="flex flex-col justify-between gap-1 text-xs text-muted-foreground sm:flex-row">
        <div>
          {characterCount}/{maxLength} karakter
          {!isValid && <span className="ml-1 text-destructive">• minimal {minLength} karakter diperlukan</span>}
        </div>
        {helperText && <p className="text-muted-foreground">{helperText}</p>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
