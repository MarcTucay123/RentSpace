"use client";

import { useEffect } from "react";

import { capitalizeFirstLetter } from "@/lib/text/format";

const excludedInputTypes = new Set([
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "email",
  "file",
  "hidden",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "search",
  "tel",
  "time",
  "url",
  "week",
]);

export function AutoCapitalizeInputs() {
  useEffect(() => {
    function handleTextEntry(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      if (field.dataset.noAutoCapitalize !== undefined) return;
      if (field instanceof HTMLInputElement && excludedInputTypes.has(field.type)) return;

      const capitalizedValue = capitalizeFirstLetter(field.value);
      if (capitalizedValue === field.value) return;

      const selectionStart = field.selectionStart;
      const selectionEnd = field.selectionEnd;
      field.value = capitalizedValue;
      if (selectionStart !== null && selectionEnd !== null) field.setSelectionRange(selectionStart, selectionEnd);
    }

    document.addEventListener("input", handleTextEntry, true);
    return () => document.removeEventListener("input", handleTextEntry, true);
  }, []);

  return null;
}