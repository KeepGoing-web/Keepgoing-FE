const AuthField = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  required = true,
  maxLength,
  error,
}) => {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="auth-field">
      <label className={`auth-label ${error ? 'auth-label--invalid' : ''}`} htmlFor={id}>
        {label}
      </label>
      <input
        className={`auth-input ${error ? 'auth-input--invalid' : ''}`}
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
      />
      {error ? (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default AuthField
