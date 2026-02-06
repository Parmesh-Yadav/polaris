import { StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate,
  ViewPlugin,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { fetcher } from "./fetcher";

// a way to send messages to the suggestion plugin
const setSuggestionEffect = StateEffect.define<string | null>();

// holds our suggestion state
const suggestionState = StateField.define<string | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setSuggestionEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

// a widget to render the suggestion text
class SuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.opacity = "0.4";
    span.style.pointerEvents = "none";
    span.style.fontStyle = "italic";
    return span;
  }
}

let debounceTimer: number | null = null;
let isWaitingForSuggestion = false;
const DEBOUNCE_DELAY = 300;

let currentAbortController: AbortController | null = null;

const generatePayload = (view: EditorView, filename: string) => {
  const code = view.state.doc.toString();
  if (!code || code.trim().length === 0) return null;

  const cursorPosition = view.state.selection.main.head;
  const currentLine = view.state.doc.lineAt(cursorPosition);
  const cursorInLine = cursorPosition - currentLine.from;

  const previousLines: string[] = [];
  const previousLinesToFetch = Math.min(5, currentLine.number - 1);
  for (let i = previousLinesToFetch; i >= 1; i--) {
    previousLines.push(view.state.doc.line(currentLine.number - i).text);
  }

  const nextLines: string[] = [];
  const totalLines = view.state.doc.lines;
  const linesToFetch = Math.min(5, totalLines - currentLine.number);
  for (let i = 1; i <= linesToFetch; i++) {
    nextLines.push(view.state.doc.line(currentLine.number + i).text);
  }

  return {
    fileName: filename,
    code,
    currentLine: currentLine.text,
    previousLines: previousLines.join("\n"),
    textBeforeCursor: currentLine.text.slice(0, cursorInLine),
    textAfterCursor: currentLine.text.slice(cursorInLine),
    nextLines: nextLines.join("\n"),
    lineNumber: currentLine.number,
  };
};

const createDebouncePlugin = (filename: string) => {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        this.triggerSuggestion(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.triggerSuggestion(update.view);
        }
      }

      triggerSuggestion(view: EditorView) {
        if (debounceTimer != null) {
          clearTimeout(debounceTimer);
        }

        if (currentAbortController !== null) {
          currentAbortController.abort();
        }

        isWaitingForSuggestion = true;

        debounceTimer = window.setTimeout(async () => {
          const payload = generatePayload(view, filename);
          if (!payload) {
            isWaitingForSuggestion = false;
            view.dispatch({
              effects: setSuggestionEffect.of(null),
            });
            return;
          }

          currentAbortController = new AbortController();

          const suggestion = await fetcher(
            payload,
            currentAbortController.signal,
          );

          isWaitingForSuggestion = false;
          view.dispatch({
            effects: setSuggestionEffect.of(suggestion),
          });
        }, DEBOUNCE_DELAY);
      }

      destroy() {
        if (debounceTimer != null) {
          clearTimeout(debounceTimer);
        }

        if (currentAbortController !== null) {
          currentAbortController.abort();
        }
      }
    },
  );
};

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      const suggestionChanged = update.transactions.some((transaction) => {
        return transaction.effects.some((effect) =>
          effect.is(setSuggestionEffect),
        );
      });

      const shouldRebuild =
        update.docChanged || update.selectionSet || suggestionChanged;
      if (shouldRebuild) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      if (isWaitingForSuggestion) {
        return Decoration.none;
      }
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) return Decoration.none;

      const cursor = view.state.selection.main.head;
      return Decoration.set([
        Decoration.widget({
          widget: new SuggestionWidget(suggestion),
          side1: 1, // 1 means after the cursor, -1 means before
        }).range(cursor),
      ]);
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);

const acceptSuggestionKeymap = keymap.of([
  {
    key: "Tab",
    run: (view: EditorView) => {
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) return false;

      const cursor = view.state.selection.main.head;
      view.dispatch({
        changes: {
          from: cursor,
          to: cursor,
          insert: suggestion,
        },
        selection: {
          anchor: cursor + suggestion.length,
        },
        effects: setSuggestionEffect.of(null), // clear suggestion after accepting
      });
      return true;
    },
  },
]);

export const suggestion = (filename: string) => {
  return [
    suggestionState, // our state storage
    createDebouncePlugin(filename), // trigger suggestion on typing with debounce
    renderPlugin, // the rendering plugin
    acceptSuggestionKeymap, // keymap to accept suggestion
  ];
};
