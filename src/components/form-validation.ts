import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { message } from "../lib/api";
export function useFormValidation() {
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (Object.keys(fields).length)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [fields]);
  return {
    formRef,
    fields,
    error,
    clear: () => {
      setError("");
      setFields({});
    },
    fail: (value: unknown) => {
      setError(message(value));
      setFields(
        isAxiosError(value) ? (value.response?.data?.fields ?? {}) : {},
      );
    },
    invalidate: (text: string, errors: Record<string, string> = {}) => {
      setError(text);
      setFields(errors);
    },
  };
}
