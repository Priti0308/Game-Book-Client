import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { FaSearch, FaArrowLeft, FaSpinner, FaExclamationCircle } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Constants ---
const API_BASE_URI = "https://game-book.onrender.com";
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_DELAY = 300; // milliseconds

// --- Custom Hook for Debouncing ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// --- UI Sub-components ---

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
    <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
    <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
  </tr>
);

const EmptyState = ({ icon, title, message, onRetry }) => (
    <div className="text-center py-10 px-4">
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-gray-100 rounded-full">
            {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-700">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
                Retry
            </button>
        )}
    </div>
);

const CustomerTable = ({ customers, onSelectCustomer, loading, pageStartIndex }) => {
  if (loading) {
    return (
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Contact</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (customers.length === 0) {
      return <EmptyState icon={<FaSearch className="text-gray-400 text-2xl"/>} title="No Customers Found" message="Try adjusting your search or filter criteria." />;
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow max-h-[50vh] overflow-y-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Contact</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((c, index) => (
            <tr
              key={c._id}
              className="cursor-pointer hover:bg-purple-50 transition-colors"
              onClick={() => onSelectCustomer(c)}
            >
              <td className="p-3 whitespace-nowrap text-sm text-gray-700">{pageStartIndex + index + 1}</td>
              <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
              <td className="p-3 whitespace-nowrap text-sm text-gray-700">{c.contact || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

const ReportDetailView = ({ customer, onBack }) => {
  const [dailyIncome, setDailyIncome] = useState(0);
  const [weeklyIncome, setWeeklyIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchReports = async () => {
      if (!customer) return;
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      try {
        const baseReportUrl = `${API_BASE_URI}/api/reports/${customer._id}`;
        const dailyReportUrl = `${baseReportUrl}/daily`;
        const weeklyReportUrl = `${baseReportUrl}/weekly`;

        const [dailyRes, weeklyRes] = await Promise.all([
          axios.get(dailyReportUrl, {
            params: { date: today },
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(weeklyReportUrl, {
            params: { date: today },
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setDailyIncome(dailyRes.data.totalIncome || 0);
        setWeeklyIncome(weeklyRes.data.totalIncome || 0);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        toast.error(err.response?.data?.message || "Failed to fetch report data.");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [customer, token]);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
      >
        <FaArrowLeft /> Back to Customers
      </button>
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Report for <span className="text-purple-600">{customer.name}</span>
      </h2>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <FaSpinner className="animate-spin text-purple-600 text-4xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Daily Income</h3>
                <p className="text-3xl font-bold text-purple-900">₹{dailyIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Weekly Income</h3>
                <p className="text-3xl font-bold text-green-900">₹{weeklyIncome.toLocaleString('en-IN')}</p>
            </div>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export default function ReportPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token not found.");
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    try {
      // This endpoint fetches all customers. Ensure it exists in your backend.
      // If your report customers are at /api/reports/customers, change it here.
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const customerArray = Array.isArray(res.data) ? res.data : res.data.customers;

      if (!Array.isArray(customerArray)) {
        console.error("API did not return an array of customers. Response:", res.data);
        throw new Error("Received invalid data from the server.");
      }
      
      const normalized = customerArray.map((c) => ({
        ...c,
        _id: typeof c._id === "object" && c._id.$oid ? c._id.$oid : c._id,
      }));
      setCustomers(normalized);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      const errorMessage = err.response?.data?.message || "Failed to load customers. Please check the connection and try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (c.contact && c.contact.toString().includes(debouncedSearch)) ||
        (c.srNo && c.srNo.toString() === debouncedSearch.trim())
    );
  }, [debouncedSearch, customers]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCustomers = filteredCustomers.slice(
    pageStartIndex,
    pageStartIndex + ITEMS_PER_PAGE
  );
  
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);


  if (error && customers.length === 0) {
      return (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-8">
              <EmptyState
                  icon={<FaExclamationCircle className="text-red-500 text-3xl"/>}
                  title="Failed to Load Data"
                  message={error}
                  onRetry={fetchCustomers}
              />
          </div>
      );
  }

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-6">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        
        {!selectedCustomer ? (
          <>
            <h1 className="text-3xl font-bold text-gray-800">Customer Reports</h1>
            <div className="relative">
              <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, contact, or Sr.No."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
              />
            </div>
            
            <CustomerTable 
              customers={currentCustomers}
              onSelectCustomer={setSelectedCustomer}
              loading={loading && customers.length === 0}
              pageStartIndex={pageStartIndex}
            />

            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <ReportDetailView 
            customer={selectedCustomer} 
            onBack={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </div>
  );
}