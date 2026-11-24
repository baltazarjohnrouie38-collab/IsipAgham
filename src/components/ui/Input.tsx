import React from 'react';

const BASE_FIELD_CLASS =
  'w-full rounded-xl bg-white dark:bg-neutral-950 border border-stone-300 dark:border-neutral-700 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors';

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
        className="block text-sm font-medium text-slate-800 dark:text-neutral-200"
      >
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
    ) : hint ? (
      <p className="text-xs text-slate-500 dark:text-neutral-400">{hint}</p>
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
            error ? 'border-red-500 focus:ring-red-500' : ''
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
          error ? 'border-red-500 focus:ring-red-500' : ''
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
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
};
