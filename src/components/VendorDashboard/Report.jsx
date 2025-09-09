import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs"; // Import dayjs

const API_BASE_URI = "https://game-book.onrender.com";

export default function ReportPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
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

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URI}/api/reports/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const normalized = res.data.map((c) => ({
          ...c,
          _id: typeof c._id === "object" && c._id.$oid ? c._id.$oid : c._id,
        }));
        setCustomers(normalized);
        setFilteredCustomers(normalized);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setError("Failed to load customers");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [token]);

  useEffect(() => {
    const filtered = customers.filter((c) =>
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.contact && c.contact.includes(search)) ||
      (c.srNo && c.srNo.toString() === search.trim())
    );
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [search, customers]);

  // --- FIX: Optimized API calls using Promise.all ---
  const handleSelect = async (customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    setError(""); // Clear previous errors
    
    // Use dayjs to get today's date in YYYY-MM-DD format
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Use Promise.all to fetch both reports concurrently for better performance
      const [dailyRes, monthlyRes] = await Promise.all([
        axios.get(`${API_BASE_URI}/api/reports/customer/${customer._id}`, {
          params: { period: "daily", date: today },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URI}/api/reports/customer/${customer._id}`, {
          params: { period: "monthly", date: today },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDailyIncome(dailyRes.data.totalIncome || 0);
      setMonthlyIncome(monthlyRes.data.totalIncome || 0);

    } catch (err) {
      console.error("Failed to fetch reports:", err);
      if (err.response) {
        setError(`Failed to fetch report: ${err.response.data.message || 'Server Error'}`);
      } else {
        setError("Failed to fetch report. Please check your connection.");
      }
      setDailyIncome(0);
      setMonthlyIncome(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Customer Reports</h1>

      {loading && <div className="flex justify-center items-center h-48"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div>}
      
      {!loading && error && <p className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</p>}

      {!selectedCustomer ? (
        <div className="space-y-4">
          <div className="relative">
            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, contact, or Sr.No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 pl-10 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="overflow-x-auto border rounded-lg shadow max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Sr.No.</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCustomers.length > 0 ? (
                  currentCustomers.map((c, idx) => (
                    <tr
                      key={c._id || idx}
                      className="cursor-pointer hover:bg-purple-50 transition-colors duration-200"
                      onClick={() => handleSelect(c)}
                    >
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">{c.contact || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
             <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <FaArrowLeft /> Back to Customers
          </button>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Report for {selectedCustomer.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-purple-100 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">
                Today's Income
              </h3>
              <p className="text-3xl font-bold text-purple-900">₹{dailyIncome.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-green-100 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                This Month's Income
              </h3>
              <p className="text-3xl font-bold text-green-900">₹{monthlyIncome.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
