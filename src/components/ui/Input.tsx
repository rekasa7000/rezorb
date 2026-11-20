import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-[14px] border-2 border-line bg-hull px-4 text-starlight placeholder:text-dim transition-[border-color,box-shadow] focus:border-nebula focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--nebula)_20%,transparent)] aria-[invalid=true]:border-redshift";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, "h-12", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, "py-3", className)} {...p} />
));
Textarea.displayName = "Textarea";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const descId = hint || error ? `${id}-d` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="fs-micro block text-moondust">
        {label}
      </label>
      {children({ id, "aria-describedby": descId, "aria-invalid": error ? true : undefined })}
      {(error || hint) && (
        <p id={descId} role={error ? "alert" : undefined} className={cn("text-sm", error ? "text-redshift" : "text-dim")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
