interface SpinnerProps {
  /** Accessible text. Omit when the spinner sits next to visible text (decorative). */
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  if (!label) return <span className="spinner" aria-hidden="true" />;
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
