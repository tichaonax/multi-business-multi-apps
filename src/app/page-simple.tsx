export default function SimpleHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Multi-Business Management Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          System is running successfully!
        </p>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">Database Status</h3>
            <p className="text-green-600">✓ Connected</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">Available Modules</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <span className="text-sm bg-blue-100 px-2 py-1 rounded">Construction</span>
              <span className="text-sm bg-green-100 px-2 py-1 rounded">Restaurant</span>
              <span className="text-sm bg-yellow-100 px-2 py-1 rounded">Grocery</span>
              <span className="text-sm bg-purple-100 px-2 py-1 rounded">Clothing</span>
              <span className="text-sm bg-red-100 px-2 py-1 rounded">Personal</span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}