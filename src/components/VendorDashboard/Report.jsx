import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define the base API URL
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
  const [itemsPerPage] = useState(10); // adjust per page

  const token = localStorage.getItem("token");
  // Get current page customers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE_URI}/api/reports/customers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

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

  // Search filter
  useEffect(() => {
    if (!search) {
      setFilteredCustomers(customers);
    } else {
      setFilteredCustomers(
        customers.filter((c) =>
          (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
          (c.contact && c.contact.includes(search)) ||
          (c.srNo && c.srNo.toString() === search.trim())
        )
      );
    }
    setCurrentPage(1); // reset to first page on search
  }, [search, customers]);

  const handleSelect = async (customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      const dailyRes = await axios.get(
        `${API_BASE_URI}/api/reports/customer/${customer._id}`,
        {
          params: { period: "daily", date: today },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const monthlyRes = await axios.get(
        `${API_BASE_URI}/api/reports/customer/${customer._id}`,
        {
          params: { period: "monthly", date: today },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDailyIncome(dailyRes.data.totalIncome || 0);
      setMonthlyIncome(monthlyRes.data.totalIncome || 0);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Customer Reports</h1>

      {loading && <div className="flex justify-center items-center h-48"><FaSpinner className="animate-spin text-purple-600 text-4xl" /></div>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {!selectedCustomer ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center mb-4">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Customers Table */}
          <div className="overflow-x-auto border rounded-lg shadow max-h-[400px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Sr.No.</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Contact</th>
                </tr>
              </thead>
              <tbody>
                {currentCustomers.length > 0 ? (
                  currentCustomers.map((c, idx) => (
                    <tr
                      key={c._id || idx}
                      className="cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => handleSelect(c)}
                    >
                      <td className="border p-2">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="border p-2">{c.name}</td>
                      <td className="border p-2">{c.contact || "-"}</td>
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
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            <FaArrowLeft /> Back to Customers
          </button>

          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Report for {selectedCustomer.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-purple-100 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">
                Daily Income
              </h3>
              <p className="text-2xl font-bold">₹{dailyIncome}</p>
            </div>

            <div className="p-6 bg-green-100 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Monthly Income
              </h3>
              <p className="text-2xl font-bold">₹{monthlyIncome}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
