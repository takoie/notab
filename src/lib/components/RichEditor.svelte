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
  } from '@lucide/svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { imagesFromClipboard } from '$lib/image';
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
  let mathBtn = $state<HTMLButtonElement | undefined>();
  let mathOpen = $state(false);
  let mathSrc = $state('');
  let mathDisplay = $state(false);

  const EMOJI = [
    '😀', '😄', '🙂', '😉', '😍', '😎', '🤔', '😅',
    '😴', '🥳', '😭', '😡', '🤯', '🙄', '😬', '🤝',
    '👍', '👎', '👏', '🙏', '💪', '👀', '🔥', '✨',
    '⭐', '🎉', '✅', '❌', '⚠️', '❓', '❗', '💯',
    '📌', '📎', '📅', '⏰', '💡', '📝', '📈', '📉',
    '💰', '🚀', '🐛', '☕', '❤️', '🧠', '🎯', '🔑',
  ];

  // push external html into the DOM only while the field isn't being edited
  $effect(() => {
    if (el && !focused && el.innerHTML !== html) el.innerHTML = html;
  });

  $effect(() => {
    if (autofocus && el) {
      const node = el;
      requestAnimationFrame(() => node.focus());
    }
  });

  function sync() {
    if (el) html = el.innerHTML;
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

  function insertAtCaret(str: string) {
    el?.focus();
    const sel = window.getSelection();
    if (savedRange && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    document.execCommand('insertText', false, str);
    savedRange = null;
    sync();
  }

  function insertMath() {
    const expr = mathSrc.trim();
    if (!expr) return;
    insertAtCaret(mathDisplay ? ` $$${expr}$$ ` : ` \\(${expr}\\) `);
    mathSrc = '';
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
    const li = (e.target as HTMLElement).closest('li');
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
</script>

<svelte:document onselectionchange={refreshMarks} />

<div class={cn('flex flex-col gap-2', klass)}>
  <div class="flex flex-wrap items-center gap-0.5">
    {#each TOOLS as t (t.cmd)}
      <button
        type="button"
        tabindex="-1"
        class={cn(
          'grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink',
          marks[t.key] && 'bg-accent-soft text-accent',
        )}
        title={t.label}
        aria-pressed={marks[t.key]}
        onclick={() => exec(t.cmd)}
      >
        <t.icon size={15} />
      </button>
    {/each}
    <span class="mx-1 h-4 w-px bg-border"></span>
    <button
      type="button"
      tabindex="-1"
      class="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
      title="Punktliste"
      onclick={() => exec('insertUnorderedList')}
    >
      <List size={15} />
    </button>
    <button
      type="button"
      tabindex="-1"
      class="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
      title="Nummerert liste"
      onclick={() => exec('insertOrderedList')}
    >
      <ListOrdered size={15} />
    </button>
    <button
      type="button"
      tabindex="-1"
      class="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
      title="Avkrysningsliste"
      onclick={toggleChecklist}
    >
      <ListChecks size={15} />
    </button>
    <span class="mx-1 h-4 w-px bg-border"></span>
    <button
      bind:this={emojiBtn}
      type="button"
      tabindex="-1"
      class="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
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
      class="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
      title="Matte (LaTeX)"
      onpointerdown={captureSelection}
      onclick={() => (mathOpen = !mathOpen)}
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
      class="rich-body min-h-[4.5rem] w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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

<Popover
  anchor={mathBtn}
  bind:open={mathOpen}
  placement="bottom-start"
  label="LaTeX"
  class="w-72 space-y-2 p-2.5"
>
  <input
    class="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-accent"
    placeholder={'f.eks.  \\frac{a}{b}'}
    bind:value={mathSrc}
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMath();
      }
    }}
  />
  <label class="flex items-center gap-1.5 text-[12px] text-ink-soft">
    <input type="checkbox" bind:checked={mathDisplay} /> Egen linje (display)
  </label>
  <button
    type="button"
    class="w-full rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
    disabled={!mathSrc.trim()}
    onclick={insertMath}
  >
    Sett inn
  </button>
</Popover>
