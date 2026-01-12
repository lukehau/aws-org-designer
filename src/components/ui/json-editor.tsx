/**
 * JSON Editor Component
 * CodeMirror-based editor with JSON syntax highlighting and linting
 * Styled to match shadcn textarea components
 */

import React, { useEffect, useRef } from 'react';
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { cn } from '@/lib/utils';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}

export const JsonEditor = React.forwardRef<HTMLDivElement, JsonEditorProps>(
  ({ value, onChange, placeholder: _placeholderText, disabled, readOnly, className, id }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
      if (!editorRef.current) return;

      // Create editor state with JSON language support and linting
      const startState = EditorState.create({
        doc: value,
        extensions: [
          minimalSetup,
          json(),
          linter(jsonParseLinter()),
          EditorView.editable.of(!disabled && !readOnly),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString();
              onChange(newValue);
            }
          }),
          EditorView.theme({
            '&': {
              fontSize: '0.875rem',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            },
            '.cm-content': {
              minHeight: '250px',
              padding: '12px',
            },
            '.cm-scroller': {
              overflow: 'auto',
            },
            '&.cm-focused': {
              outline: 'none',
            },
          }),
          EditorView.lineWrapping,
        ],
      });

      // Create editor view
      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, [disabled, readOnly]); // Recreate when disabled/readOnly changes

    // Update editor content when value prop changes externally
    useEffect(() => {
      if (viewRef.current) {
        const currentValue = viewRef.current.state.doc.toString();
        if (currentValue !== value) {
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: currentValue.length,
              insert: value,
            },
          });
        }
      }
    }, [value]);

    return (
      <div
        ref={ref}
        id={id}
        className={cn(
          'rounded-md border border-input bg-card',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          readOnly && 'cursor-default',
          className
        )}
      >
        <div ref={editorRef} />
      </div>
    );
  }
);

JsonEditor.displayName = 'JsonEditor';
