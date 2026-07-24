'use client';

import { useCallback, useRef } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Mise en forme">
        <button type="button" className="rte__btn" onClick={() => exec('bold')} title="Gras">
          <strong>B</strong>
        </button>
        <button type="button" className="rte__btn" onClick={() => exec('italic')} title="Italique">
          <em>I</em>
        </button>
        <button type="button" className="rte__btn" onClick={() => exec('underline')} title="Souligné">
          <u>U</u>
        </button>
        <span className="rte__sep" />
        <select
          className="rte__select"
          defaultValue="3"
          onChange={(e) => exec('fontSize', e.target.value)}
          aria-label="Taille"
        >
          <option value="2">Petit</option>
          <option value="3">Normal</option>
          <option value="4">Grand</option>
          <option value="5">Très grand</option>
        </select>
        <select
          className="rte__select"
          defaultValue=""
          onChange={(e) => exec('fontName', e.target.value || 'Arial')}
          aria-label="Police"
        >
          <option value="">Police</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>
      <div
        ref={editorRef}
        className="rte__editor"
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight }}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={handleInput}
      />
    </div>
  );
}
