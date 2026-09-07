<script lang="ts">
  import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    ListChecks,
    Smile,
    Sigma,
    Baseline,
    Highlighter,
  } from '@lucide/svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { imagesFromClipboard } from '$lib/image';
  import { PALETTE } from '$lib/colors';
  import { loadMathlive, renderMathIn } from '$lib/math';
  import { cn } from '$lib/cn';
  import Popover from './ui/Popover.svelte';

  let {
    html = $bindable(''),
    placeholder = '',
    autofocus = false,
    onsave,
    oncancel,
    oncommit,
    onpasteimages,
    class: klass = '',
  }: {
    html?: string;
    placeholder?: string;
    autofocus?: boolean;
    onsave?: () => void;
    oncancel?: () => void;
    /** fired when focus truly leaves the editor (not on toolbar clicks) */
    oncommit?: () => void;
    onpasteimages?: (files: File[]) => void;
    class?: string;
  } = $props();

  let el = $state<HTMLDivElement | undefined>();
  let focused = $state(false);
  let marks = $state({ bold: false, italic: false, underline: false, strike: false });

  let savedRange: Range | null = null;
  let emojiBtn = $state<HTMLButtonElement | undefined>();
  let emojiOpen = $state(false);
  let fgBtn = $state<HTMLButtonElement | undefined>();
  let fgOpen = $state(false);
  let hlBtn = $state<HTMLButtonElement | undefined>();
  let hlOpen = $state(false);
  let mathBtn = $state<HTMLButtonElement | undefined>();
  let mathOpen = $state(false);
  let mathReady = $state(false);
  let mathFieldEl = $state<HTMLElement | undefined>();
  /** set when the math box was opened to edit an existing atom */
  let editingAtom = $state<HTMLElement | null>(null);

  const EMOJI = [
    '😀', '😄', '🙂', '😉', '😍', '😎', '🤔', '😅',
    '😴', '🥳', '😭', '😡', '🤯', '🙄', '😬', '🤝',
    '👍', '👎', '👏', '🙏', '💪', '👀', '🔥', '✨',
    '⭐', '🎉', '✅', '❌', '⚠️', '❓', '❗', '💯',
    '📌', '📎', '📅', '⏰', '💡', '📝', '📈', '📉',
    '💰', '🚀', '🐛', '☕', '❤️', '🧠', '🎯', '🔑',
  ];
  const TEXT_COLORS = PALETTE.filter((c): c is string => c !== null);

  // push external html into the DOM only while the field isn't being edited
  $effect(() => {
    if (el && !focused && el.innerHTML !== html) {
      el.innerHTML = html;
      void renderMathIn(el);
    }
  });

  $effect(() => {
    if (autofocus && el) {
      const node = el;
      requestAnimationFrame(() => node.focus());
    }
  });

  // load MathLive (registers <math-field>) the first time the math box opens
  $effect(() => {
    if (mathOpen && !mathReady) void loadMathlive().then(() => (mathReady = true));
  });

  // when the math box opens, seed the field (empty for a new formula, or the
  // clicked atom's LaTeX when editing one) and focus it
  $effect(() => {
    if (!mathOpen || !mathReady || !mathFieldEl) return;
    const mf = mathFieldEl as HTMLElement & { value: string; focus?: () => void };
    mf.value = editingAtom ? (editingAtom.getAttribute('data-latex') ?? '') : '';
    requestAnimationFrame(() => mf.focus?.());
  });

  function sync() {
    if (!el) return;
    if (!el.querySelector('span[data-latex]')) {
      html = el.innerHTML;
      return;
    }
    // serialise math atoms back to their bare `<span data-latex>` form so the
    // stored body never carries MathLive's rendered markup or editor attributes
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('span[data-latex]').forEach((s) => {
      s.removeAttribute('data-rendered');
      s.removeAttribute('contenteditable');
      s.textContent = s.getAttribute('data-latex') ?? '';
    });
    html = clone.innerHTML;
  }

  function refreshMarks() {
    if (!focused) return;
    try {
      marks = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      };
    } catch {
      /* ignore */
    }
  }

  function exec(cmd: string) {
    el?.focus();
    document.execCommand(cmd, false);
    sync();
    refreshMarks();
  }

  function captureSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el && el.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    el?.focus();
    const sel = window.getSelection();
    if (savedRange && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }

  function insertAtCaret(str: string) {
    restoreSelection();
    document.execCommand('insertText', false, str);
    savedRange = null;
    sync();
  }

  function insertHtmlAtCaret(markup: string) {
    restoreSelection();
    document.execCommand('insertHTML', false, markup);
    savedRange = null;
    sync();
  }

  function inkColor(): string {
    return el ? getComputedStyle(el).color : '#1e202c';
  }

  function applyTextColor(c: string | null) {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, c ?? inkColor());
    savedRange = null;
    fgOpen = false;
    sync();
  }

  function applyHighlight(c: string | null) {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, c ?? 'transparent');
    savedRange = null;
    hlOpen = false;
    sync();
  }

  function insertMath() {
    const mf = mathFieldEl as (HTMLElement & { value?: string }) | undefined;
    const latex = (mf?.value ?? '').trim();
    if (!latex) {
      mathOpen = false;
      editingAtom = null;
      return;
    }

    if (editingAtom && el?.contains(editingAtom)) {
      // update the existing atom in place
      editingAtom.setAttribute('data-latex', latex);
      editingAtom.removeAttribute('data-rendered');
      editingAtom.textContent = latex;
    } else {
      const esc = latex
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      insertHtmlAtCaret(`<span data-latex="${esc}" contenteditable="false">${esc}</span>​`);
    }

    if (el) void renderMathIn(el);
    sync();
    if (mf) mf.value = '';
    editingAtom = null;
    mathOpen = false;
  }

  function toggleChecklist() {
    el?.focus();
    document.execCommand('insertUnorderedList', false);
    const sel = window.getSelection();
    let n: Node | null = sel?.anchorNode ?? null;
    while (n && n !== el) {
      if (n instanceof HTMLUListElement) {
        n.toggleAttribute('data-checklist');
        break;
      }
      n = n.parentNode;
    }
    sync();
  }

  function onClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // click a formula -> reopen the math editor on it
    const atom = target.closest('span[data-latex]') as HTMLElement | null;
    if (atom && el?.contains(atom)) {
      e.preventDefault();
      captureSelection();
      editingAtom = atom;
      mathOpen = true;
      return;
    }

    const li = target.closest('li');
    if (!li || !li.parentElement?.hasAttribute('data-checklist')) return;
    if (e.offsetX > 22) return;
    li.toggleAttribute('data-checked');
    sync();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onsave?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      oncancel?.();
    }
  }

  function onPaste(e: ClipboardEvent) {
    const files = imagesFromClipboard(e);
    if (files.length && onpasteimages) {
      e.preventDefault();
      onpasteimages(files);
      return;
    }
    const text = e.clipboardData?.getData('text/plain');
    if (text != null) {
      e.preventDefault();
      document.execCommand('insertText', false, text);
      sync();
    }
  }

  const TOOLS = [
    { cmd: 'bold', icon: Bold, key: 'bold', label: 'Fet' },
    { cmd: 'italic', icon: Italic, key: 'italic', label: 'Kursiv' },
    { cmd: 'underline', icon: Underline, key: 'underline', label: 'Understrek' },
    { cmd: 'strikeThrough', icon: Strikethrough, key: 'strike', label: 'Gjennomstreking' },
  ] as const;

  const tbBtn =
    'grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink';
