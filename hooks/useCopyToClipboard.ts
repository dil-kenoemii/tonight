import { useState } from 'react';

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string) => Promise<boolean>;
  copied: boolean;
}

/**
 * Custom hook for copying text to clipboard
 * Returns a function to copy text and a boolean indicating if text was recently copied
 */
export default function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Check if clipboard API is available
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);

        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 2000);
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  return { copyToClipboard, copied };
}
