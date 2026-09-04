interface VideoPlayerProps {
  src: string;
  title?: string;
}

export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      )}
      <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
        <video
          src={src}
          controls
          className="w-full max-h-[400px]"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <a
        href={src}
        download
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                   bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Video
      </a>
    </div>
  );
}
