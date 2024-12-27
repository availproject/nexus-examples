import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="relative">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-gray-900 animate-spin"></div>
        <div className="mt-4 text-center text-lg font-medium text-gray-900">
          Loading NFTs...
        </div>
      </div>
    </div>
  );
}
