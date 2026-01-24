# PATCH 004: Language Toggle + Dark Mode
## Priority: MEDIUM — User preferences

---

## Overview

Add a settings dropdown in the header with:
1. Language toggle (English / Danish)
2. Theme toggle (Light / Dark)

Both persist to localStorage.

---

## PART 1: Create Settings Context

**Create new file:** `/client/src/contexts/SettingsContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'da';
type Theme = 'light' | 'dark';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Translation strings
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'app.title': 'CV Health Check',
    
    // Upload state
    'upload.title': 'Upload CV',
    'upload.subtitle': 'Drag and drop or click to select',
    'upload.formats': 'PDF or DOCX supported',
    'upload.button': 'Choose File',
    
    // Preview state
    'preview.title': 'Ready to Analyze',
    'preview.description': 'Review the document preview, then click below to analyze and convert to CREADIS format.',
    'preview.analyze': 'Analyze CV',
    'preview.cancel': 'Cancel',
    
    // Scanning state
    'scanning.title': 'Analyzing structure and content...',
    
    // Complete state
    'complete.title': 'Analysis Complete',
    'complete.strengths': "What's working well",
    'complete.suggestions': 'Suggestions for improvement',
    'complete.clickToView': 'Click to view suggestion',
    'complete.suggestedChange': 'Suggested Change',
    'complete.back': 'Back',
    'complete.lock': 'Lock as is',
    'complete.apply': 'Apply Change',
    'complete.decline': 'Decline',
    'complete.accept': 'Accept Change',
    'complete.roleAlignment': 'Suggest role alignment draft',
    
    // Section types
    'section.summary': 'Summary',
    'section.experience': 'Experience',
    'section.education': 'Education',
    'section.skills': 'Skills',
    'section.projects': 'Projects',
    'section.other': 'Other',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.english': 'English',
    'settings.danish': 'Danish',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    
    // Dates
    'date.present': 'Present',
    
    // Errors
    'error.failedToLoadPdf': 'Failed to load PDF',
    'error.docxPreview': 'DOCX preview not available',
    'error.clickAnalyze': 'Click "Analyze CV" to process',
    'error.noCvContent': 'No CV content to display',
  },
  da: {
    // Header
    'app.title': 'CV Sundhedstjek',
    
    // Upload state
    'upload.title': 'Upload CV',
    'upload.subtitle': 'Træk og slip eller klik for at vælge',
    'upload.formats': 'PDF eller DOCX understøttet',
    'upload.button': 'Vælg fil',
    
    // Preview state
    'preview.title': 'Klar til analyse',
    'preview.description': 'Gennemgå dokumentet, og klik derefter nedenfor for at analysere og konvertere til CREADIS-format.',
    'preview.analyze': 'Analysér CV',
    'preview.cancel': 'Annuller',
    
    // Scanning state
    'scanning.title': 'Analyserer struktur og indhold...',
    
    // Complete state
    'complete.title': 'Analyse færdig',
    'complete.strengths': 'Hvad der fungerer godt',
    'complete.suggestions': 'Forslag til forbedring',
    'complete.clickToView': 'Klik for at se forslag',
    'complete.suggestedChange': 'Foreslået ændring',
    'complete.back': 'Tilbage',
    'complete.lock': 'Lås som den er',
    'complete.apply': 'Anvend ændring',
    'complete.decline': 'Afvis',
    'complete.accept': 'Acceptér ændring',
    'complete.roleAlignment': 'Foreslå rolletilpasning',
    
    // Section types
    'section.summary': 'Resumé',
    'section.experience': 'Erfaring',
    'section.education': 'Uddannelse',
    'section.skills': 'Kompetencer',
    'section.projects': 'Projekter',
    'section.other': 'Andet',
    
    // Settings
    'settings.title': 'Indstillinger',
    'settings.language': 'Sprog',
    'settings.theme': 'Tema',
    'settings.english': 'Engelsk',
    'settings.danish': 'Dansk',
    'settings.light': 'Lyst',
    'settings.dark': 'Mørkt',
    
    // Dates
    'date.present': 'Nu',
    
    // Errors
    'error.failedToLoadPdf': 'Kunne ikke indlæse PDF',
    'error.docxPreview': 'DOCX-forhåndsvisning ikke tilgængelig',
    'error.clickAnalyze': 'Klik "Analysér CV" for at behandle',
    'error.noCvContent': 'Intet CV-indhold at vise',
  },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cv-health-language') as Language) || 'en';
    }
    return 'en';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cv-health-theme') as Theme) || 'light';
    }
    return 'light';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cv-health-language', lang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('cv-health-theme', newTheme);
  };

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
```

