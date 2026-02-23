'use client';

interface VetoConfirmationModalProps {
  isOpen: boolean;
  optionText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VetoConfirmationModal({
  isOpen,
  optionText,
  onConfirm,
  onCancel,
}: VetoConfirmationModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Warning Icon */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Veto This Option?
          </h2>
        </div>

        {/* Option to be vetoed */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-red-300">
          <p className="text-gray-800 font-medium text-center">
            &ldquo;{optionText}&rdquo;
          </p>
        </div>

        {/* Warning message */}
        <p className="text-center text-gray-700 mb-6">
          You only get <strong>one veto</strong> per room!
          <br />
          Choose wisely.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Veto It
          </button>
        </div>
      </div>
    </div>
  );
}
