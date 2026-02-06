import { Tooltip, showTooltip, EditorView } from "@codemirror/view";
import { StateField, EditorState } from "@codemirror/state";
import { showQuickEditEffect, quickEditState } from "./quick-edit";

let editorView: EditorView | null = null;

const createTooltipForSelection = (state: EditorState): readonly Tooltip[] => {
  const selection = state.selection.main;
  if (selection.empty) {
    return [];
  }

  const isQuickEditActive = state.field(quickEditState);
  if (isQuickEditActive) {
    return [];
  }

  return [
    {
      pos: selection.to,
      above: false,
      strictSide: false,

      create(view: EditorView) {
        const dom = document.createElement("div");
        dom.className =
          "bg-popover text-popover-foreground z-50 rounded-sm border border-input p-1 shadow-md flex items-center gap-2 text-sm";

        const addToChatButton = document.createElement("button");
        addToChatButton.textContent = "Add to Chat";
        addToChatButton.className =
          "font-sans p-1 px-2 hover:bg-foreground/10 rounded-sm";

        const quickEditButton = document.createElement("button");
        quickEditButton.textContent = "Quick Edit";
        quickEditButton.className =
          "font-sans p-1 px-2 hover:bg-foreground/10 rounded-sm flex items-center gap-1";

        const quickEditButtonText = document.createElement("span");
        quickEditButtonText.textContent = "Quick Edit";

        const quickEditButtonShortcut = document.createElement("span");
        quickEditButtonShortcut.textContent = "⌘K";
        quickEditButtonShortcut.className = "text-s opacity-60";

        quickEditButton.appendChild(quickEditButtonText);
        quickEditButton.appendChild(quickEditButtonShortcut);

        quickEditButton.onclick = () => {
          view.dispatch({
            effects: showQuickEditEffect.of(true),
          });
        };

        dom.appendChild(addToChatButton);
        dom.appendChild(quickEditButton);

        return { dom };
      },
    },
  ];
};

const selectionTooltipField = StateField.define<readonly Tooltip[]>({
  create(state) {
    return createTooltipForSelection(state);
  },

  update(tooltips, tr) {
    // recompute tooltips if the selection changed or quick edit state changed
    if (tr.docChanged || tr.selection) {
      return createTooltipForSelection(tr.state);
    }

    for (const effect of tr.effects) {
      if (effect.is(showQuickEditEffect)) {
        return createTooltipForSelection(tr.state);
      }
    }

    return tooltips;
  },

  provide(field) {
    return showTooltip.computeN([field], (state) => state.field(field));
  },
});

const captureViewExtension = EditorView.updateListener.of((update) => {
  editorView = update.view;
});

export const selectionTooltip = () => {
  return [selectionTooltipField, captureViewExtension];
};
