'use client';

import { useState } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export default function LanguageSelector({
  value,
  onChange,
  disabled,
  label,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = LANGUAGES.find((l) => l.code === value);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-lg
          bg-[#141414] border border-[#2a2a2a] text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#3a3a3a] cursor-pointer'}
          transition-colors
        `}
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{selectedLanguage?.flag}</span>
          <span className="text-white">{selectedLanguage?.name || 'Select language'}</span>
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => {
                  onChange(language.code);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  hover:bg-[#1a1a1a] transition-colors
                  ${value === language.code ? 'bg-emerald-500/10 text-emerald-400' : 'text-white'}
                `}
              >
                <span className="text-xl">{language.flag}</span>
                <span>{language.name}</span>
                {value === language.code && (
                  <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
