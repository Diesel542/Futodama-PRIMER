# PATCH 010: Right Panel Redesign — Health Trajectory & Prioritized Improvements
## Priority: HIGH — Core UX improvement
## Designer: Aria
## Architect: Logos

---

## Overview

Redesign the right analysis panel from a static report to a dynamic "thinking surface" that responds as the user improves their CV.

**Design North Star:**
*"The right panel should feel like a calm expert standing next to you, quietly nodding as things improve, and clearly pointing when something matters."*

---

## PART 1: New Component Structure

### File: `/client/src/components/AnalysisPanel.tsx` (NEW)

Create a new component to replace the current right panel content.

```tsx
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisPanelProps {
  strengths: string;              // The "what's working well" narrative
  observations: Observation[];    // All observations
  totalIssues: number;            // Initial issue count (for trajectory)
  resolvedIssues: number;         // Current resolved count
  language: 'en' | 'da';
}

export function AnalysisPanel({ 
  strengths, 
  observations, 
  totalIssues,
  resolvedIssues,
  language 
}: AnalysisPanelProps) {
  
  // Filter to pending observations only, max 3
  const pendingObservations = useMemo(() => 
    observations
      .filter(o => !['accepted', 'declined', 'locked'].includes(o.status))
      .slice(0, 3),
    [observations]
  );
  
  // Calculate health progress (0 to 1)
  const healthProgress = useMemo(() => {
    if (totalIssues === 0) return 1;
    return resolvedIssues / totalIssues;
  }, [totalIssues, resolvedIssues]);
  
  // Determine health state
  const healthState = useMemo(() => {
    if (healthProgress >= 1) return 'healthy';
    if (healthProgress >= 0.5) return 'improving';
    return 'attention';
  }, [healthProgress]);
  
  const t = {
    en: {
      analysisComplete: 'Analysis complete',
      improving: 'CV coherence improving',
      healthy: 'CV in good shape',
      attention: 'Multiple areas need attention',
      start: 'Start',
      now: 'Now',
      goal: 'Goal',
      whatsWorking: "What's working well",
      improvements: 'Prioritized improvements',
      moreItems: 'more items',
    },
    da: {
      analysisComplete: 'Analyse færdig',
      improving: 'CV-sammenhæng forbedres',
      healthy: 'CV i god form',
      attention: 'Flere områder kræver opmærksomhed',
      start: 'Start',
      now: 'Nu',
      goal: 'Mål',
      whatsWorking: 'Hvad der fungerer godt',
      improvements: 'Prioriterede forbedringer',
      moreItems: 'flere punkter',
    }
  }[language];
  
  const healthBadgeText = {
    healthy: t.healthy,
    improving: t.improving,
    attention: t.attention,
  }[healthState];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8">
        
        {/* ========== STATUS HEADER ========== */}
        <section className="space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600 dark:text-green-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.analysisComplete}
            </h1>
          </div>
          
          {/* Health Badge */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
              healthState === 'healthy' 
                ? "bg-[#E8F5E8] dark:bg-[#1A2F1C] text-green-700 dark:text-green-400"
                : healthState === 'improving'
                  ? "bg-[#E8F5E8] dark:bg-[#1A2F1C] text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                healthState === 'attention' 
                  ? "bg-[#C9B56A]" 
                  : "bg-green-500 dark:bg-green-400"
              )} />
              {healthBadgeText}
            </span>
          </div>
          
          {/* Health Trajectory Bar */}
          <div className="pt-2">
            <div className="relative">
              {/* Track */}
              <div className="h-2 rounded-full bg-gradient-to-r from-[#F4E8B3] via-[#D4E4A6] to-[#7BAF86] dark:from-[#4A4535] dark:via-[#3A4A35] dark:to-[#2A3F2E]" />
              
              {/* Now Marker */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                initial={false}
                animate={{ left: `${Math.min(healthProgress * 100, 100)}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ marginLeft: '-6px' }}
              >
                <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-200 border-2 border-gray-400 dark:border-gray-500 shadow-sm" />
              </motion.div>
            </div>
            
            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t.start}</span>
              <span>{t.now}</span>
              <span>{t.goal}</span>
            </div>
          </div>
        </section>
        
        {/* ========== WHAT'S WORKING WELL ========== */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.whatsWorking}
            </h2>
          </div>
          
          {/* Narrative prose - split into paragraphs */}
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
            {strengths.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
        
        {/* ========== PRIORITIZED IMPROVEMENTS ========== */}
        {pendingObservations.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">✧</span>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.improvements}
              </h2>
            </div>
            
            {/* Improvement Cards */}
            <div className="space-y-3">
              {pendingObservations.map((obs) => (
                <ImprovementCard 
                  key={obs.id} 
                  observation={obs}
                />
              ))}
            </div>
            
            {/* Collapsed count */}
            {observations.filter(o => !['accepted', 'declined', 'locked'].includes(o.status)).length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                +{observations.filter(o => !['accepted', 'declined', 'locked'].includes(o.status)).length - 3} {t.moreItems}
              </p>
            )}
          </section>
        )}
        
      </div>
    </div>
  );
}
```

---

## PART 2: Improvement Card Component

### Add within the same file or create `/client/src/components/ImprovementCard.tsx`

```tsx
interface ImprovementCardProps {
  observation: Observation;
}