</script>

<svelte:document onselectionchange={refreshMarks} />

<div class={cn('flex flex-col gap-2', klass)}>
  <div class="flex flex-wrap items-center gap-0.5">
    {#each TOOLS as t (t.cmd)}
      <button
        type="button"
        tabindex="-1"
        class={cn(tbBtn, marks[t.key] && 'bg-accent-soft text-accent')}
        title={t.label}
        aria-pressed={marks[t.key]}
        onclick={() => exec(t.cmd)}
      >
        <t.icon size={15} />
      </button>
    {/each}

    <span class="mx-1 h-4 w-px bg-border"></span>
    <button type="button" tabindex="-1" class={tbBtn} title="Punktliste" onclick={() => exec('insertUnorderedList')}>
      <List size={15} />
    </button>
    <button type="button" tabindex="-1" class={tbBtn} title="Nummerert liste" onclick={() => exec('insertOrderedList')}>
      <ListOrdered size={15} />
    </button>
    <button type="button" tabindex="-1" class={tbBtn} title="Avkrysningsliste" onclick={toggleChecklist}>
      <ListChecks size={15} />
    </button>

    <span class="mx-1 h-4 w-px bg-border"></span>
    <button
      bind:this={fgBtn}
      type="button"
      tabindex="-1"
      class={tbBtn}
      title="Tekstfarge"
      onpointerdown={captureSelection}
      onclick={() => (fgOpen = !fgOpen)}
    >
      <Baseline size={15} />
    </button>
    <button
      bind:this={hlBtn}
      type="button"
      tabindex="-1"
      class={tbBtn}
      title="Merk (uthev)"
      onpointerdown={captureSelection}
      onclick={() => (hlOpen = !hlOpen)}
    >
      <Highlighter size={15} />
    </button>

    <span class="mx-1 h-4 w-px bg-border"></span>
    <button
      bind:this={emojiBtn}
      type="button"
      tabindex="-1"
      class={tbBtn}
      title="Symbol / emoji"
      onpointerdown={captureSelection}
      onclick={() => (emojiOpen = !emojiOpen)}
    >
      <Smile size={15} />
    </button>
    <button
      bind:this={mathBtn}
      type="button"
      tabindex="-1"
      class={tbBtn}
      title="Matematikk"
      onpointerdown={captureSelection}
      onclick={() => {
        editingAtom = null;
        mathOpen = !mathOpen;
      }}
    >
      <Sigma size={15} />
    </button>
  </div>

  <div class="relative">
    <div
      bind:this={el}
      role="textbox"
      tabindex="0"
      aria-multiline="true"
      contenteditable="true"
      spellcheck={settings.spellcheck}
      lang={settings.lang}
      class="rich-body rich-editor min-h-[4.5rem] w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      oninput={sync}
      onfocus={() => (focused = true)}
      onblur={() => {
        focused = false;
        sync();
        requestAnimationFrame(() => {
          if (!focused) oncommit?.();
        });
      }}
      onclick={onClick}
      onkeydown={onKeydown}
      onpaste={onPaste}
    ></div>
    {#if !html || html === '<br>' || html === '<div><br></div>'}
      <span
        class="pointer-events-none absolute left-3 top-2 text-[13px] text-ink-faint"
        aria-hidden="true"
      >
        {placeholder}
      </span>
    {/if}
  </div>
</div>

<Popover anchor={emojiBtn} bind:open={emojiOpen} placement="bottom-start" label="Emoji" class="w-64">
  <div class="grid grid-cols-8 gap-0.5 p-1.5">
    {#each EMOJI as em (em)}
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded text-[16px] hover:bg-surface-sunken"
        onclick={() => {
          insertAtCaret(em);
          emojiOpen = false;
        }}
      >
        {em}
      </button>
    {/each}
  </div>
</Popover>

{#snippet swatches(apply: (c: string | null) => void)}
  <div class="flex flex-wrap items-center gap-1.5 p-2">
    <button
      type="button"
      class="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-ink-soft hover:bg-surface-sunken"
      onclick={() => apply(null)}
    >
      Standard
    </button>
    {#each TEXT_COLORS as c (c)}
      <button
        type="button"
        class="h-5 w-5 rounded-full border border-border transition-transform hover:scale-110"
        style:background-color={c}
        aria-label={c}
        onclick={() => apply(c)}
      ></button>
    {/each}
  </div>
{/snippet}

<Popover anchor={fgBtn} bind:open={fgOpen} placement="bottom-start" label="Tekstfarge" class="w-60">
  {@render swatches(applyTextColor)}
</Popover>

<Popover anchor={hlBtn} bind:open={hlOpen} placement="bottom-start" label="Uthev" class="w-60">
  {@render swatches(applyHighlight)}
</Popover>

<Popover
  anchor={mathBtn}
  bind:open={mathOpen}
  placement="bottom-start"
  label="Matematikk"
  class="w-80 space-y-2 p-2.5"
  onclose={() => (editingAtom = null)}
>
  {#if mathReady}
    <math-field
      bind:this={mathFieldEl}
      class="block w-full rounded-lg border border-border bg-surface p-1.5 text-[15px]"
    ></math-field>
  {:else}
    <p class="p-2 text-[12px] text-ink-faint">Laster mattefelt …</p>
  {/if}
  <p class="text-[11px] text-ink-faint">
    Skriv formelen visuelt (eller LaTeX: <code>\frac</code>, <code>^</code>, <code>_</code> …).
    {#if editingAtom}Endrer en formel du satte inn tidligere.{/if}
  </p>
  <button
    type="button"
    class="w-full rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
    disabled={!mathReady}
    onclick={insertMath}
  >
    {editingAtom ? 'Oppdater' : 'Sett inn'}
  </button>
</Popover>
