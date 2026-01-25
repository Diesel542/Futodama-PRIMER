import { useState, useRef, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import type { ModelOption } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';

const modelOptions: { value: ModelOption; label: string; description: string }[] = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Sonnet 3.5', description: 'Stable & reliable' },
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4', description: 'Latest model' },
  { value: 'claude-3-haiku-20240307', label: 'Haiku', description: 'Fast & light' },
];

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, theme, setTheme, semanticTransition, setSemanticTransition, model, setModel, t } = useSettings();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "text-gray-500 dark:text-gray-400"
        )}
        aria-label={t('settings.title')}
      >
        <Settings className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl border z-50",
              "bg-white dark:bg-gray-900",
              "border-gray-200 dark:border-gray-700"
            )}
          >
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('settings.title')}
              </h3>
            </div>

            {/* Language Setting */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('settings.language')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2",
                    language === 'en'
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  {language === 'en' && <Check className="w-3 h-3" />}
                  {t('settings.english')}
                </button>
                <button
                  onClick={() => setLanguage('da')}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2",
                    language === 'da'
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  {language === 'da' && <Check className="w-3 h-3" />}
                  {t('settings.danish')}
                </button>
              </div>
            </div>

            {/* Theme Setting */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('settings.theme')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2",
                    theme === 'light'
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  {theme === 'light' && <Check className="w-3 h-3" />}
                  {t('settings.light')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2",
                    theme === 'dark'
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  {theme === 'dark' && <Check className="w-3 h-3" />}
                  {t('settings.dark')}
                </button>
              </div>
            </div>

            {/* Semantic Transition Toggle */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.transition')}
                </span>
                <button
                  onClick={() => setSemanticTransition(!semanticTransition)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    semanticTransition
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      semanticTransition ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="p-3">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                AI Model
              </label>
              <div className="space-y-1">
                {modelOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setModel(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors",
                      model === option.value
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{option.description}</span>
                    </div>
                    {model === option.value && (
                      <Check className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