function ImprovementCard({ observation }: ImprovementCardProps) {
  // Extract headline and explanation from observation
  // Assumes message format: "Headline. Explanation..." or similar
  const [headline, ...rest] = observation.message.split('. ');
  const explanation = rest.join('. ');
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-4 rounded-xl",
        "bg-[#FDFBF0] dark:bg-[#1F1E1A]",
        "border border-gray-200 dark:border-gray-700",
        "shadow-sm",
        "cursor-pointer hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Yellow temperature dot */}
          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C9B56A] shrink-0" />
          
          <div className="space-y-1 min-w-0">
            {/* Headline */}
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {headline}
            </h3>
            
            {/* Explanation */}
            {explanation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {explanation}
              </p>
            )}
          </div>
        </div>
        
        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
      </div>
    </motion.div>
  );
}
```

---

## PART 3: Update Home Page to Use New Panel

### In `/client/src/pages/home.tsx`

**ADD** import:
```tsx
import { AnalysisPanel } from '../components/AnalysisPanel';
```

**ADD** state for tracking total/resolved issues:
```tsx
const [totalIssues, setTotalIssues] = useState(0);

// Set total when analysis completes
useEffect(() => {
  if (observations.length > 0 && totalIssues === 0) {
    setTotalIssues(observations.length);
  }
}, [observations, totalIssues]);

// Calculate resolved count
const resolvedIssues = useMemo(() => 
  observations.filter(o => ['accepted', 'declined', 'locked'].includes(o.status)).length,
  [observations]
);
```

**REPLACE** the right panel content with:
```tsx
{/* Right Panel */}
<div className="w-[40%] h-screen bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
  {cvData && (
    <AnalysisPanel
      strengths={cvData.strengths || ''}
      observations={observations}
      totalIssues={totalIssues}
      resolvedIssues={resolvedIssues}
      language={language}
    />
  )}
</div>
```

---

## PART 4: Update Strengths Generation

### In `/server/llm/claude.ts` or wherever strengths are generated

Ensure the strengths text is formatted as **2-3 short paragraphs separated by `\n\n`**.

**Prompt guidance:**
```
Generate a brief narrative (2-3 short paragraphs) about what's working well in this CV.
Each paragraph should focus on one strength.
Write in a reflective, confident tone.
Separate paragraphs with double newlines.
Do not use bullet points.
```

---

## PART 5: Animation & Transitions

### Trajectory bar movement
- Duration: 300ms
- Easing: easeOut
- Triggers when `resolvedIssues` changes

### Card exit animation
- Fade out + slide up
- Duration: 200ms
- Triggers when observation status changes to accepted/declined/locked

### No celebratory effects
- No confetti
- No flashing
- No pulsing
- Movement is acknowledgement, not reward

---

## PART 6: Dark Mode Colors

| Element | Light | Dark |
|---------|-------|------|
| Panel bg | `#FFFFFF` | `#111827` (gray-900) |
| Trajectory gradient start | `#F4E8B3` | `#4A4535` |
| Trajectory gradient mid | `#D4E4A6` | `#3A4A35` |
| Trajectory gradient end | `#7BAF86` | `#2A3F2E` |
| Health badge (positive) | `#E8F5E8` | `#1A2F1C` |
| Improvement card bg | `#FDFBF0` | `#1F1E1A` |
| Yellow dot | `#C9B56A` | `#C9B56A` |

---

## Verification Checklist

**Status Header:**
- [ ] Leaf icon + "Analysis complete" title
- [ ] Health badge shows correct state text
- [ ] Badge has green bg for positive states, neutral for attention
- [ ] Trajectory bar has warm→green gradient
- [ ] "Now" marker positioned based on resolved/total ratio
- [ ] Marker animates smoothly when issues resolve (300ms)
- [ ] Labels: Start / Now (Nu) / Goal (Mål)

**What's Working Well:**
- [ ] Check icon + header
- [ ] Strengths displayed as italic prose paragraphs
- [ ] No bullets, no card wrapper
- [ ] Adequate line-height for readability

**Prioritized Improvements:**
- [ ] Max 3 cards visible
- [ ] Each card has yellow dot + headline + explanation
- [ ] Cards have subtle yellow tint background
- [ ] Chevron on right side
- [ ] "+N more items" text if >3 observations
- [ ] Cards fade out when resolved

**Dynamic Behavior:**
- [ ] Trajectory updates in real-time as user applies changes
- [ ] Health badge text updates based on progress
- [ ] When all resolved: badge shows "CV in good shape", marker at Goal

**Both Themes:**
- [ ] All elements visible in light mode
- [ ] All elements visible in dark mode
- [ ] Contrast requirements met

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `/client/src/components/AnalysisPanel.tsx` | NEW — Main panel component |
| `/client/src/components/ImprovementCard.tsx` | NEW — Improvement card (or inline) |
| `/client/src/pages/home.tsx` | Use new AnalysisPanel, add state tracking |
| `/server/llm/claude.ts` | Update strengths generation prompt |

---

**END OF PATCH**

*Patch version: 010*
*Priority: HIGH*
*Designer: Aria*
*Architect: Logos*
