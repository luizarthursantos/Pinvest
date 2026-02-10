import { useState, useRef, useEffect } from 'react';

interface Props {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onAdd: (val: string) => void;
  placeholder?: string;
}

export default function ComboBox({ options, value, onChange, onAdd, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(input.toLowerCase())
  );
  const showCreate = input.trim() !== '' && !options.some((o) => o.toLowerCase() === input.toLowerCase());

  return (
    <div ref={ref} className="combobox">
      <input
        value={input}
        placeholder={placeholder}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <ul className="combobox-dropdown">
          {filtered.map((o) => (
            <li
              key={o}
              onClick={() => {
                onChange(o);
                setInput(o);
                setOpen(false);
              }}
            >
              {o}
            </li>
          ))}
          {showCreate && (
            <li
              className="combobox-create"
              onClick={() => {
                onAdd(input.trim());
                onChange(input.trim());
                setOpen(false);
              }}
            >
              + Create "{input.trim()}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