---

## PART 2: Update Tailwind Config for Dark Mode

**File:** `tailwind.config.js` (or `tailwind.config.ts`)

**ADD** darkMode setting:

```js
module.exports = {
  darkMode: 'class',
  // ... rest of config
}
```

---

## PART 3: Wrap App with Settings Provider

**File:** `/client/src/App.tsx`

**ADD** the provider:

```tsx
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      {/* existing app content */}
    </SettingsProvider>
  );
}
```

---

## PART 4: Create Settings Dropdown Component

**Create new file:** `/client/src/components/SettingsDropdown.tsx`

```tsx
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
```

---

## PART 5: Update home.tsx

### 5A: Add imports and use settings

**ADD** at top of file:
```tsx
import { useSettings } from '../contexts/SettingsContext';
import { SettingsDropdown } from '../components/SettingsDropdown';
```

**ADD** inside the Home component:
```tsx
const { t, language } = useSettings();
```

### 5B: Update header with settings dropdown

**FIND** the header section and **UPDATE**:

```tsx
<header className="mb-8 flex items-center justify-between">
  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
    <div className="w-2 h-2 rounded-full bg-gray-400" />
    {t('app.title')}
  </div>
  <div className="flex items-center gap-4">
    {state !== "idle" && (pdfFile || cvData) && (
      <div className="text-xs text-gray-400 font-mono">
        {decodeFilename(pdfFile?.name || cvData?.fileName || '')}
      </div>
    )}
    <SettingsDropdown />
  </div>
</header>
```

### 5C: Replace all hardcoded strings with t() calls

**Examples:**

```tsx
// Upload state
<h3 className="text-lg font-medium text-gray-900 mb-1">{t('upload.title')}</h3>
<p className="text-sm text-gray-500 text-center mb-6">
  {t('upload.subtitle')}<br/>
  <span className="text-xs opacity-70">{t('upload.formats')}</span>
</p>
<button ...>{t('upload.button')}</button>

// Preview state
<h2 className="text-2xl font-medium text-gray-900 mb-2">{t('preview.title')}</h2>
<p className="text-sm text-gray-600 text-center leading-relaxed">{t('preview.description')}</p>
<button onClick={handleAnalyze} ...>{t('preview.analyze')}</button>
<button onClick={handleCancel} ...>{t('preview.cancel')}</button>

// Scanning state
<div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
  <Loader2 className="w-4 h-4 animate-spin" />
  {t('scanning.title')}
</div>

// Complete state
<h1 className="text-xl font-medium text-gray-900">{t('complete.title')}</h1>
<h2 ...>{t('complete.strengths')}</h2>
<h2 ...>{t('complete.suggestions')}</h2>
<span ...>{t('complete.clickToView')}</span>
// etc.

// Section headers
<h3 ...>{t('section.experience')}</h3>
<h3 ...>{t('section.education')}</h3>
// etc.
```

### 5D: Add dark mode classes throughout

**Container:**
```tsx
<div className="min-h-screen bg-background dark:bg-gray-950 text-foreground dark:text-gray-100 flex font-sans">
```

**Left panel:**
```tsx
<div className="w-[60%] h-screen p-8 border-r border-border dark:border-gray-800 flex flex-col relative overflow-hidden bg-gray-50/50 dark:bg-gray-900">
```

**Right panel:**
```tsx
<div className="w-[40%] h-screen overflow-y-auto bg-white dark:bg-gray-950">
```

**Cards and containers:**
```tsx
<div className="... bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ...">
```

**Text colors:**
```tsx
<p className="text-gray-500 dark:text-gray-400">
<h2 className="text-gray-900 dark:text-gray-100">
```

**IMPORTANT: CV Viewer stays light**

The CV preview/content area should ALWAYS be light (white background) even in dark mode:

```tsx
{/* CV content - always light */}
<div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
  {/* No dark: variants here */}
  {renderCVSections()}
</div>
```

---

## PART 6: Update API to Accept Language Parameter

### 6A: Update routes.ts

**File:** `/server/routes.ts`

**UPDATE** the analyze endpoint to accept language:

