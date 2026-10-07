import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export default function PasswordInput({
  label,
  id,
  className,
  ...inputProps
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <label className={["password-field", className].filter(Boolean).join(" ")} htmlFor={inputId}>
      {label}
      <span className="password-field-control">
        <input {...inputProps} id={inputId} type={visible ? "text" : "password"} />
        <button
          className="password-visibility-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5z"
              />
              <path
                fill="currentColor"
                d="M3.3 3.3a1 1 0 0 1 1.4 0l16 16a1 1 0 1 1-1.4 1.4l-16-16a1 1 0 0 1 0-1.4z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5z"
              />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
