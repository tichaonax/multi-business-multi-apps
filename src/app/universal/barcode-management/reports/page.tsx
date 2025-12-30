'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ReportsPage() {
  const { data: session } = useSession();
  const [activeReport, setActiveReport] = useState<'print-history' | 'template-usage' | 'inventory-linkage'>('print-history');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (businesses.length > 0) {
      fetchReport();
    }
  }, [activeReport, selectedBusinessId, dateRange, businesses]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/user/business-memberships');
      if (response.ok) {
        const memberships = await response.json();
        // Transform memberships to business format
        const businessList = memberships.map((m: any) => ({
          id: m.businessId,
          name: m.businessName,
          type: m.businessType,
        }));
        setBusinesses(businessList);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBusinessId !== 'all') params.append('businessId', selectedBusinessId);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await fetch(`/api/universal/barcode-management/reports/${activeReport}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (selectedBusinessId !== 'all') params.append('businessId', selectedBusinessId);
    if (dateRange.start) params.append('startDate', dateRange.start);
    if (dateRange.end) params.append('endDate', dateRange.end);

    window.location.href = `/api/universal/barcode-management/reports/${activeReport}?${params}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Barcode Reports
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View analytics and insights for barcode operations
          </p>
        </div>

        {/* Report Type Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveReport('print-history')}
                className={`${
                  activeReport === 'print-history'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Print History
              </button>
              <button
                onClick={() => setActiveReport('template-usage')}
                className={`${
                  activeReport === 'template-usage'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Template Usage
              </button>
              <button
                onClick={() => setActiveReport('inventory-linkage')}
                className={`${
                  activeReport === 'inventory-linkage'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Inventory Linkage
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="business-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business
              </label>
              <select
                id="business-filter"
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
              >
                <option value="all">All Businesses</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            {activeReport !== 'inventory-linkage' && (
              <>
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  />
                </div>

                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh Report
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading report...</p>
          </div>
        ) : !reportData ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        ) : (
          <>
            {/* Summary Section */}
            {reportData.summary && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]: [string, any]) => {
                  if (typeof value === 'object') return null;
                  return (
                    <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Print History Report */}
            {activeReport === 'print-history' && reportData.jobs && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Job ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reportData.jobs.map((job: any) => (
                      <tr key={job.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{job.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{job.business.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{job.template.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{job.status}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {job.printedQuantity} / {job.requestedQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Template Usage Report */}
            {activeReport === 'template-usage' && reportData.templates && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Template Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Print Jobs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Qty Printed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reportData.templates.map((item: any) => (
                      <tr key={item.template.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.template.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.template.business.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.usage.totalPrintJobs}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.usage.successRate}%</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {item.usage.totalQuantityPrinted.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inventory Linkage Report */}
            {activeReport === 'inventory-linkage' && reportData.linkages && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Inventory Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Barcode Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Print Jobs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reportData.linkages.map((linkage: any) => (
                      <tr key={linkage.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{linkage.template.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{linkage.inventoryItemId}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{linkage.barcodeData || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {linkage.isActive ? 'Active' : 'Inactive'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{linkage.printJobsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
