import { useCallback, useState } from "react";
import { ContentEditor, ContentViewer, ContentJsonViewer, type ContentDocument } from "@s195640/content-editor";
import { mockUploadImage, mockUploadVideo } from "./mockUpload";
import { sampleDocument } from "./sampleDocument";
import styles from "./App.module.css";

const STORAGE_KEY = "content-editor-playground:doc";

function loadInitial(): ContentDocument {
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
  const [draft, setDraft] = useState<ContentDocument>(() => loadInitial());
  const [savedDoc, setSavedDoc] = useState<ContentDocument>(() => loadInitial());
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
          <h1>Content Editor — Playground</h1>
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
          <ContentEditor
            content={draft}
            onChange={setDraft}
            onUploadImage={mockUploadImage}
            onUploadVideo={mockUploadVideo}
            autofocus={false}
          />
        )}

        {tab === "viewer" && (
          <div className={styles.deviceGrid}>
            <div className={styles.deviceColumn}>
              <div className={styles.deviceLabel}>Desktop</div>
              <div className={styles.viewerFrame}>
                <ContentViewer content={savedDoc} />
              </div>
            </div>
            <div className={styles.deviceColumn}>
              <div className={styles.deviceLabel}>Mobile · 375px</div>
              <div className={styles.mobileShell}>
                <div className={`${styles.viewerFrame} ${styles.mobileViewerFrame}`}>
                  <ContentViewer content={savedDoc} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "json" && <ContentJsonViewer content={draft} />}
      </main>
    </div>
  );
}
