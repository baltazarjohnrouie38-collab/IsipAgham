import React from 'react';

const BASE_FIELD_CLASS =
  'w-full rounded-[14px] bg-white/75 dark:bg-slate-950/60 backdrop-blur-md border border-white/80 dark:border-white/15 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20 focus:border-[#007AFF] dark:focus:border-[#3898FF] transition-all';

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, hint, error, id, children }) => (
  <div className="space-y-1.5">
    {label && (
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-800 dark:text-slate-200"
      >
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
    ) : hint ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    ) : null}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, id, className = '', ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} hint={hint} error={error} id={inputId}>
        <input
          ref={ref}
          id={inputId}
          className={`min-h-[44px] ${BASE_FIELD_CLASS} ${
            error ? 'border-red-500 focus:ring-red-500/20' : ''
          } ${className}`}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}) => {
  const areaId = id || React.useId();
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={areaId}>
      <textarea
        id={areaId}
        className={`${BASE_FIELD_CLASS} min-h-[110px] resize-y ${
          error ? 'border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  ...props
}) => {
  const selectId = id || React.useId();
  return (
    <FieldWrapper label={label} hint={hint} error={error} id={selectId}>
      <select
        id={selectId}
        className={`min-h-[44px] ${BASE_FIELD_CLASS} ${
          error ? 'border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
};
