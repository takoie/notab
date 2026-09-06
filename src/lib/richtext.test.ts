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
      '<p onclick="steal()">hei <script>alert(1)<\/script><span style="color:red">verden</span></p><img src=x>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('<span');
    expect(clean).not.toContain('<img');
    expect(htmlToText(clean)).toBe('hei verden');
  });

  it('keeps checklist markers only', () => {
    const html = '<ul data-checklist="true"><li data-checked="true">a</li><li>b</li></ul>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain('data-checklist');
    expect(clean).toContain('data-checked');
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
