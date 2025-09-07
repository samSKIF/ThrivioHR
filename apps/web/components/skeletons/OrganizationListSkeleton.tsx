export default function OrganizationListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          {/* Organization Header */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-36 animate-pulse"></div>
            </div>
          </div>

          {/* Organization Details - Single Row */}
          <div className="grid grid-cols-6 gap-4 text-sm">
            {[...Array(6)].map((_, colIndex) => (
              <div key={colIndex}>
                <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}