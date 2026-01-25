import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'da';
type Theme = 'light' | 'dark';
type ModelOption = 'claude-sonnet-4-20250514' | 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  semanticTransition: boolean;
  setSemanticTransition: (enabled: boolean) => void;
  model: ModelOption;
  setModel: (model: ModelOption) => void;
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
    'complete.noSuggestions': 'This CV appears well-structured. No specific suggestions at this time.',
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
    'section.other': 'Additional Information',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.transition': 'Semantic transition',
    'settings.english': 'English',
    'settings.danish': 'Danish',
    'settings.light': 'Light',
    'settings.dark': 'Dark',

    // Dates
    'date.present': 'Present',
    'analyzed': 'Analyzed',

    // Suggestion states
    'suggestion.applied': 'Change applied',

    // Errors
    'error.failedToLoadPdf': 'Failed to load PDF',
    'error.docxPreview': 'DOCX preview not available',
    'error.clickAnalyze': 'Click "Analyze CV" to process',
    'error.noCvContent': 'No CV content to display',

    // Input prompts
    'input.placeholder': 'Enter your information...',
    'processing': 'Processing...',
    'submit': 'Submit',
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
    'complete.noSuggestions': 'Dette CV ser velstruktureret ud. Ingen specifikke forslag på nuværende tidspunkt.',
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
    'section.other': 'Yderligere oplysninger',

    // Settings
    'settings.title': 'Indstillinger',
    'settings.language': 'Sprog',
    'settings.theme': 'Tema',
    'settings.transition': 'Semantisk overgang',
    'settings.english': 'Engelsk',
    'settings.danish': 'Dansk',
    'settings.light': 'Lyst',
    'settings.dark': 'Mørkt',

    // Dates
    'date.present': 'Nu',
    'analyzed': 'Analyseret',

    // Suggestion states
    'suggestion.applied': 'Ændring anvendt',

    // Errors
    'error.failedToLoadPdf': 'Kunne ikke indlæse PDF',
    'error.docxPreview': 'DOCX-forhåndsvisning ikke tilgængelig',
    'error.clickAnalyze': 'Klik "Analysér CV" for at behandle',
    'error.noCvContent': 'Intet CV-indhold at vise',

    // Input prompts
    'input.placeholder': 'Indtast dine oplysninger...',
    'processing': 'Behandler...',
    'submit': 'Indsend',
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

  const [semanticTransition, setSemanticTransitionState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cv-health-semantic-transition') === 'true';
    }
    return false; // Default OFF for safe rollout
  });

  const [model, setModelState] = useState<ModelOption>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cv-health-model') as ModelOption) || 'claude-3-5-sonnet-20241022';
    }
    return 'claude-3-5-sonnet-20241022'; // Default to stable model
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cv-health-language', lang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('cv-health-theme', newTheme);
  };

  const setSemanticTransition = (enabled: boolean) => {
    setSemanticTransitionState(enabled);
    localStorage.setItem('cv-health-semantic-transition', String(enabled));
  };

  const setModel = (newModel: ModelOption) => {
    setModelState(newModel);
    localStorage.setItem('cv-health-model', newModel);
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
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, semanticTransition, setSemanticTransition, model, setModel, t }}>
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

export type { ModelOption };
