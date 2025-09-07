interface ModalSkeletonProps {
  isOpen: boolean;
}

export default function ModalSkeleton({ isOpen }: ModalSkeletonProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0"
      style={{ 
        zIndex: 999999, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl"
        style={{ 
          width: '90%',
          maxWidth: '1024px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '0 auto'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <div className="h-6 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="py-4 px-1"
              >
                <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}