"use client";
import { useId, useRef } from "react";
import { Delete, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/limits";

/**
 * 6–8 digit PIN entry (DESIGN §9.4). One real input underneath so paste, password
 * managers and screen readers work; slots are the visual. Masked by default.
 */
export function PinKeypad({
  value,
  onChange,
  onSubmit,
  disabled,
  shake,
  label = "PIN",
  describedBy,
  autoFocus,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  shake?: boolean;
  label?: string;
  describedBy?: string;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();
  const slots = Math.max(LIMITS.pinMinLength, Math.min(LIMITS.pinMaxLength, value.length + (value.length >= LIMITS.pinMinLength ? 0 : 0)));

  const press = (d: string) => value.length < LIMITS.pinMaxLength && onChange(value + d);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="fs-micro text-moondust">
          {label}
        </label>
        <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-1 text-xs text-moondust hover:text-starlight" aria-pressed={show}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className={cn("relative", shake && "anim-shake")} onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LIMITS.pinMaxLength))}
          onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          maxLength={LIMITS.pinMaxLength}
          type={show ? "text" : "password"}
          data-testid="pin-input"
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: slots }, (_, i) => {
            const ch = value[i];
            const active = i === value.length;
            return (
              <span
                key={i}
                className={cn(
                  "font-mono-cargo grid h-14 w-11 place-items-center rounded-xl border-2 bg-hull text-2xl font-semibold transition-[border-color,box-shadow]",
                  invalid ? "border-redshift" : active ? "border-nebula shadow-[0_0_0_4px_color-mix(in_srgb,var(--nebula)_20%,transparent)]" : "border-line",
                  ch && !invalid && "border-plasma",
                )}
              >
                {ch ? (show ? ch : <span className="text-nebula">●</span>) : ""}
              </span>
            );
          })}
        </div>
      </div>
      {/* On-screen keypad for touch devices */}
      <div className="hidden grid-cols-3 gap-2 [@media(pointer:coarse)]:grid" aria-hidden={disabled}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className="font-mono-cargo h-14 rounded-xl border-2 border-line bg-hull text-xl font-semibold active:bg-hull-2">
            {d}
          </button>
        ))}
        <span />
        <button type="button" disabled={disabled} onClick={() => press("0")} className="font-mono-cargo h-14 rounded-xl border-2 border-line bg-hull text-xl font-semibold active:bg-hull-2">
          0
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(value.slice(0, -1))} aria-label="Delete last digit" className="grid h-14 place-items-center rounded-xl border-2 border-line bg-hull active:bg-hull-2">
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
