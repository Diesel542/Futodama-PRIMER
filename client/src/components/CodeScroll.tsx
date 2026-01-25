import { useEffect, useRef } from 'react';

// Placeholder code snippets that look like CV analysis
const codeSnippets = [
  'parsing document structure...',
  'const sections = extractSections(cv);',
  'analyzing temporal coherence...',
  'for (const role of experience) {',
  '  validateDateRange(role);',
  '}',
  'detecting skill patterns...',
  'const density = calculateDensity(text);',
  'if (density < threshold) {',
  '  observations.push(suggestion);',
  '}',
  'evaluating role progression...',
  'mapping competency clusters...',
  'const graph = buildCareerGraph(roles);',
  'findGaps(timeline);',
  'checking formatting consistency...',
  'extracting key achievements...',
  'pattern.match(accomplishments);',
  'scoring impact statements...',
  'analyzing language density...',
  'validateStructure(sections);',
  'comparing against templates...',
  'const score = evaluate(cv);',
  'generating observations...',
  'prioritizing suggestions...',
  'building improvement roadmap...',
  'calculating health metrics...',
  'finalizing analysis report...',
];

export function CodeScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let animationId: number;
    let position = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      position += speed;

      // Reset when scrolled past content
      if (position >= content.scrollHeight / 2) {
        position = 0;
      }

      content.style.transform = `translateY(-${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Double the content for seamless loop
  const allLines = [...codeSnippets, ...codeSnippets];

  return (
    <div
      ref={containerRef}
      className="relative h-64 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}
    >
      <div
        ref={contentRef}
        className="font-mono text-xs text-gray-300 dark:text-gray-600 space-y-1.5 select-none"
      >
        {allLines.map((line, i) => (
          <div
            key={i}
            className="whitespace-nowrap"
            style={{
              opacity: line.startsWith('  ') ? 0.5 : 0.7,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
