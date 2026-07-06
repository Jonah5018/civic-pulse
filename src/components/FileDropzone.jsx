import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { UploadCloud, X, FileVideo, ImageIcon } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export default function FileDropzone({ files, onFilesChange }) {
  const { t } = useLanguage();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList).filter((f) => f.size <= MAX_SIZE);
      const withPreviews = incoming.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${file.lastModified}`,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        isVideo: file.type.startsWith("video/"),
      }));
      onFilesChange([...(files ?? []), ...withPreviews]);
    },
    [files, onFilesChange]
  );

  const removeFile = (id) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: dragging ? "var(--color-cyan)" : "var(--color-border-soft)",
          scale: dragging ? 1.01 : 1,
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed bg-surface/40 px-6 py-8 text-center transition-colors hover:border-border-strong"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
        <UploadCloud className={`mx-auto h-7 w-7 ${dragging ? "text-cyan" : "text-ink-faint"}`} />
        <p className="mt-3 text-sm text-ink-muted">{t.home.evidenceDrop}</p>
        <p className="mt-1 text-xs text-ink-faint">{t.home.evidenceHint}</p>
      </motion.div>

      {files?.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {files.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border-soft bg-surface"
            >
              {f.preview ? (
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-faint">
                  {f.isVideo ? <FileVideo className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
