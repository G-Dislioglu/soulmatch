import { TOKENS } from '../../../design/tokens';
import { BuilderPanel } from './BuilderPanel';

interface BuilderFileExplorerPanelProps {
  groupedFiles: Array<[string, string[]]>;
  selectedFilePath: string | null;
  selectedFileContent: string;
  toLines: (text: string) => string[];
  onSelectFile: (file: string) => void;
}

export function BuilderFileExplorerPanel(props: BuilderFileExplorerPanelProps) {
  const {
    groupedFiles,
    selectedFilePath,
    selectedFileContent,
    toLines,
    onSelectFile,
  } = props;

  return (
    <div data-maya-target="file-explorer">
      <BuilderPanel title="File Explorer" subtitle="Repo-Dateien bis Tiefe 3, direkt aus dem Builder-Endpoint." accent={TOKENS.purple}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
            {groupedFiles.map(([group, entries]) => (
              <div key={group}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.text3, marginBottom: 8 }}>{group}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {entries.slice(0, 14).map((file) => (
                    <button
                      key={file}
                      onClick={() => onSelectFile(file)}
                      style={{
                        textAlign: 'left',
                        borderRadius: 12,
                        border: `1px solid ${selectedFilePath === file ? TOKENS.gold : TOKENS.b3}`,
                        background: selectedFilePath === file ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                        color: TOKENS.text2,
                        padding: '8px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
            <div style={{ fontSize: 12, color: TOKENS.text3, marginBottom: 8 }}>{selectedFilePath ?? 'Keine Datei gewaehlt'}</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              {selectedFileContent ? toLines(selectedFileContent).join('\n') : 'Dateiinhalt erscheint hier als kurzer Preview-Ausschnitt.'}
            </pre>
          </div>
        </div>
      </BuilderPanel>
    </div>
  );
}
