import { useState, useRef, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, theme, setTheme, t } = useSettings();
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
            <div className="p-3">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