```tsx
app.post("/api/cv/analyze", upload.single("file"), async (req, res) => {
  try {
    // Get language from header
    const language = req.headers['x-language'] as string || 'en';
    
    // ... existing file processing code ...

    // Pass language to LLM calls
    const phrasedObservations = await Promise.all(
      rawObservations.map(async (raw) => {
        // ... existing context building ...
        const message = await phraseObservation(observationContext, language);
        const proposal = await generateProposal(raw.signal, (raw.context.sectionTitle as string) || 'Section', language);
        return createObservation(raw, message, proposal);
      })
    );

    // Pass language to strengths
    const strengths = await phraseStrengths(strengthSignals, sectionSummaries, language);
    
    // ... rest of code ...
  }
});
```

### 6B: Update claude.ts for language support

**File:** `/server/llm/claude.ts`

**UPDATE** the system prompts to include language:

```tsx
const OBSERVATION_SYSTEM_PROMPT_EN = `You are writing concise, professional observations about CV sections...`; // existing English prompt

const OBSERVATION_SYSTEM_PROMPT_DA = `Du skriver kortfattede, professionelle observationer om CV-sektioner til et CV-forbedringsværktøj.

KRITISKE BEGRÆNSNINGER:
- Brug aldrig tal, scores eller procenter i dit output
- Sig aldrig "du bør" eller "jeg anbefaler"
- Brug aldrig ordene: "svag", "dårlig", "mangelfuld", "utilstrækkelig", "mangler forbedring"
- Brug vægt-sprog: "bærer", "holder", "repræsenterer", "viser", "afspejler"
- Vær specifik om det faktiske indhold
- Maksimalt ÉN sætning
- Lyd observerende, ikke dømmende

TONE: Rolig, præcis, observerende.`;

export async function phraseObservation(context: ObservationContext, language: string = 'en'): Promise<string> {
  const systemPrompt = language === 'da' ? OBSERVATION_SYSTEM_PROMPT_DA : OBSERVATION_SYSTEM_PROMPT_EN;
  const prompt = buildObservationPrompt(context, language);
  
  // ... rest of function using systemPrompt
}
```

**Add Danish versions of all prompts:**
- OBSERVATION_SYSTEM_PROMPT_DA
- REWRITE_SYSTEM_PROMPT_DA  
- STRENGTHS_SYSTEM_PROMPT_DA
- buildObservationPrompt should return Danish text when language === 'da'

### 6C: Update frontend API call

**File:** `/client/src/pages/home.tsx`

**UPDATE** handleAnalyze to pass language header:

```tsx
const handleAnalyze = async () => {
  if (!pdfFile) return;
  
  setState("scanning");
  
  const formData = new FormData();
  formData.append("file", pdfFile);

  try {
    const response = await fetch("/api/cv/analyze", {
      method: "POST",
      headers: {
        'X-Language': language, // Add this
      },
      body: formData,
    });
    // ... rest of function
  }
};
```

---

## PART 7: Update llm-parser.ts for Language

**File:** `/server/engine/llm-parser.ts`

The parser prompts should also respect language, especially for instruction to preserve original language:

```tsx
const PARSER_SYSTEM_PROMPT = `You are a CV/resume parser. Your job is to analyze raw CV text and identify distinct sections.

CRITICAL: Preserve the original language of all content. Do not translate.
...`;
```

The parser output should stay in the original CV language (Danish), but instructions to Claude can be in English.

---

## Verification Checklist

1. [ ] Settings icon appears in header
2. [ ] Clicking opens dropdown with Language and Theme options
3. [ ] Selecting Danish changes all UI text to Danish
4. [ ] Selecting Dark switches to dark theme (except CV viewer)
5. [ ] CV viewer content area stays white in dark mode
6. [ ] Settings persist after page refresh
7. [ ] Analyzing a CV in Danish mode produces Danish observations/strengths
8. [ ] Analyzing a CV in English mode produces English observations/strengths

---

## Summary

| File | Changes |
|------|---------|
| `tailwind.config.js` | Add `darkMode: 'class'` |
| `/client/src/contexts/SettingsContext.tsx` | NEW - Language + Theme context with translations |
| `/client/src/components/SettingsDropdown.tsx` | NEW - Settings dropdown UI |
| `/client/src/App.tsx` | Wrap with SettingsProvider |
| `/client/src/pages/home.tsx` | Use t() for strings, add dark: classes, settings dropdown in header |
| `/server/routes.ts` | Accept X-Language header, pass to LLM functions |
| `/server/llm/claude.ts` | Danish system prompts, language parameter |

---

**END OF PATCH**

*Patch version: 004*  
*Priority: MEDIUM*  
*Architect: Logos*
