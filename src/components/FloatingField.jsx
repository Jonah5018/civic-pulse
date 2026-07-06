import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A floating-label field with a glowing focus ring, used across the whole
 * app so every input/select/textarea shares one futuristic look.
 *
 * as: "input" | "textarea" | "select"
 */
export default function FloatingField({
  as = "input",
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  rows = 3,
  children, // <option> elements when as="select"
  icon: Icon,
  name,
  autoComplete,
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const floated = focused || hasValue;

  const baseFieldClasses =
    "peer w-full rounded-xl bg-surface/60 border text-ink placeholder-transparent " +
    "px-4 pt-5 pb-2 text-sm outline-none transition-all duration-200 " +
    (focused
      ? "border-cyan shadow-[0_0_0_3px_rgba(41,211,245,0.15),0_0_20px_rgba(41,211,245,0.25)]"
      : "border-border-soft hover:border-border-strong") +
    (Icon ? " pl-11" : "");

  const sharedProps = {
    id,
    name,
    value: value ?? "",
    onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    required,
    disabled,
    placeholder: label,
    autoComplete,
    className: baseFieldClasses,
    ...rest,
  };

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
            focused ? "text-cyan" : "text-ink-faint"
          }`}
        />
      )}

      {as === "textarea" && <textarea rows={rows} {...sharedProps} />}

      {as === "select" && (
        <>
          <select {...sharedProps} className={`${baseFieldClasses} appearance-none pr-10`}>
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        </>
      )}

      {as === "input" && <input type={type} {...sharedProps} />}

      <label
        htmlFor={id}
        className={`absolute pointer-events-none transition-all duration-200 ${
          Icon ? "left-11" : "left-4"
        } ${
          floated
            ? "top-1.5 text-[10px] tracking-wide uppercase font-medium text-cyan"
            : "top-1/2 -translate-y-1/2 text-sm text-ink-muted"
        }`}
      >
        {label} {required && !floated && <span className="text-rose">*</span>}
      </label>
    </div>
  );
}
