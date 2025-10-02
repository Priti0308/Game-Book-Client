import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaSearch, FaArrowLeft, FaSpinner, FaFileAlt } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";

const API_BASE_URI = "https://game-book.onrender.com";

export default function ReportPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [reportData, setReportData] = useState({ receipts: [], totalIncome: 0 });
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const token = localStorage.getItem("token");

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedCustomers = (res.data.customers || []).sort((a,b) => a.srNo - b.srNo);
      setCustomers(sortedCustomers);
      setFilteredCustomers(sortedCustomers);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      toast.error("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const filtered = customers.filter((c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      // MODIFIED: Search both 'contactNo' and 'contact' for robustness
      (c.contactNo && c.contactNo.toString().includes(search)) ||
      (c.contact && c.contact.toString().includes(search)) ||
      (c.srNo && c.srNo.toString().includes(search))
    );
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [search, customers]);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const generateReport = useCallback(async () => {
    if (!selectedCustomer) {
      toast.warn("Please select a customer first.");
      return;
    }
    setLoading(true);
    setReportGenerated(false);
    
    try {
        const res = await axios.get(`${API_BASE_URI}/api/receipts`, { 
            headers: { Authorization: `Bearer ${token}` },
            params: {
                customerId: selectedCustomer._id,
                startDate,
                endDate
            }
        });

        const customerReceipts = res.data.receipts || [];
        const totalIncome = customerReceipts.reduce((sum, r) => sum + (Number(r.totalIncome) || 0), 0);

        setReportData({
            receipts: customerReceipts.sort((a, b) => new Date(a.date) - new Date(b.date)),
            totalIncome,
        });
        setReportGenerated(true);

    } catch (err) {
      console.error("Failed to generate report:", err);
      toast.error("Failed to generate report. Could not load receipt data.");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, token, startDate, endDate]);
  
  const handleGoBack = () => {
    setSelectedCustomer(null);
    setReportGenerated(false);
    setReportData({ receipts: [], totalIncome: 0 });
  };
  
  const reportTotals = React.useMemo(() => {
    if (!reportData.receipts || reportData.receipts.length === 0) {
      return { payment: 0, finalTotal: 0 };
    }
    const payment = reportData.receipts.reduce((sum, r) => sum + (Number(r.payment) || 0), 0);
    const finalTotal = reportData.receipts.reduce((sum, r) => sum + (Number(r.finalTotal) || 0), 0);
    return { payment, finalTotal };
  }, [reportData.receipts]);


  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-8">
        {!selectedCustomer ? (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer Reports</h1>
            <div className="relative mb-4">
              <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Sr.No, Name, or Contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-full p-3 pl-12 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {loading ? <div className="flex justify-center items-center h-48"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div> :
            <div className="overflow-x-auto border rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase">Sr.No.</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase">Contact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((c, index) => (
                      <tr key={c._id} className="cursor-pointer hover:bg-purple-50" onClick={() => setSelectedCustomer(c)}>
                        <td className="p-4 text-sm text-gray-700 font-medium">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4 text-sm font-semibold text-gray-900">{c.name}</td>
                        {/* MODIFIED: Show 'contactNo' or 'contact' for robustness */}
                        <td className="p-4 text-sm text-gray-500">{c.contactNo || c.contact || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-500">No customers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>}
            {totalPages > 1 && (
               <div className="flex justify-between items-center mt-4">
                 <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Previous</button>
                 <span>Page {currentPage} of {totalPages}</span>
                 <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Next</button>
               </div>
             )}
          </div>
        ) : (
          // --- REPORT VIEW ---
          <div>
            <button onClick={handleGoBack} className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
              <FaArrowLeft /> Back to Customers
            </button>
            {/* MODIFICATION HERE: Added contact number below the name */}
            <div>
                <h2 className="text-2xl font-semibold text-gray-700">Report for: <span className="text-purple-700">{selectedCustomer.name}</span></h2>
                <p className="text-sm text-gray-500 mt-1">Contact: {selectedCustomer.contactNo || selectedCustomer.contact || "-"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 my-6 bg-gray-100 rounded-lg items-end">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <button onClick={generateReport} disabled={loading} className="w-full flex items-center justify-center gap-2 p-2 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700 disabled:bg-purple-300">
                    {loading ? <FaSpinner className="animate-spin" /> : <FaFileAlt />}
                    Generate Report
                </button>
            </div>
            
            {loading && <div className="flex justify-center items-center h-48"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div>}
            
            {!loading && reportGenerated && (
                <div>
                    <div className="p-6 bg-purple-100 rounded-xl shadow-md mb-6">
                        <h3 className="text-lg font-semibold text-purple-800 mb-2">Total Income from {dayjs(startDate).format('DD/MM/YY')} to {dayjs(endDate).format('DD/MM/YY')}</h3>
                        <p className="text-4xl font-bold text-purple-900">₹{reportData.totalIncome.toFixed(2)}</p>
                    </div>

                    <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-600">Receipts in Selected Range</h3>
                    <div className="overflow-x-auto border rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Total Income</th>
                                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Payment</th>
                                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Final Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.receipts.length > 0 ? (
                                    reportData.receipts.map(r => (
                                        <tr key={r._id}>
                                            <td className="p-3 text-sm">{dayjs(r.date).format('DD/MM/YYYY')}</td>
                                            <td className="p-3 text-sm font-medium text-green-700">₹{(Number(r.totalIncome) || 0).toFixed(2)}</td>
                                            <td className="p-3 text-sm">₹{(Number(r.payment) || 0).toFixed(2)}</td>
                                            <td className="p-3 text-sm font-bold">₹{(Number(r.finalTotal) || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="p-6 text-center text-gray-500">No receipts found for this date range.</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-200 font-bold">
                                <tr>
                                    <td className="p-3 text-right">Total</td>
                                    <td className="p-3 text-green-800">₹{reportData.totalIncome.toFixed(2)}</td>
                                    <td className="p-3">₹{reportTotals.payment.toFixed(2)}</td>
                                    <td className="p-3">₹{reportTotals.finalTotal.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
            {!loading && !reportGenerated && (
                <div className="text-center p-12 bg-gray-50 rounded-lg">
                    <FaFileAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                    <p className="text-gray-500">Select a date range and click 'Generate Report' to see the data.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}