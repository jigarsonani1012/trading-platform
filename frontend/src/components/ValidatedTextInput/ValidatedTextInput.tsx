import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidatedTextInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidSubmit?: () => void;
    placeholder?: string;
    label?: string;
    description?: string;
    maxLength?: number;
    validate?: (value: string) => { isValid: boolean; error: string | null };
    className?: string;
    autoFocus?: boolean;
}

const ValidatedTextInput: React.FC<ValidatedTextInputProps> = ({
    value,
    onChange,
    onValidSubmit,
    placeholder = '',
    label = '',
    description = '',
    maxLength = 25,
    validate,
    className = '',
    autoFocus = false,
}) => {
    const [touched, setTouched] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        // Enforce max length
        if (newValue.length > maxLength) {
            newValue = newValue.slice(0, maxLength);
        }

        onChange(newValue);

        // Real-time validation if provided
        if (validate && touched) {
            const result = validate(newValue);
            setLocalError(result.error);
        }
    };

    const handleBlur = () => {
        setTouched(true);
        if (validate) {
            const result = validate(value);
            setLocalError(result.error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onValidSubmit && (!validate || !localError)) {
            onValidSubmit();
        }
    };

    const isValid = validate ? validate(value).isValid : true;
    const showError = touched && !isValid && localError;
    const characterCount = value.length;

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    maxLength={maxLength}
                    className={`
                        w-full rounded-xl border bg-gray-900/70 px-4 py-3 
                        text-gray-100 placeholder:text-gray-500 
                        focus:outline-none focus:ring-2 transition-all
                        ${showError
                            ? 'border-red-500 focus:ring-red-500/20'
                            : isValid && value
                                ? 'border-green-500 focus:ring-green-500/20'
                                : 'border-gray-700 focus:ring-blue-500/20 focus:border-blue-500'
                        }
                    `}
                />

                {/* Validation Icons */}
                {value && !showError && isValid && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {showError && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
            </div>

            {/* Character Counter */}
            <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-500">
                    {description && <span>{description}</span>}
                </div>
                <div className={`text-xs ${characterCount > maxLength * 0.8 ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {characterCount}/{maxLength}
                </div>
            </div>

            {/* Error Message */}
            {showError && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {localError}
                </p>
            )}
        </div>
    );
};

export default ValidatedTextInput;