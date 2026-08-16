import { useCallback, useState } from "react";
import { JournalEntryEditor, JournalEntryViewer, type JournalEntryContent } from "journal-entry";
import { mockUploadImage, mockUploadVideo } from "./mockUpload";
import { sampleDocument } from "./sampleDocument";
import styles from "./App.module.css";

const STORAGE_KEY = "journal-entry-playground:doc";

function loadInitial(): JournalEntryContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return sampleDocument;
}

type Tab = "editor" | "viewer" | "json";

export default function App() {
  const [draft, setDraft] = useState<JournalEntryContent>(() => loadInitial());
  const [savedDoc, setSavedDoc] = useState<JournalEntryContent>(() => loadInitial());
  const [tab, setTab] = useState<Tab>("editor");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSavedDoc(draft);
    setSavedAt(new Date().toLocaleTimeString());
  }, [draft]);

  const handleReload = useCallback(() => {
    const doc = loadInitial();
    setDraft(doc);
    setSavedDoc(doc);
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(sampleDocument);
    setSavedDoc(sampleDocument);
    setSavedAt(null);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Journal Entry — Playground</h1>
          <p className={styles.sub}>
            One Tiptap document, mock uploads, no backend. Edit it, save it to <code>localStorage</code> as JSON, then
            check the read-only viewer renders the same thing.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={handleSave}>
            Save
          </button>
          <button onClick={handleReload}>Reload saved</button>
          <button onClick={handleReset}>Reset to sample</button>
        </div>
      </header>

      {savedAt && <div className={styles.savedNote}>Saved at {savedAt} — {JSON.stringify(savedDoc).length} bytes of JSON.</div>}

      <nav className={styles.tabs}>
        <button className={tab === "editor" ? styles.tabActive : styles.tab} onClick={() => setTab("editor")}>
          Editor
        </button>
        <button className={tab === "viewer" ? styles.tabActive : styles.tab} onClick={() => setTab("viewer")}>
          Read-only viewer
        </button>
        <button className={tab === "json" ? styles.tabActive : styles.tab} onClick={() => setTab("json")}>
          JSON
        </button>
      </nav>

      <main className={styles.panel}>
        {tab === "editor" && (
          <JournalEntryEditor
            content={draft}
            onChange={setDraft}
            onUploadImage={mockUploadImage}
            onUploadVideo={mockUploadVideo}
            autofocus={false}
          />
        )}

        {tab === "viewer" && (
          <div className={styles.viewerFrame}>
            <JournalEntryViewer content={savedDoc} />
          </div>
        )}

        {tab === "json" && <pre className={styles.json}>{JSON.stringify(draft, null, 2)}</pre>}
      </main>
    </div>
  );
}
