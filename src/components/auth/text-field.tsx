"use client";

import { useState } from "react";

type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  rightAdornment?: string;
};

export function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  autoComplete,
  error,
  rightAdornment,
}: TextFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canTogglePassword = type === "password" && Boolean(rightAdornment);

  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[#294d4b] sm:text-[0.98rem]">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={canTogglePassword && passwordVisible ? "text" : type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full rounded-[16px] border border-[#d4e1de] bg-[#f5f8f6] px-4 py-3.5 text-base text-[#294d4b] outline-none transition placeholder:text-[#91a5a1] focus:border-[#5b8580] focus:bg-white focus:ring-2 focus:ring-[rgba(49,90,87,0.15)] sm:text-[1rem] ${rightAdornment ? "pr-16" : ""}`}
        />
        {canTogglePassword ? (
          <button
            type="button"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#315a57] hover:underline"
          >
            {passwordVisible ? "Hide" : rightAdornment}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </label>
  );
}