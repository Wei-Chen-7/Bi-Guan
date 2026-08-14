import { Plus } from 'lucide-react';
import { useState } from 'react';

import { MAX_GONGFA } from '../constants/defaults';
import { UI } from '../constants/copy';

interface Props {
  list: readonly string[];
  selected: string;
  color: string;
  onSelect: (gongfa: string) => void;
  onAdd: (name: string) => void;
}

/** 横向可滚动的功法标签行，末尾一个「+」新增。 */
export function GongfaPicker({
  list,
  selected,
  color,
  onSelect,
  onAdd,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const name = draft.trim();
    if (name !== '') {
      onAdd(name);
      onSelect(name);
    }
    setDraft('');
    setAdding(false);
  };

  return (
    <div>
      <p className="label mb-2">{UI.gongfa}</p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((gongfa) => {
          const active = gongfa === selected;
          return (
            <button
              key={gongfa}
              type="button"
              onClick={() => onSelect(gongfa)}
              className={`chip ${active ? '' : 'chip-off'}`}
              style={
                active
                  ? {
                      borderColor: color,
                      color: '#E8E4D9',
                      backgroundColor: `${color}1F`,
                    }
                  : undefined
              }
              aria-pressed={active}
            >
              {gongfa}
            </button>
          );
        })}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            maxLength={10}
            placeholder={UI.gongfaNamePlaceholder}
            aria-label={UI.gongfaAdd}
            className="chip w-24 border-cloud/25 bg-transparent text-cloud
                       outline-none placeholder:text-mist/60"
          />
        ) : (
          list.length < MAX_GONGFA && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="chip chip-off grid place-items-center px-2.5"
              aria-label={UI.gongfaAdd}
            >
              <Plus size={14} />
            </button>
          )
        )}
      </div>
    </div>
  );
}
