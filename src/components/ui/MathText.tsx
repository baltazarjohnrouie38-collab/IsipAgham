import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface KatexNodeProps {
  expr: string;
  displayMode?: boolean;
}

/** Restores any accidental JS string control-escape characters inside math expressions */
function repairMathEscapes(raw: string): string {
  return raw
    .replace(/\t(?=(?:ext|heta|frac|au|imes|o\b|riangle|an\b))/g, '\\t')
    .replace(/\f(?=(?:rac|orall|lat))/g, '\\f')
    .replace(/\v(?=(?:ec|dots|artheta|arepsilon|arphi))/g, '\\v')
    .replace(/\r(?=(?:ho|ight|angle))/g, '\\r')
    .replace(/\x08(?=(?:ar|eta|inom|ig|ullet))/g, '\\b');
}

const KatexNode: React.FC<KatexNodeProps> = ({ expr, displayMode = false }) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cleaned = repairMathEscapes(expr.trim());
    try {
      katex.render(cleaned, el, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      el.textContent = cleaned;
    }
  }, [expr, displayMode]);

  return (
    <span
      ref={containerRef}
      className={
        displayMode
          ? 'block my-2.5 overflow-x-auto py-1 text-center'
          : 'inline-block align-baseline mx-0.5'
      }
    />
  );
};

interface TextSegment {
  kind: 'text' | 'inline-math' | 'block-math';
  value: string;
}

const GREEK_UNICODE_TO_TEX: Array<[RegExp, string]> = [
  [/Δ/g, '\\Delta '],
  [/θ/g, '\\theta '],
  [/α/g, '\\alpha '],
  [/ω/g, '\\omega '],
  [/τ/g, '\\tau '],
  [/μ/g, '\\mu '],
  [/ρ/g, '\\rho '],
  [/Φ/g, '\\Phi '],
  [/ε/g, '\\varepsilon '],
  [/π/g, '\\pi '],
  [/λ/g, '\\lambda '],
  [/Ω/g, '\\Omega '],
  [/≤/g, '\\le '],
  [/≥/g, '\\ge '],
  [/≈/g, '\\approx '],
  [/≠/g, '\\ne '],
  [/×/g, '\\times '],
  [/·/g, '\\cdot '],
  [/²/g, '^2'],
  [/³/g, '^3'],
  [/⁻¹/g, '^{-1}'],
];

function typedExprToLatex(raw: string): string {
  let out = raw.trim();
  for (const [re, rep] of GREEK_UNICODE_TO_TEX) {
    out = out.replace(re, rep);
  }
  out = out
    .replace(/\*/g, ' \\cdot ')
    .replace(/\bsqrt\(([^()]+)\)/g, '\\sqrt{$1}')
    .replace(/\b(sin|cos|tan)\(/g, '\\$1(')
    .replace(/([A-Za-z\\]+)_([A-Za-z0-9,+-]{2,})\b/g, '$1_{$2}')
    .replace(/([A-Za-z0-9)\]}])\^(-?\d+(?:\.\d+)?)/g, '$1^{$2}')
    .replace(/\b([A-Za-z0-9_{}()\\]+)\s*\/\s*([A-Za-z0-9_{}()\\]+)\b/g, (full, num: string, den: string) => {
      // Only convert clean single-term fractions inside equations, avoid prose words like "and/or"
      if (num.length > 18 || den.length > 18) return full;
      if (/^[a-z]{3,}$/i.test(num) && /^[a-z]{3,}$/i.test(den)) return full;
      return `\\frac{${num}}{${den}}`;
    });
  return out;
}

/**
 * Converts un-delimited LaTeX commands and typed physics equations/variables
 * (e.g. `F = ma`, `v_x = v_0 cos(θ)`, `a_c = v^2 / r`, `m/s^2`, `10^-11`)
 * into `$...$` segments while preserving normal prose.
 */
