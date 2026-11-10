import { useId, type ComponentProps, type ReactNode } from "react";

interface FieldChrome {
  label: string;
  error?: string;
  hint?: string;
}

interface ShellProps extends FieldChrome {
  fieldId: string;
  children: ReactNode;
}

function FieldShell({ fieldId, label, error, hint, children }: ShellProps) {
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      {children}
      {hint && (
        <p id={`${fieldId}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function a11yProps(fieldId: string, { error, hint }: FieldChrome) {
  const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(" ");
  return {
    id: fieldId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

export function TextField({ label, error, hint, id, ...rest }: FieldChrome & ComponentProps<"input">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell fieldId={fieldId} label={label} error={error} hint={hint}>
      <input className="input" {...a11yProps(fieldId, { label, error, hint })} {...rest} />
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, id, ...rest }: FieldChrome & ComponentProps<"textarea">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell fieldId={fieldId} label={label} error={error} hint={hint}>
      <textarea className="input" rows={4} {...a11yProps(fieldId, { label, error, hint })} {...rest} />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, id, children, ...rest }: FieldChrome & ComponentProps<"select">) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell fieldId={fieldId} label={label} error={error} hint={hint}>
      <select className="input" {...a11yProps(fieldId, { label, error, hint })} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}
