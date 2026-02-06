"use client";

import { useEffect, useMemo, useRef } from "react";
import { keymap, EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { customTheme } from "../extensions/theme";
import { getLanguageExtension } from "../extensions/language-extension";
import { indentWithTab } from "@codemirror/commands";
import { minimap } from "../extensions/minimap";
import { indentationMarkers } from "@replit/codemirror-indentation-markers"
import { customSetup } from "../extensions/custom-setup";
import { suggestion } from "../extensions/suggestion";
import { quickEdit } from "../extensions/quick-edit";
import { selectionTooltip } from "../extensions/selection-tooltip";

interface Props {
    filename: string;
    initialValue?: string;
    onChange: (value: string) => void;
}

export const CodeEditor = ({ filename, initialValue = "", onChange }: Props) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const languageExtension = useMemo(() => {
        return getLanguageExtension(filename);
    }, [filename]);

    useEffect(() => {
        if (!editorRef.current) return;
        const view = new EditorView({
            doc: initialValue,
            parent: editorRef.current,
            extensions: [
                customSetup,
                languageExtension,
                suggestion(filename),
                quickEdit(filename),
                selectionTooltip(),
                oneDark,
                customTheme,
                keymap.of([indentWithTab]),
                minimap(),
                indentationMarkers(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                })
            ],
        });
        viewRef.current = view;
        return () => {
            view.destroy();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps -- initial value is only used from the initial document
    }, [languageExtension]);

    return (
        <div
            ref={editorRef}
            className="size-full pl-4 bg-background"
        />
    );
}