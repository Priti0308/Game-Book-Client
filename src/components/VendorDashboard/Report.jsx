import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaSearch, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const API_BASE_URI = "https://game-book.onrender.com";

export default function ReportPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyReceipts, setMonthlyReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const token = localStorage.getItem("token");

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort customers by their database srNo initially
      const sortedCustomers = (res.data.customers || []).sort((a,b) => a.srNo - b.srNo);
      setCustomers(sortedCustomers);
      setFilteredCustomers(sortedCustomers);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      toast.error("Failed to load customer data.");
      setError("Failed to load customers");
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
      (c.contact && c.contact.toString().includes(search.toLowerCase())) ||
      (c.srNo && c.srNo.toString().includes(search.toLowerCase()))
    );
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [search, customers]);

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    setError("");
    setDailyIncome(0);
    setMonthlyIncome(0);
    setMonthlyReceipts([]);

    try {
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allReceipts = res.data.receipts || [];

      const customerReceipts = allReceipts.filter(r => r.customerId === customer._id);

      const today = dayjs();
      
      const dailyReceipts = customerReceipts.filter(r => dayjs(r.date).isSame(today, 'day'));
      const dailyTotal = dailyReceipts.reduce((sum, r) => sum + (Number(r.morningIncome) || 0) + (Number(r.eveningIncome) || 0), 0);
      setDailyIncome(dailyTotal);
      
      const startOfMonth = today.startOf('month');
      const endOfMonth = today.endOf('month');
      const monthlyReceiptsData = customerReceipts.filter(r => {
        const receiptDate = dayjs(r.date);
        return receiptDate.isSameOrAfter(startOfMonth, 'day') && receiptDate.isSameOrBefore(endOfMonth, 'day');
      });
      const monthlyTotal = monthlyReceiptsData.reduce((sum, r) => sum + (Number(r.morningIncome) || 0) + (Number(r.eveningIncome) || 0), 0);
      
      setMonthlyIncome(monthlyTotal);
      setMonthlyReceipts(monthlyReceiptsData);

    } catch (err) {
      console.error("Failed to fetch and process receipts:", err);
      const errorMsg = "Failed to generate report. Could not load receipt data.";
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoBack = () => {
    setSelectedCustomer(null);
    setError("");
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Customer Reports</h1>

        {loading && <div className="flex justify-center items-center h-48"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div>}
        
        {!loading && error && !selectedCustomer && <p className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</p>}

        {!selectedCustomer ? (
          <div className="space-y-4">
            <div className="relative">
              <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Sr.No, Name, or Contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-full p-3 pl-12 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm max-h-[50vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Sr.No.</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCustomers.length > 0 ? (
                    currentCustomers.map((c, index) => (
                      <tr key={c._id} className="cursor-pointer hover:bg-purple-50 transition" onClick={() => handleSelectCustomer(c)}>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-500">{indexOfFirstItem + index + 1}</td>
                        <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-500">{c.contact || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-500">No customers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
               <div className="flex justify-between items-center mt-4">
                 <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Previous</button>
                 <span>Page {currentPage} of {totalPages}</span>
                 <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">Next</button>
               </div>
             )}
          </div>
        ) : (
          <div>
            <button onClick={handleGoBack} className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
              <FaArrowLeft /> Back to Customers
            </button>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Report for {selectedCustomer.name}</h2>
            
            {error && <p className="text-red-500 text-center p-4 mb-4 bg-red-50 rounded-lg">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-purple-100 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Today's Income</h3>
                <p className="text-3xl font-bold text-purple-900">₹{dailyIncome.toFixed(2)}</p>
              </div>
              <div className="p-6 bg-green-100 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-green-800 mb-2">This Month's Income</h3>
                <p className="text-3xl font-bold text-green-900">₹{monthlyIncome.toFixed(2)}</p>
              </div>
            </div>

             <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-600">
                This Month's Receipts
             </h3>
             <div className="overflow-x-auto border rounded-lg shadow-sm max-h-[40vh] overflow-y-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-100 sticky top-0 z-10">
                         <tr>
                            <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Morning</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Evening</th>
                            <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Total Income</th>
                         </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                         {monthlyReceipts.length > 0 ? (
                            monthlyReceipts.map(r => (
                                <tr key={r._id}>
                                    <td className="p-3 text-sm">{dayjs(r.date).format('DD/MM/YYYY')}</td>
                                    <td className="p-3 text-sm">₹{Number(r.morningIncome).toFixed(2)}</td>
                                    <td className="p-3 text-sm">₹{Number(r.eveningIncome).toFixed(2)}</td>
                                    <td className="p-3 text-sm font-bold">₹{(Number(r.morningIncome) + Number(r.eveningIncome)).toFixed(2)}</td>
                                </tr>
                            ))
                         ) : (
                            <tr><td colSpan="4" className="p-6 text-center text-gray-500">No receipts found for this month.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

