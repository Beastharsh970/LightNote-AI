import { useState, useRef } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  required?: boolean;
  hint?: string;
  onFileSelect: (file: File | null) => void;
  id: string;
}

export default function FileUpload({
  label,
  accept,
  required,
  hint,
  onFileSelect,
  id,
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || null);
    onFileSelect(file);

    // Create preview for images
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setPreview(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-300 mb-2"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && (
        <p className="text-xs text-gray-500 mb-2">{hint}</p>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-700 rounded-xl
                     hover:border-indigo-500 hover:bg-gray-800/50 transition-all duration-200
                     text-gray-400 text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {fileName || 'Choose file'}
        </button>

        {fileName && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="Preview"
            className="h-20 rounded-lg border border-gray-700 object-cover"
          />
        </div>
      )}
    </div>
  );
}
