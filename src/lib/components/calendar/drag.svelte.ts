/**
 * Pointer-based drag state for calendar event chips.
 *
 * The app runs inside a Tauri webview whose native drag-drop handler swallows
 * HTML5 drag events, so — like the rest of the app (svelte-dnd-action) — the
 * calendar drags with pointer events instead.
 */
class CalendarDrag {
  noteId = $state<string | null>(null);
  label = $state('');
  x = $state(0);
  y = $state(0);
  /** local-midnight epoch ms of the day cell currently under the pointer, or null */
  overDay = $state<number | null>(null);

  get active(): boolean {
    return this.noteId !== null;
  }

  begin(noteId: string, label: string, x: number, y: number) {
    this.noteId = noteId;
    this.label = label;
    this.x = x;
    this.y = y;
    this.overDay = null;
  }

  move(x: number, y: number, overDay: number | null) {
    this.x = x;
    this.y = y;
    this.overDay = overDay;
  }

  /** Clear the drag and return where it landed (if anywhere). */
  end(): { noteId: string; day: number | null } | null {
    const res = this.noteId ? { noteId: this.noteId, day: this.overDay } : null;
    this.noteId = null;
    this.label = '';
    this.overDay = null;
    return res;
  }
}

export const calendarDrag = new CalendarDrag();
