interface ProgressBarProps {
  progress: number;
  currentStep: string;
  status: string;
}

export default function ProgressBar({ progress, currentStep, status }: ProgressBarProps) {
  const isError = status === 'failed';
  const isComplete = status === 'completed';

  const barColor = isError
    ? 'bg-red-500'
    : isComplete
    ? 'bg-emerald-500'
    : 'bg-indigo-500';

  const glowColor = isError
    ? 'shadow-red-500/30'
    : isComplete
    ? 'shadow-emerald-500/30'
    : 'shadow-indigo-500/30';

  return (
    <div className="space-y-3">
      {/* Status label */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {isError ? '❌ Failed' : isComplete ? '✅ Completed' : '⏳ Processing...'}
        </span>
        <span className="text-gray-300 font-mono font-semibold">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor} shadow-lg ${glowColor}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Current step */}
      <p className="text-xs text-gray-500 truncate">{currentStep}</p>
    </div>
  );
}
