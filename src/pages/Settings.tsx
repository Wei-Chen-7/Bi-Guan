import { Check, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { playAmbient, stopAmbient, unlockAudio } from '../audio/synth';
import { AMBIENT_LABEL, UI } from '../constants/copy';
import {
  APP_VERSION,
  MAX_GONGFA,
  MAX_GRACE_SECONDS,
  MAX_MINUTES,
  MAX_PRESETS,
  MIN_GRACE_SECONDS,
  MIN_MINUTES,
} from '../constants/defaults';
import { realmColor } from '../constants/theme';
import { realmProgress } from '../engine/cultivation';
import { useStore } from '../store/useStore';
import type { AmbientSound } from '../types';

const AMBIENTS: readonly AmbientSound[] = ['none', 'rain', 'wind', 'stream'];

/** 设置页。 */
export function Settings() {
  const user = useStore((s) => s.user);
  const updateSettings = useStore((s) => s.updateSettings);
  const addGongfa = useStore((s) => s.addGongfa);
  const renameGongfa = useStore((s) => s.renameGongfa);
  const removeGongfa = useStore((s) => s.removeGongfa);
  const addPreset = useStore((s) => s.addPreset);
  const removePreset = useStore((s) => s.removePreset);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);

  const settings = user.settings;
  const { current } = realmProgress(user.totalE);
  const color = realmColor(current?.realm ?? null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [newGongfa, setNewGongfa] = useState('');
  const [newPreset, setNewPreset] = useState('');

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const handleExport = () => {
    const blob = new Blob([exportJSON()], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biguan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    if (!window.confirm(UI.dataImportConfirm)) return;
    const text = await file.text();
    const outcome = importJSON(text);
    flash(
      outcome === 'ok'
        ? UI.dataImportOk
        : outcome === 'version'
          ? UI.dataImportBadVersion
          : UI.dataImportBadFile
    );
  };

  return (
    <div className="px-5 pb-28 pt-10">
      <h1 className="font-serif text-xl tracking-[0.2em] text-cloud">
        {UI.settingsTitle}
      </h1>

      {/* 闭关 */}
      <Group title={UI.groupSession}>
        <Row label={UI.defaultMinutes}>
          <span className="tnum text-sm text-cloud/85">
            {settings.defaultMinutes} {UI.minutesUnit}
          </span>
        </Row>
        <input
          type="range"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={5}
          value={settings.defaultMinutes}
          onChange={(e) =>
            updateSettings({ defaultMinutes: Number(e.target.value) })
          }
          className="w-full"
          style={{ accentColor: color }}
          aria-label={UI.defaultMinutes}
        />

        <div className="mt-5">
          <p className="label">{UI.presets}</p>
          <p className="mt-1 text-[11px] text-mist/70">{UI.presetsHint}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {settings.customPresets.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => removePreset(minutes)}
                className="chip chip-off tnum group"
                aria-label={`${minutes} ${UI.minutesUnit}`}
              >
                {minutes}
                <X
                  size={11}
                  className="ml-1.5 inline opacity-40 group-hover:opacity-90"
                />
              </button>
            ))}

            {settings.customPresets.length < MAX_PRESETS && (
              <span className="flex items-center gap-1.5">
                <input
                  value={newPreset}
                  onChange={(e) =>
                    setNewPreset(e.target.value.replace(/\D/g, '').slice(0, 3))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPreset) {
                      addPreset(Number(newPreset));
                      setNewPreset('');
                    }
                  }}
                  inputMode="numeric"
                  placeholder="—"
                  aria-label={UI.presetAdd}
                  className="chip tnum w-14 border-cloud/15 bg-transparent
                             text-center text-cloud outline-none
                             placeholder:text-mist/50 focus:border-cloud/35"
                />
                <button
                  type="button"
                  disabled={!newPreset}
                  onClick={() => {
                    addPreset(Number(newPreset));
                    setNewPreset('');
                  }}
                  className="btn px-2.5 py-1.5"
                  aria-label={UI.presetAdd}
                >
                  <Check size={13} />
                </button>
              </span>
            )}
          </div>
        </div>
      </Group>

      {/* 判定 */}
      <Group title={UI.groupJudge}>
        <Toggle
          label={UI.lenientMode}
          hint={UI.lenientModeHint}
          checked={settings.lenientMode}
          color={color}
          onChange={(v) => updateSettings({ lenientMode: v })}
        />

        <div className="mt-5">
          <Row label={UI.graceSeconds}>
            <span className="tnum text-sm text-cloud/85">
              {settings.graceSeconds} {UI.secondsUnit}
            </span>
          </Row>
          <p className="mb-2 text-[11px] text-mist/70">{UI.graceSecondsHint}</p>
          <input
            type="range"
            min={MIN_GRACE_SECONDS}
            max={MAX_GRACE_SECONDS}
            step={1}
            value={settings.graceSeconds}
            onChange={(e) =>
              updateSettings({ graceSeconds: Number(e.target.value) })
            }
            disabled={settings.lenientMode}
            className="w-full disabled:opacity-35"
            style={{ accentColor: color }}
            aria-label={UI.graceSeconds}
          />
        </div>

        <div className="mt-5">
          <Toggle
            label={UI.keepAwake}
            hint={UI.keepAwakeHint}
            checked={settings.keepAwake}
            color={color}
            onChange={(v) => updateSettings({ keepAwake: v })}
          />
        </div>
      </Group>

      {/* 声音 */}
      <Group title={UI.groupSound}>
        <Toggle
          label={UI.soundEnabled}
          hint={UI.soundEnabledHint}
          checked={settings.soundEnabled}
          color={color}
          onChange={(v) => {
            unlockAudio();
            updateSettings({ soundEnabled: v });
          }}
        />

        <div className="mt-5">
          <p className="label mb-2.5">{UI.ambientSound}</p>
          <div className="flex flex-wrap gap-2">
            {AMBIENTS.map((kind) => {
              const active = settings.ambientSound === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    unlockAudio();
                    updateSettings({ ambientSound: kind });
                    // 试听一下，两秒后停。
                    if (kind === 'none') {
                      stopAmbient();
                    } else {
                      playAmbient(kind);
                      window.setTimeout(stopAmbient, 2400);
                    }
                  }}
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
                  {AMBIENT_LABEL[kind]}
                </button>
              );
            })}
          </div>
        </div>
      </Group>

      {/* 功法 */}
      <Group title={UI.groupGongfa}>
        <p className="mb-3 text-[11px] text-mist/70">{UI.gongfaHint}</p>
        <ul className="space-y-1.5">
          {settings.gongfaList.map((gongfa, index) => (
            <li key={`${gongfa}-${index}`} className="flex items-center gap-2">
              <input
                defaultValue={gongfa}
                onBlur={(e) => {
                  if (e.target.value.trim() !== gongfa) {
                    renameGongfa(index, e.target.value);
                    e.target.value = e.target.value.trim() || gongfa;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                maxLength={10}
                aria-label={gongfa}
                className="min-w-0 flex-1 rounded-md border border-cloud/10
                           bg-transparent px-3 py-2 text-sm text-cloud/85
                           outline-none transition-colors duration-200
                           focus:border-cloud/30"
              />
              <button
                type="button"
                onClick={() => removeGongfa(index)}
                disabled={settings.gongfaList.length <= 1}
                className="btn px-2.5 py-2 hover:border-cinnabar/50 hover:text-cinnabar"
                aria-label={`${UI.cancel} ${gongfa}`}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>

        {settings.gongfaList.length < MAX_GONGFA && (
          <div className="mt-2.5 flex items-center gap-2">
            <input
              value={newGongfa}
              onChange={(e) => setNewGongfa(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGongfa.trim()) {
                  addGongfa(newGongfa);
                  setNewGongfa('');
                }
              }}
              maxLength={10}
              placeholder={UI.gongfaNamePlaceholder}
              aria-label={UI.gongfaAdd}
              className="min-w-0 flex-1 rounded-md border border-dashed
                         border-cloud/15 bg-transparent px-3 py-2 text-sm
                         text-cloud outline-none placeholder:text-mist/50
                         focus:border-cloud/30"
            />
            <button
              type="button"
              disabled={!newGongfa.trim()}
              onClick={() => {
                addGongfa(newGongfa);
                setNewGongfa('');
              }}
              className="btn px-2.5 py-2"
              aria-label={UI.gongfaAdd}
            >
              <Check size={13} />
            </button>
          </div>
        )}
      </Group>

      {/* 数据 */}
      <Group title={UI.groupData}>
        <button
          type="button"
          onClick={handleExport}
          className="w-full text-left"
        >
          <Row label={UI.dataExport} hint={UI.dataExportHint}>
            <span className="text-xs text-cloud/60">JSON</span>
          </Row>
        </button>

        <div className="hairline my-3" />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full text-left"
        >
          <Row label={UI.dataImport} hint={UI.dataImportHint}>
            <span className="text-xs text-cloud/60">JSON</span>
          </Row>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />

        <div className="hairline my-3" />

        {!resetting ? (
          <button
            type="button"
            onClick={() => setResetting(true)}
            className="w-full text-left"
          >
            <Row label={UI.dataReset} hint={UI.dataResetHint} danger />
          </button>
        ) : (
          <div className="animate-rise-in">
            <p className="text-sm text-cinnabar">{UI.dataReset}</p>
            <p className="mt-1 text-[11px] text-mist">{UI.dataResetPrompt}</p>
            <input
              autoFocus
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="mt-2.5 w-full rounded-md border border-cinnabar/30
                         bg-transparent px-3 py-2 text-sm text-cloud
                         outline-none focus:border-cinnabar/60"
              aria-label={UI.dataResetPrompt}
            />
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetting(false);
                  setResetInput('');
                }}
                className="btn flex-1"
              >
                {UI.cancel}
              </button>
              <button
                type="button"
                disabled={resetInput.trim() !== UI.dataResetKeyword}
                onClick={() => {
                  resetAll();
                  setResetting(false);
                  setResetInput('');
                }}
                className="btn flex-1 border-cinnabar/40 text-cinnabar
                           hover:border-cinnabar disabled:opacity-30"
              >
                {UI.confirm}
              </button>
            </div>
          </div>
        )}
      </Group>

      {/* 关于 */}
      <Group title={UI.groupAbout}>
        <Row label={UI.aboutVersion}>
          <span className="tnum text-sm text-cloud/70">{APP_VERSION}</span>
        </Row>
        <p className="mt-3 text-[11px] leading-6 text-mist">{UI.aboutBody}</p>
        <p className="mt-1.5 text-[11px] text-mist/60">{UI.aboutStorage}</p>
      </Group>

      {/* 轻提示 */}
      {notice && (
        <div
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-md
                     border border-cloud/15 bg-ink-deep px-4 py-2 text-xs
                     text-cloud/85 animate-fade-in"
          role="status"
        >
          {notice}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-mist">{title}</h2>
      <div className="card">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  danger,
  children,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className={`text-sm ${danger ? 'text-cinnabar' : 'text-cloud/85'}`}>
          {label}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-mist/70">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  color,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  color: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-cloud/85">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-5 text-mist/70">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200"
        style={{
          borderColor: checked ? color : '#8A969140',
          backgroundColor: checked ? `${color}33` : 'transparent',
        }}
      >
        <span
          className="absolute top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-200"
          style={{
            left: checked ? '1.1rem' : '0.2rem',
            backgroundColor: checked ? color : '#8A9691',
          }}
        />
      </button>
    </div>
  );
}