function autoWrapTypedMath(plain: string): string {
  if (!plain || plain.length < 2) return plain;

  let text = plain;

  // 1. Wrap un-delimited LaTeX expressions (\frac{...}{...}, \sqrt{...}, \vec{...}, \Delta, etc.)
  text = text.replace(
    /(\\(?:frac|tfrac|dfrac|sqrt|vec|hat|bar|sum|oint)\{[^{}]*\}(?:\{[^{}]*\})?|\\(?:Delta|theta|alpha|omega|tau|mu|rho|Phi|varepsilon|pi|lambda|times|cdot|approx|le|ge|ne)(?:_[A-Za-z0-9{}]+|\^[A-Za-z0-9{}]+)?)/g,
    (m) => `$${m}$`
  );

  // Merge adjacent `$a$ $b$` or `$a$=$b$` if any were created? Keep simple:
  // 2. Wrap typed equations like `F_net = m * a`, `v_x = v_0 cos(θ)`, `PV = nRT`, `a_c = v^2 / r`, `E = mc^2`
  const eqRegex =
    /(^|[\s(])((?:Δ|Φ|ε|τ|α|ω|θ|μ|ρ|[A-Za-z]{1,4})(?:_[A-Za-z0-9]+|['²³])?\s*=\s*[A-Za-z0-9ΔΦεταωθμρπΩ²³'_.+\-*/^()·×\s]{1,42})(?=$|[.,;:!?\s)])/g;
  text = text.replace(eqRegex, (full, prefix: string, expr: string) => {
    // Skip if already contains `$` or looks like English prose (long lowercase words without math operators)
    if (expr.includes('$')) return full;
    const rhs = expr.slice(expr.indexOf('=') + 1).trim();
    const hasMathSignal =
      /[_^*+/·×²³ΔΦεταωθμρπ()]/.test(expr) ||
      /\b(?:cos|sin|tan|sqrt|mv|nRT|mc|ma|mgh|kx)\b/.test(rhs) ||
      /^[A-Za-z0-9]{1,4}\s*[A-Za-z0-9]{1,4}$/.test(rhs);
    if (!hasMathSignal) return full;
    // Avoid grabbing trailing prose words after a space
    const cleanExpr = expr.replace(/\s+(?:where|when|if|is|in|and|or|at|to|for|with)\s*$/i, '').trim();
    return `${prefix}$${typedExprToLatex(cleanExpr)}$`;
  });

  // 3. Wrap remaining isolated subscript/superscript tokens & units like `v_x`, `a_c`, `10^-11`, `m/s^2`, `m/s²`
  text = text.replace(
    /(^|[\s(])((?:10\^-?\d+|(?:m\/s|kg·m\/s|rad\/s|N·m|J\/\(mol·K\)|C|N|kg|m|s)(?:\^[23-]|²|³)|[A-Za-zΔΦεταωθμρ]_[A-Za-z0-9]+(?:\^[0-9-]+)?|[A-Za-z]\^[23]))(?=$|[\s.,;:!?)])/g,
    (full, prefix: string, token: string) => {
      if (token.includes('$')) return full;
      // Wrap unit denominator/numerator nicely if it's a unit like m/s^2
      if (/^(?:m\/s|kg·m\/s|rad\/s|N·m)/.test(token)) {
        const unitTex = token.replace(/²|\^2/g, '^2').replace(/³|\^3/g, '^3').replace(/·/g, '\\cdot ');
        return `${prefix}$\\text{${unitTex.replace(/\^(\d)/g, '}$^$1\\text{')}}$`.replace(
          /\\text\{\}/g,
          ''
        );
      }
      return `${prefix}$${typedExprToLatex(token)}$`;
    }
  );

  return text;
}

function splitMathSegments(input: string): TextSegment[] {
  const normalized = input
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner}$`);

  const segments: TextSegment[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushAutoWrappedPlain = (plainChunk: string) => {
    if (!plainChunk) return;
    const wrapped = autoWrapTypedMath(plainChunk);
    if (wrapped === plainChunk) {
      segments.push({ kind: 'text', value: plainChunk });
      return;
    }
    let subLast = 0;
    let subMatch: RegExpExecArray | null;
    const subRe = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
    while ((subMatch = subRe.exec(wrapped)) !== null) {
      if (subMatch.index > subLast) {
        segments.push({ kind: 'text', value: wrapped.slice(subLast, subMatch.index) });
      }
      const tok = subMatch[0];
      if (tok.startsWith('$$') && tok.endsWith('$$')) {
        segments.push({ kind: 'block-math', value: tok.slice(2, -2) });
      } else {
        segments.push({ kind: 'inline-math', value: tok.slice(1, -1) });
      }
      subLast = subRe.lastIndex;
    }
    if (subLast < wrapped.length) {
      segments.push({ kind: 'text', value: wrapped.slice(subLast) });
    }
  };

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      pushAutoWrappedPlain(normalized.slice(lastIndex, match.index));
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
    pushAutoWrappedPlain(normalized.slice(lastIndex));
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
    // Clean up stray unmatched bold markers when **...** spans across a $math$ segment
    return <React.Fragment key={idx}>{part.replace(/\*\*/g, '')}</React.Fragment>;
  });
}

function preprocessMarkdownMath(raw: string): string {
  return raw
    // Convert \[ ... \] (even multi-line) into single-line $$ ... $$ blocks
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => {
      const compact = inner.replace(/\s*\n\s*/g, ' ').trim();
      return `\n$$${compact}$$\n`;
    })
    // Collapse multi-line $$ ... $$ blocks into single-line $$ ... $$ so line splitting never breaks them
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner: string) => {
      const compact = inner.replace(/\s*\n\s*/g, ' ').trim();
      return `\n$$${compact}$$\n`;
    })
    // Unwrap bold ** around inline or block math like **$F = ma$**
    .replace(/\*\*(\$\$?[^$]+\$\$?)\*\*/g, '$1')
    // Strip stray backticks around LaTeX formulas
    .replace(/`(\$[^`]+\$)`/g, '$1');
}

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const prepared = preprocessMarkdownMath(text);
  const lines = prepared.split('\n');

  return (
    <div className={`space-y-2 break-words ${className}`}>
      {lines.map((rawLine, lineIdx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        if (/^-{3,}$/.test(trimmed)) {
          return <hr key={lineIdx} className="border-stone-200 dark:border-neutral-700 my-2" />;
        }

        const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
          const headingSegments = splitMathSegments(headingMatch[1]);
          return (
            <h3
              key={lineIdx}
              className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white pt-1.5"
            >
              {headingSegments.map((seg, segIdx) => {
                if (seg.kind === 'inline-math' || seg.kind === 'block-math') {
                  return <KatexNode key={segIdx} expr={seg.value} />;
                }
                return (
                  <React.Fragment key={segIdx}>
                    {renderBoldText(seg.value)}
                  </React.Fragment>
                );
              })}
            </h3>
          );
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
