import { describe, it, expect } from 'vitest';
import { sanitizeHtml, htmlToText, firstLine, isEmptyHtml } from './richtext';

describe('sanitizeHtml', () => {
  it('keeps the allowed inline + list tags', () => {
    const html =
      '<p><b>Ring</b> <i>rørlegger</i> <u>i dag</u> <s>ikke i morgen</s></p><ul><li>bad</li><li>kjøkken</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('strips scripts, event handlers and unknown tags but keeps their text', () => {
    const dirty =
      '<p onclick="steal()">hei <script>alert(1)<\/script><abbr title="x">verden</abbr></p><img src=x>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('<abbr');
    expect(clean).not.toContain('<img');
    expect(htmlToText(clean)).toBe('hei verden');
  });

  it('keeps checklist markers only', () => {
    const html = '<ul data-checklist="true"><li data-checked="true">a</li><li>b</li></ul>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain('data-checklist');
    expect(clean).toContain('data-checked');
  });

  it('keeps text + highlight colour, drops other span styles', () => {
    const clean = sanitizeHtml(
      '<span style="color:#e0546c;font-size:99px">rød</span> <mark style="background-color: yellow">gul</mark>',
    );
    expect(clean).toContain('color: #e0546c');
    expect(clean).not.toContain('font-size');
    expect(clean).toContain('background-color: yellow');
  });

  it('normalises <font color> and unwraps bare spans', () => {
    expect(sanitizeHtml('<font color="#123456">x</font>')).toContain('color: #123456');
    expect(sanitizeHtml('<span>plain</span>')).toBe('plain');
  });

  it('keeps an inline math atom as data-latex text', () => {
    const clean = sanitizeHtml('a <span data-latex="\\frac{a}{b}" contenteditable="false">x</span> b');
    expect(clean).toContain('data-latex="\\frac{a}{b}"');
    expect(clean).not.toContain('contenteditable');
  });

  it('scrubs javascript / url() from colour values', () => {
    const clean = sanitizeHtml('<span style="color: url(javascript:alert(1))">x</span>');
    expect(clean).not.toContain('javascript');
    expect(clean).toBe('x');
  });
});

describe('firstLine / isEmptyHtml', () => {
  it('pulls the first non-empty line as plain text', () => {
    expect(firstLine('<p>Kjøp <b>melk</b></p><p>og brød</p>')).toBe('Kjøp melk');
  });

  it('truncates very long first lines', () => {
    expect(firstLine('<p>' + 'x'.repeat(300) + '</p>', 10)).toHaveLength(10);
  });

  it('treats whitespace-only markup as empty', () => {
    expect(isEmptyHtml('<p><br></p><div>   </div>')).toBe(true);
    expect(isEmptyHtml('<p>hei</p>')).toBe(false);
  });
});
