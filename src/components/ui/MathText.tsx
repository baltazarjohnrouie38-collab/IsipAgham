import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface KatexNodeProps {
  expr: string;
  displayMode?: boolean;
}

const KatexNode: React.FC<KatexNodeProps> = ({ expr, displayMode = false }) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      katex.render(expr.trim(), el, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      el.textContent = expr;
    }
  }, [expr, displayMode]);

  return (
    <span
      ref={containerRef}
      className={
        displayMode
          ? 'block my-3 overflow-x-auto py-1 text-center'
          : 'inline-block align-baseline mx-0.5'
      }
    />
  );
};

interface TextSegment {
  kind: 'text' | 'inline-math' | 'block-math';
  value: string;
}

function splitMathSegments(input: string): TextSegment[] {
  const normalized = input
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner}$`);

  const segments: TextSegment[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: 'text',
        value: normalized.slice(lastIndex, match.index),
      });
    }
    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({
        kind: 'block-math',
        value: token.slice(2, -2),
      });
    } else {
      segments.push({
        kind: 'inline-math',
        value: token.slice(1, -1),
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    segments.push({
      kind: 'text',
      value: normalized.slice(lastIndex),
    });
  }

  return segments;
}

function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const lines = text.split('\n');

  return (
    <div className={`space-y-2 break-words ${className}`}>
      {lines.map((rawLine, lineIdx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const segments = splitMathSegments(rawLine);
        const isOnlyBlock =
          segments.length === 1 && segments[0].kind === 'block-math';

        if (isOnlyBlock) {
          return (
            <div
              key={lineIdx}
              className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 px-4 py-2 overflow-x-auto"
            >
              <KatexNode expr={segments[0].value} displayMode />
            </div>
          );
        }

        const isBullet = /^[-*•]\s+/.test(trimmed);
        return (
          <p key={lineIdx} className={isBullet ? 'pl-3' : ''}>
            {segments.map((seg, segIdx) => {
              if (seg.kind === 'block-math') {
                return <KatexNode key={segIdx} expr={seg.value} displayMode />;
              }
              if (seg.kind === 'inline-math') {
                return <KatexNode key={segIdx} expr={seg.value} />;
              }
              return (
                <React.Fragment key={segIdx}>
                  {renderBoldText(seg.value)}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};

export const MathInline: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => {
  const segments = splitMathSegments(text);
  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'inline-math' || seg.kind === 'block-math') {
          return <KatexNode key={idx} expr={seg.value} displayMode={false} />;
        }
        return <React.Fragment key={idx}>{renderBoldText(seg.value)}</React.Fragment>;
      })}
    </span>
  );
};
