export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          Access Denied
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          You don't have permission to access this resource.
        </p>
        <a 
          href="/dashboard" 
          className="text-indigo-600 hover:text-indigo-500"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  )
}